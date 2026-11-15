import platform
import sqlite3
from contextlib import asynccontextmanager
from datetime import UTC, date, datetime
from pathlib import Path

from fastapi import FastAPI, HTTPException, Query, Response, status
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from prometheus_client import CONTENT_TYPE_LATEST, generate_latest

from .config import get_settings
from .database import database, init_database
from .metrics import READY, MetricsMiddleware
from .schemas import Activity, Task, TaskCreate, TaskUpdate

STATIC_DIR = Path(__file__).parent / "static"


def utc_now() -> str:
    return datetime.now(UTC).isoformat()


@asynccontextmanager
async def lifespan(_: FastAPI):
    init_database()
    READY.set(0 if get_settings().force_not_ready else 1)
    yield
    READY.set(0)


app = FastAPI(
    title="WorkBoard API",
    version=get_settings().version,
    description="A real task and project application monitored by CloudForge.",
    lifespan=lifespan,
)
app.add_middleware(MetricsMiddleware)
app.mount("/assets", StaticFiles(directory=STATIC_DIR), name="assets")


def row_dict(row: sqlite3.Row) -> dict:
    return dict(row)


def record_activity(
    connection: sqlite3.Connection, task_id: int | None, action: str, detail: str
) -> None:
    connection.execute(
        "INSERT INTO activity (task_id, action, detail, created_at) VALUES (?, ?, ?, ?)",
        (task_id, action, detail, utc_now()),
    )


@app.get("/", include_in_schema=False)
def product_page() -> FileResponse:
    return FileResponse(STATIC_DIR / "index.html")


@app.get("/health/live", tags=["health"])
def liveness() -> dict:
    return {"status": "alive", "service": "workboard"}


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
def metrics() -> Response:
    return Response(generate_latest(), media_type=CONTENT_TYPE_LATEST)


@app.get("/api/info", tags=["application"])
def application_info() -> dict:
    settings = get_settings()
    return {
        "name": "WorkBoard",
        "description": "Delivery work management service",
        "version": settings.version,
        "commit_sha": settings.commit_sha,
        "environment": settings.environment,
        "runtime": f"Python {platform.python_version()}",
        "hostname": platform.node(),
        "timestamp": utc_now(),
    }


@app.get("/api/tasks", response_model=list[Task], tags=["tasks"])
def list_tasks(
    project: str | None = Query(default=None, max_length=80),
    task_status: str | None = Query(default=None, alias="status"),
) -> list[dict]:
    clauses: list[str] = []
    values: list[str] = []
    if project:
        clauses.append("project = ?")
        values.append(project)
    if task_status:
        clauses.append("status = ?")
        values.append(task_status)
    where = f"WHERE {' AND '.join(clauses)}" if clauses else ""
    with database() as connection:
        rows = connection.execute(
            f"SELECT * FROM tasks {where} ORDER BY updated_at DESC", values  # noqa: S608
        ).fetchall()
    return [row_dict(row) for row in rows]


@app.post("/api/tasks", response_model=Task, status_code=201, tags=["tasks"])
def create_task(payload: TaskCreate) -> dict:
    now = utc_now()
    with database() as connection:
        cursor = connection.execute(
            """INSERT INTO tasks
            (title, description, project, priority, status, due_date, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                payload.title.strip(),
                payload.description.strip(),
                payload.project.strip(),
                payload.priority.value,
                payload.status.value,
                payload.due_date.isoformat() if payload.due_date else None,
                now,
                now,
            ),
        )
        task_id = int(cursor.lastrowid or 0)
        record_activity(connection, task_id, "created", f"Created “{payload.title.strip()}”")
        row = connection.execute("SELECT * FROM tasks WHERE id = ?", (task_id,)).fetchone()
    return row_dict(row)


@app.patch("/api/tasks/{task_id}", response_model=Task, tags=["tasks"])
def update_task(task_id: int, payload: TaskUpdate) -> dict:
    updates = payload.model_dump(exclude_unset=True)
    if not updates:
        raise HTTPException(status_code=422, detail="Provide at least one field to update")
    with database() as connection:
        existing = connection.execute("SELECT * FROM tasks WHERE id = ?", (task_id,)).fetchone()
        if not existing:
            raise HTTPException(status_code=404, detail="Task not found")
        normalized = {}
        for key, value in updates.items():
            if hasattr(value, "value"):
                normalized[key] = value.value
            elif isinstance(value, date):
                normalized[key] = value.isoformat()
            else:
                normalized[key] = value
        for key in ("title", "description", "project"):
            if key in normalized and normalized[key] is not None:
                normalized[key] = normalized[key].strip()
        normalized["updated_at"] = utc_now()
        set_clause = ", ".join(f"{key} = ?" for key in normalized)
        connection.execute(
            f"UPDATE tasks SET {set_clause} WHERE id = ?",  # noqa: S608
            [*normalized.values(), task_id],
        )
        if "status" in normalized and normalized["status"] != existing["status"]:
            action = "completed" if normalized["status"] == "done" else "moved"
            detail = f"Moved “{existing['title']}” to {normalized['status'].replace('_', ' ')}"
        else:
            action = "updated"
            detail = f"Updated “{normalized.get('title', existing['title'])}”"
        record_activity(connection, task_id, action, detail)
        row = connection.execute("SELECT * FROM tasks WHERE id = ?", (task_id,)).fetchone()
    return row_dict(row)


@app.delete("/api/tasks/{task_id}", status_code=204, tags=["tasks"])
def delete_task(task_id: int) -> Response:
    with database() as connection:
        existing = connection.execute("SELECT * FROM tasks WHERE id = ?", (task_id,)).fetchone()
        if not existing:
            raise HTTPException(status_code=404, detail="Task not found")
        connection.execute("DELETE FROM tasks WHERE id = ?", (task_id,))
        record_activity(connection, task_id, "deleted", f"Deleted “{existing['title']}”")
    return Response(status_code=204)


@app.get("/api/stats", tags=["application"])
def statistics() -> dict:
    today = date.today().isoformat()
    with database() as connection:
        total = connection.execute("SELECT COUNT(*) FROM tasks").fetchone()[0]
        todo = connection.execute("SELECT COUNT(*) FROM tasks WHERE status = 'todo'").fetchone()[0]
        in_progress = connection.execute(
            "SELECT COUNT(*) FROM tasks WHERE status = 'in_progress'"
        ).fetchone()[0]
        done = connection.execute("SELECT COUNT(*) FROM tasks WHERE status = 'done'").fetchone()[0]
        overdue = connection.execute(
            "SELECT COUNT(*) FROM tasks WHERE due_date < ? AND status != 'done'", (today,)
        ).fetchone()[0]
        projects = connection.execute("SELECT COUNT(DISTINCT project) FROM tasks").fetchone()[0]
    return {
        "total": total,
        "todo": todo,
        "in_progress": in_progress,
        "done": done,
        "overdue": overdue,
        "projects": projects,
        "completion_rate": round((done / total * 100) if total else 0),
    }


@app.get("/api/activity", response_model=list[Activity], tags=["application"])
def activity(limit: int = Query(default=12, ge=1, le=50)) -> list[dict]:
    with database() as connection:
        rows = connection.execute(
            "SELECT * FROM activity ORDER BY created_at DESC LIMIT ?", (limit,)
        ).fetchall()
    return [row_dict(row) for row in rows]

