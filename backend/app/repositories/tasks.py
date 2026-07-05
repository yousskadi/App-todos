import uuid

from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.task import Task, TaskPriority, TaskStatus


class TaskRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get(self, user_id: uuid.UUID, task_id: uuid.UUID) -> Task | None:
        result = await self.db.execute(
            select(Task).where(Task.id == task_id, Task.user_id == user_id)
        )
        return result.scalar_one_or_none()

    async def list(
        self,
        user_id: uuid.UUID,
        *,
        status: TaskStatus | None = None,
        priority: TaskPriority | None = None,
        category: str | None = None,
        q: str | None = None,
        limit: int = 50,
        offset: int = 0,
    ) -> tuple[list[Task], int]:
        query = select(Task).where(Task.user_id == user_id)
        if status is not None:
            query = query.where(Task.status == status)
        else:
            # Par défaut les tâches archivées n'apparaissent pas
            query = query.where(Task.status != TaskStatus.ARCHIVED)
        if priority is not None:
            query = query.where(Task.priority == priority)
        if category is not None:
            query = query.where(Task.category == category)
        if q:
            pattern = f"%{q}%"
            query = query.where(or_(Task.title.ilike(pattern), Task.description.ilike(pattern)))

        total = await self.db.scalar(select(func.count()).select_from(query.subquery())) or 0
        result = await self.db.execute(
            query.order_by(Task.created_at.desc()).limit(limit).offset(offset)
        )
        return list(result.scalars()), total

    def add(self, task: Task) -> None:
        self.db.add(task)

    async def delete(self, task: Task) -> None:
        await self.db.delete(task)
