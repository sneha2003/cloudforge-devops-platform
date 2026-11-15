from datetime import UTC, datetime
from enum import StrEnum

from pydantic import BaseModel, Field, HttpUrl


class DeploymentStatus(StrEnum):
    pending = "pending"
    deploying = "deploying"
    succeeded = "succeeded"
    failed = "failed"
    rolled_back = "rolled_back"


class DeploymentCreate(BaseModel):
    version: str = Field(min_length=1, max_length=128)
    image: str = Field(min_length=1, max_length=500)
    commit_sha: str = Field(min_length=7, max_length=64)
    environment: str = Field(default="local", pattern=r"^[a-z0-9-]+$")
    source_url: HttpUrl | None = None
    status: DeploymentStatus = DeploymentStatus.deploying


class DeploymentUpdate(BaseModel):
    status: DeploymentStatus
    verification: str | None = Field(default=None, max_length=2000)
    rollback_version: str | None = Field(default=None, max_length=128)


class Deployment(DeploymentCreate):
    id: int
    verification: str | None = None
    rollback_version: str | None = None
    created_at: datetime
    updated_at: datetime


class IncidentCreate(BaseModel):
    service: str = Field(min_length=1, max_length=100)
    severity: str = Field(pattern="^(info|warning|critical)$")
    summary: str = Field(min_length=1, max_length=500)
    deployment_id: int | None = None
    recovery: str | None = Field(default=None, max_length=2000)


class Incident(IncidentCreate):
    id: int
    created_at: datetime
    resolved_at: datetime | None = None


class TaskCreate(BaseModel):
    title: str = Field(min_length=1, max_length=160)


class Task(TaskCreate):
    id: int
    completed: bool
    created_at: datetime


class MetricPoint(BaseModel):
    timestamp: float
    value: float


class MetricSeries(BaseModel):
    key: str
    label: str
    unit: str
    available: bool
    reason: str | None = None
    points: list[MetricPoint] = []


def utc_now() -> datetime:
    return datetime.now(UTC)

