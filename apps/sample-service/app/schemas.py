from datetime import date, datetime
from enum import StrEnum

from pydantic import BaseModel, Field


class Priority(StrEnum):
    low = "low"
    medium = "medium"
    high = "high"


class TaskStatus(StrEnum):
    todo = "todo"
    in_progress = "in_progress"
    done = "done"


class TaskCreate(BaseModel):
    title: str = Field(min_length=1, max_length=160)
    description: str = Field(default="", max_length=2000)
    project: str = Field(default="General", min_length=1, max_length=80)
    priority: Priority = Priority.medium
    status: TaskStatus = TaskStatus.todo
    due_date: date | None = None


class TaskUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=160)
    description: str | None = Field(default=None, max_length=2000)
    project: str | None = Field(default=None, min_length=1, max_length=80)
    priority: Priority | None = None
    status: TaskStatus | None = None
    due_date: date | None = None


class Task(TaskCreate):
    id: int
    created_at: datetime
    updated_at: datetime


class Activity(BaseModel):
    id: int
    task_id: int | None
    action: str
    detail: str
    created_at: datetime

