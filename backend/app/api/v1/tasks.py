import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.models.task import TaskPriority, TaskStatus
from app.schemas.task import TaskCreate, TaskListOut, TaskOut, TaskUpdate
from app.security.deps import CurrentUser
from app.services.tasks import TaskNotFoundError, TaskService

router = APIRouter(prefix="/tasks", tags=["tasks"])

DbSession = Annotated[AsyncSession, Depends(get_db)]

# 404 volontaire (et non 403) : ne révèle pas l'existence d'une tâche d'autrui
_not_found = HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tâche introuvable")


@router.get("", response_model=TaskListOut)
async def list_tasks(
    current_user: CurrentUser,
    db: DbSession,
    status_filter: Annotated[TaskStatus | None, Query(alias="status")] = None,
    priority: TaskPriority | None = None,
    category: Annotated[str | None, Query(max_length=50)] = None,
    q: Annotated[str | None, Query(max_length=200)] = None,
    limit: Annotated[int, Query(ge=1, le=100)] = 50,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> TaskListOut:
    items, total = await TaskService(db).tasks.list(
        current_user.id,
        status=status_filter,
        priority=priority,
        category=category,
        q=q,
        limit=limit,
        offset=offset,
    )
    return TaskListOut(items=[TaskOut.model_validate(t) for t in items], total=total)


@router.post("", response_model=TaskOut, status_code=status.HTTP_201_CREATED)
async def create_task(payload: TaskCreate, current_user: CurrentUser, db: DbSession) -> TaskOut:
    task = await TaskService(db).create(current_user.id, payload)
    return TaskOut.model_validate(task)


@router.get("/{task_id}", response_model=TaskOut)
async def get_task(task_id: uuid.UUID, current_user: CurrentUser, db: DbSession) -> TaskOut:
    try:
        task = await TaskService(db).get(current_user.id, task_id)
    except TaskNotFoundError:
        raise _not_found from None
    return TaskOut.model_validate(task)


@router.patch("/{task_id}", response_model=TaskOut)
async def update_task(
    task_id: uuid.UUID, payload: TaskUpdate, current_user: CurrentUser, db: DbSession
) -> TaskOut:
    try:
        task = await TaskService(db).update(current_user.id, task_id, payload)
    except TaskNotFoundError:
        raise _not_found from None
    return TaskOut.model_validate(task)


@router.post("/{task_id}/complete", response_model=TaskOut)
async def complete_task(task_id: uuid.UUID, current_user: CurrentUser, db: DbSession) -> TaskOut:
    try:
        task = await TaskService(db).complete(current_user.id, task_id)
    except TaskNotFoundError:
        raise _not_found from None
    return TaskOut.model_validate(task)


@router.post("/{task_id}/archive", response_model=TaskOut)
async def archive_task(task_id: uuid.UUID, current_user: CurrentUser, db: DbSession) -> TaskOut:
    try:
        task = await TaskService(db).archive(current_user.id, task_id)
    except TaskNotFoundError:
        raise _not_found from None
    return TaskOut.model_validate(task)


@router.delete("/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_task(task_id: uuid.UUID, current_user: CurrentUser, db: DbSession) -> None:
    try:
        await TaskService(db).delete(current_user.id, task_id)
    except TaskNotFoundError:
        raise _not_found from None
