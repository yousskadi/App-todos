import enum
import uuid
from datetime import datetime

from sqlalchemy import JSON, DateTime, Enum, ForeignKey, String, Text, Uuid, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class TaskPriority(enum.StrEnum):
    URGENT = "urgent"
    HIGH = "high"
    NORMAL = "normal"
    LOW = "low"


class TaskStatus(enum.StrEnum):
    TODO = "todo"
    IN_PROGRESS = "in_progress"
    DONE = "done"
    ARCHIVED = "archived"


# native_enum=False : stocké en VARCHAR — portable (SQLite/Postgres) et
# pas de type Postgres à faire évoluer par migration à chaque valeur ajoutée
def _varchar_enum(enum_cls: type[enum.StrEnum]) -> Enum:
    return Enum(
        enum_cls,
        native_enum=False,
        length=20,
        values_callable=lambda e: [m.value for m in e],
    )


_priority_enum = _varchar_enum(TaskPriority)
_status_enum = _varchar_enum(TaskStatus)


class Task(Base):
    __tablename__ = "tasks"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    title: Mapped[str] = mapped_column(String(200))
    description: Mapped[str] = mapped_column(Text, default="")
    priority: Mapped[TaskPriority] = mapped_column(_priority_enum, default=TaskPriority.NORMAL)
    status: Mapped[TaskStatus] = mapped_column(_status_enum, default=TaskStatus.TODO, index=True)
    category: Mapped[str | None] = mapped_column(String(50), default=None)
    tags: Mapped[list[str]] = mapped_column(JSON, default=list)
    color: Mapped[str | None] = mapped_column(String(7), default=None)
    due_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), default=None)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), default=None)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
