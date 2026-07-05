import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.models.task import TaskPriority, TaskStatus

_COLOR_PATTERN = r"^#[0-9a-fA-F]{6}$"


class TaskCreate(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    description: str = Field(default="", max_length=5000)
    priority: TaskPriority = TaskPriority.NORMAL
    category: str | None = Field(default=None, max_length=50)
    tags: list[str] = Field(default_factory=list, max_length=20)
    color: str | None = Field(default=None, pattern=_COLOR_PATTERN)
    due_date: datetime | None = None


class TaskUpdate(BaseModel):
    """Mise à jour partielle : seuls les champs fournis sont modifiés."""

    title: str | None = Field(default=None, min_length=1, max_length=200)
    description: str | None = Field(default=None, max_length=5000)
    priority: TaskPriority | None = None
    status: TaskStatus | None = None
    category: str | None = Field(default=None, max_length=50)
    tags: list[str] | None = Field(default=None, max_length=20)
    color: str | None = Field(default=None, pattern=_COLOR_PATTERN)
    due_date: datetime | None = None


class TaskOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    title: str
    description: str
    priority: TaskPriority
    status: TaskStatus
    category: str | None
    tags: list[str]
    color: str | None
    due_date: datetime | None
    completed_at: datetime | None
    created_at: datetime
    updated_at: datetime


class TaskListOut(BaseModel):
    items: list[TaskOut]
    total: int
