import uuid
from datetime import UTC, datetime

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.task import Task, TaskStatus
from app.repositories.tasks import TaskRepository
from app.schemas.task import TaskCreate, TaskUpdate


class TaskNotFoundError(Exception):
    pass


class TaskService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.tasks = TaskRepository(db)

    async def _get_owned(self, user_id: uuid.UUID, task_id: uuid.UUID) -> Task:
        task = await self.tasks.get(user_id, task_id)
        if task is None:
            raise TaskNotFoundError
        return task

    async def get(self, user_id: uuid.UUID, task_id: uuid.UUID) -> Task:
        return await self._get_owned(user_id, task_id)

    async def create(self, user_id: uuid.UUID, payload: TaskCreate) -> Task:
        task = Task(user_id=user_id, **payload.model_dump())
        self.tasks.add(task)
        await self.db.commit()
        # Recharge les valeurs générées côté serveur (created_at/updated_at)
        # avant que Pydantic ne lise l'objet hors du contexte async
        await self.db.refresh(task)
        return task

    async def update(self, user_id: uuid.UUID, task_id: uuid.UUID, payload: TaskUpdate) -> Task:
        task = await self._get_owned(user_id, task_id)
        changes = payload.model_dump(exclude_unset=True)
        for field, value in changes.items():
            setattr(task, field, value)
        if changes.get("status") == TaskStatus.DONE and task.completed_at is None:
            task.completed_at = datetime.now(UTC)
        await self.db.commit()
        await self.db.refresh(task)
        return task

    async def complete(self, user_id: uuid.UUID, task_id: uuid.UUID) -> Task:
        task = await self._get_owned(user_id, task_id)
        task.status = TaskStatus.DONE
        task.completed_at = datetime.now(UTC)
        await self.db.commit()
        await self.db.refresh(task)
        return task

    async def archive(self, user_id: uuid.UUID, task_id: uuid.UUID) -> Task:
        task = await self._get_owned(user_id, task_id)
        task.status = TaskStatus.ARCHIVED
        await self.db.commit()
        await self.db.refresh(task)
        return task

    async def delete(self, user_id: uuid.UUID, task_id: uuid.UUID) -> None:
        task = await self._get_owned(user_id, task_id)
        await self.tasks.delete(task)
        await self.db.commit()
