import asyncio
import platform
import sqlite3
from contextlib import asynccontextmanager
from datetime import UTC, datetime, timedelta

import httpx
from fastapi import Depends, FastAPI, HTTPException, Query, Response, status
from fastapi.middleware.cors import CORSMiddleware
from prometheus_client import CONTENT_TYPE_LATEST, generate_latest

from .config import get_settings
from .database import database, init_database
from .metrics import READY, MetricsMiddleware
from .schemas import (
    Deployment,
    DeploymentCreate,
    DeploymentUpdate,
    Incident,
    IncidentCreate,
    MetricPoint,
    MetricSeries,
    Task,
    TaskCreate,
    utc_now,
)
from .security import require_operator


@asynccontextmanager
async def lifespan(_: FastAPI):
    init_database()
    READY.set(1)
    yield
    READY.set(0)


app = FastAPI(
    title="CloudForge Operations API",
    version=get_settings().version,
    description="Operational metadata, service health, and safe monitoring access for CloudForge.",
    lifespan=lifespan,
)
app.add_middleware(MetricsMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=get_settings().allowed_origins,
    allow_credentials=False,
    allow_methods=["GET", "POST", "PATCH"],
    allow_headers=["Content-Type", "X-Operator-Token"],
)


def serialize(row: sqlite3.Row) -> dict:
    return dict(row)


@app.get("/health/live", tags=["health"])
def liveness() -> dict:
    return {"status": "alive"}


@app.get("/health/ready", tags=["health"])
def readiness(response: Response) -> dict:
    if get_settings().force_not_ready:
        READY.set(0)
        response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE
        return {
            "status": "not_ready",
            "checks": {"release_gate": "candidate rejected by readiness policy"},
        }
    try:
        with database() as connection:
            connection.execute("SELECT 1").fetchone()
        READY.set(1)
        return {"status": "ready", "checks": {"database": "ok"}}
    except sqlite3.Error as exc:
        READY.set(0)
        response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE
        return {"status": "not_ready", "checks": {"database": str(exc)}}


@app.get("/metrics", include_in_schema=False)
def prometheus_metrics() -> Response:
    return Response(content=generate_latest(), media_type=CONTENT_TYPE_LATEST)


@app.get("/api/v1/info", tags=["operations"])
def application_info() -> dict:
    settings = get_settings()
    return {
        "name": "CloudForge",
        "version": settings.version,
        "commit_sha": settings.commit_sha,
        "environment": settings.environment,
        "runtime": f"Python {platform.python_version()}",
        "hostname": platform.node(),
        "timestamp": utc_now(),
    }


@app.get("/api/v1/status", tags=["operations"])
def operational_status() -> dict:
    with database() as connection:
        latest = connection.execute(
            "SELECT * FROM deployments WHERE status = 'succeeded' ORDER BY updated_at DESC LIMIT 1"
        ).fetchone()
        deployments = connection.execute(
            "SELECT * FROM deployments ORDER BY created_at DESC LIMIT 5"
        ).fetchall()
        incidents = connection.execute(
            "SELECT * FROM incidents ORDER BY created_at DESC LIMIT 5"
        ).fetchall()
    settings = get_settings()
    tracked_service = {
        "name": "WorkBoard",
        "status": "unavailable",
        "version": "unavailable",
        "commit_sha": "unknown",
        "environment": settings.environment,
        "url": settings.sample_service_url,
        "detail": "The WorkBoard service could not be reached.",
    }
    try:
        with httpx.Client(timeout=2) as client:
            ready_response = client.get(f"{settings.sample_service_url}/health/ready")
            info_response = client.get(f"{settings.sample_service_url}/api/info")
            ready_response.raise_for_status()
            info_response.raise_for_status()
            service_info = info_response.json()
            tracked_service.update(
                {
                    "status": "healthy",
                    "version": service_info["version"],
                    "commit_sha": service_info["commit_sha"],
                    "environment": service_info["environment"],
                    "detail": "Readiness and database checks passed.",
                }
            )
    except (httpx.HTTPError, KeyError, ValueError) as exc:
        tracked_service["detail"] = f"Health check failed: {type(exc).__name__}"
    return {
        "service": tracked_service["status"],
        "environment": settings.environment,
        "version": tracked_service["version"],
        "tracked_service": tracked_service,
        "last_successful_deployment": serialize(latest) if latest else None,
        "recent_deployments": [serialize(row) for row in deployments],
        "active_incidents": [serialize(row) for row in incidents if row["resolved_at"] is None],
        "data_classification": "live",
    }


