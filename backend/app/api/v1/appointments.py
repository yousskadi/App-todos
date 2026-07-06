import uuid
from datetime import datetime
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.schemas.appointment import (
    AppointmentCreate,
    AppointmentListOut,
    AppointmentOut,
    AppointmentUpdate,
)
from app.security.deps import CurrentUser
from app.services.appointments import (
    AppointmentNotFoundError,
    AppointmentService,
    InvalidPeriodError,
)

router = APIRouter(prefix="/appointments", tags=["appointments"])

DbSession = Annotated[AsyncSession, Depends(get_db)]

# 404 volontaire (et non 403) : ne révèle pas l'existence d'un rendez-vous d'autrui
_not_found = HTTPException(
    status_code=status.HTTP_404_NOT_FOUND, detail="Rendez-vous introuvable"
)
_invalid_period = HTTPException(
    status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
    detail="La fin du rendez-vous doit être après son début",
)


@router.get("", response_model=AppointmentListOut)
async def list_appointments(
    current_user: CurrentUser,
    db: DbSession,
    start_from: Annotated[datetime | None, Query(alias="from")] = None,
    start_to: Annotated[datetime | None, Query(alias="to")] = None,
    category: Annotated[str | None, Query(max_length=50)] = None,
    q: Annotated[str | None, Query(max_length=200)] = None,
    limit: Annotated[int, Query(ge=1, le=500)] = 100,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> AppointmentListOut:
    items, total = await AppointmentService(db).appointments.list(
        current_user.id,
        start_from=start_from,
        start_to=start_to,
        category=category,
        q=q,
        limit=limit,
        offset=offset,
    )
    return AppointmentListOut(items=[AppointmentOut.model_validate(a) for a in items], total=total)


@router.post("", response_model=AppointmentOut, status_code=status.HTTP_201_CREATED)
async def create_appointment(
    payload: AppointmentCreate, current_user: CurrentUser, db: DbSession
) -> AppointmentOut:
    try:
        appointment = await AppointmentService(db).create(current_user.id, payload)
    except InvalidPeriodError:
        raise _invalid_period from None
    return AppointmentOut.model_validate(appointment)


@router.get("/{appointment_id}", response_model=AppointmentOut)
async def get_appointment(
    appointment_id: uuid.UUID, current_user: CurrentUser, db: DbSession
) -> AppointmentOut:
    try:
        appointment = await AppointmentService(db).get(current_user.id, appointment_id)
    except AppointmentNotFoundError:
        raise _not_found from None
    return AppointmentOut.model_validate(appointment)


@router.patch("/{appointment_id}", response_model=AppointmentOut)
async def update_appointment(
    appointment_id: uuid.UUID,
    payload: AppointmentUpdate,
    current_user: CurrentUser,
    db: DbSession,
) -> AppointmentOut:
    try:
        appointment = await AppointmentService(db).update(
            current_user.id, appointment_id, payload
        )
    except AppointmentNotFoundError:
        raise _not_found from None
    except InvalidPeriodError:
        raise _invalid_period from None
    return AppointmentOut.model_validate(appointment)


@router.delete("/{appointment_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_appointment(
    appointment_id: uuid.UUID, current_user: CurrentUser, db: DbSession
) -> None:
    try:
        await AppointmentService(db).delete(current_user.id, appointment_id)
    except AppointmentNotFoundError:
        raise _not_found from None