@app.get("/api/v1/deployments", response_model=list[Deployment], tags=["deployments"])
def list_deployments(limit: int = Query(25, ge=1, le=100)) -> list[dict]:
    with database() as connection:
        rows = connection.execute(
            "SELECT * FROM deployments ORDER BY created_at DESC LIMIT ?", (limit,)
        ).fetchall()
    return [serialize(row) for row in rows]


@app.get("/api/v1/deployments/{deployment_id}", response_model=Deployment, tags=["deployments"])
def get_deployment(deployment_id: int) -> dict:
    with database() as connection:
        row = connection.execute(
            "SELECT * FROM deployments WHERE id = ?", (deployment_id,)
        ).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Deployment not found")
    return serialize(row)


@app.post(
    "/api/v1/deployments",
    response_model=Deployment,
    status_code=201,
    tags=["operator"],
    dependencies=[Depends(require_operator)],
)
def create_deployment(payload: DeploymentCreate) -> dict:
    now = utc_now().isoformat()
    with database() as connection:
        cursor = connection.execute(
            """INSERT INTO deployments
            (version, image, commit_sha, environment, source_url, status, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                payload.version,
                payload.image,
                payload.commit_sha,
                payload.environment,
                str(payload.source_url) if payload.source_url else None,
                payload.status.value,
                now,
                now,
            ),
        )
        row = connection.execute(
            "SELECT * FROM deployments WHERE id = ?", (cursor.lastrowid,)
        ).fetchone()
    return serialize(row)


@app.patch(
    "/api/v1/deployments/{deployment_id}",
    response_model=Deployment,
    tags=["operator"],
    dependencies=[Depends(require_operator)],
)
def update_deployment(deployment_id: int, payload: DeploymentUpdate) -> dict:
    with database() as connection:
        cursor = connection.execute(
            """UPDATE deployments
            SET status = ?, verification = ?, rollback_version = ?, updated_at = ?
            WHERE id = ?""",
            (
                payload.status.value,
                payload.verification,
                payload.rollback_version,
                utc_now().isoformat(),
                deployment_id,
            ),
        )
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Deployment not found")
        row = connection.execute(
            "SELECT * FROM deployments WHERE id = ?", (deployment_id,)
        ).fetchone()
    return serialize(row)


@app.get("/api/v1/incidents", response_model=list[Incident], tags=["incidents"])
def list_incidents(limit: int = Query(25, ge=1, le=100)) -> list[dict]:
    with database() as connection:
        rows = connection.execute(
            "SELECT * FROM incidents ORDER BY created_at DESC LIMIT ?", (limit,)
        ).fetchall()
    return [serialize(row) for row in rows]


@app.post(
    "/api/v1/incidents",
    response_model=Incident,
    status_code=201,
    tags=["operator"],
    dependencies=[Depends(require_operator)],
)
def create_incident(payload: IncidentCreate) -> dict:
    with database() as connection:
        cursor = connection.execute(
            """INSERT INTO incidents
            (service, severity, summary, deployment_id, recovery, created_at, resolved_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)""",
            (
                payload.service,
                payload.severity,
                payload.summary,
                payload.deployment_id,
                payload.recovery,
                utc_now().isoformat(),
                utc_now().isoformat() if payload.recovery else None,
            ),
        )
        row = connection.execute(
            "SELECT * FROM incidents WHERE id = ?", (cursor.lastrowid,)
        ).fetchone()
    return serialize(row)


@app.patch(
    "/api/v1/incidents/{incident_id}/resolve",
    response_model=Incident,
    tags=["operator"],
    dependencies=[Depends(require_operator)],
)
def resolve_incident(incident_id: int) -> dict:
    with database() as connection:
        cursor = connection.execute(
            "UPDATE incidents SET resolved_at = ? WHERE id = ?",
            (utc_now().isoformat(), incident_id),
        )
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Incident not found")
        row = connection.execute(
            "SELECT * FROM incidents WHERE id = ?", (incident_id,)
        ).fetchone()
    return serialize(row)


@app.get("/api/v1/tasks", response_model=list[Task], tags=["sample-service"])
def list_tasks() -> list[dict]:
    with database() as connection:
        rows = connection.execute("SELECT * FROM tasks ORDER BY created_at DESC").fetchall()
    return [{**serialize(row), "completed": bool(row["completed"])} for row in rows]


@app.post("/api/v1/tasks", response_model=Task, status_code=201, tags=["sample-service"])
def create_task(payload: TaskCreate) -> dict:
    with database() as connection:
        cursor = connection.execute(
            "INSERT INTO tasks (title, created_at) VALUES (?, ?)",
            (payload.title, utc_now().isoformat()),
        )
        row = connection.execute("SELECT * FROM tasks WHERE id = ?", (cursor.lastrowid,)).fetchone()
    return {**serialize(row), "completed": bool(row["completed"])}


METRIC_QUERIES = {
    "request_rate": ("Request rate", "req/s", "sum(rate(workboard_http_requests_total[2m]))"),
    "error_rate": (
        "Error rate",
        "%",
        "100 * sum(rate(workboard_http_requests_total{status=~'5..'}[2m])) "
        "/ clamp_min(sum(rate(workboard_http_requests_total[2m])), 0.001)",
    ),
    "latency_p95": (
        "P95 response latency",
        "ms",
        "1000 * histogram_quantile(0.95, "
        "sum(rate(workboard_http_request_duration_seconds_bucket[2m])) by (le))",
    ),
    "availability": ("WorkBoard readiness", "%", "100 * workboard_ready"),
    "cpu": (
        "Host CPU utilization",
        "%",
        "100 - (avg(rate(node_cpu_seconds_total{mode='idle'}[2m])) * 100)",
    ),
    "memory": (
        "Host memory utilization",
        "%",
        "100 * (1 - node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes)",
    ),
}


@app.get("/api/v1/monitoring", response_model=list[MetricSeries], tags=["monitoring"])
async def monitoring(range_minutes: int = Query(30, ge=5, le=360)) -> list[MetricSeries]:
    settings = get_settings()
    end = datetime.now(UTC)
    start = end - timedelta(minutes=range_minutes)
    async with httpx.AsyncClient(timeout=3) as client:
        async def fetch_metric(
            key: str, label: str, unit: str, query: str
        ) -> MetricSeries:
            try:
                response = await client.get(
                    f"{settings.prometheus_url}/api/v1/query_range",
                    params={
                        "query": query,
                        "start": start.timestamp(),
                        "end": end.timestamp(),
                        "step": 15,
                    },
                )
                response.raise_for_status()
                results = response.json()["data"]["result"]
                points = (
                    [
                        MetricPoint(timestamp=float(ts), value=float(value))
                        for ts, value in results[0]["values"]
                    ]
                    if results
                    else []
                )
                return MetricSeries(
                    key=key,
                    label=label,
                    unit=unit,
                    available=bool(points),
                    reason=None if points else "Prometheus has not collected this metric yet.",
                    points=points,
                )
            except (httpx.HTTPError, KeyError, ValueError) as exc:
                return MetricSeries(
                    key=key,
                    label=label,
                    unit=unit,
                    available=False,
                    reason=f"Metrics unavailable: {type(exc).__name__}",
                )

        return await asyncio.gather(
            *(
                fetch_metric(key, label, unit, query)
                for key, (label, unit, query) in METRIC_QUERIES.items()
            )
        )

