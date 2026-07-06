import uuid
from datetime import UTC, datetime

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.appointment import Appointment
from app.repositories.appointments import AppointmentRepository
from app.schemas.appointment import AppointmentCreate, AppointmentUpdate


class AppointmentNotFoundError(Exception):
    pass


class InvalidPeriodError(Exception):
    """La fin du rendez-vous doit être strictement après son début."""


def _as_utc(value: datetime) -> datetime:
    # SQLite renvoie des datetimes naïfs (stockés en UTC), Pydantic des datetimes
    # avec fuseau : on normalise pour pouvoir les comparer
    return value.replace(tzinfo=UTC) if value.tzinfo is None else value


class AppointmentService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.appointments = AppointmentRepository(db)

    async def _get_owned(self, user_id: uuid.UUID, appointment_id: uuid.UUID) -> Appointment:
        appointment = await self.appointments.get(user_id, appointment_id)
        if appointment is None:
            raise AppointmentNotFoundError
        return appointment

    async def get(self, user_id: uuid.UUID, appointment_id: uuid.UUID) -> Appointment:
        return await self._get_owned(user_id, appointment_id)

    async def create(self, user_id: uuid.UUID, payload: AppointmentCreate) -> Appointment:
        if payload.end_at <= payload.start_at:
            raise InvalidPeriodError
        appointment = Appointment(user_id=user_id, **payload.model_dump())
        self.appointments.add(appointment)
        await self.db.commit()
        # Recharge les valeurs générées côté serveur (created_at/updated_at)
        # avant que Pydantic ne lise l'objet hors du contexte async
        await self.db.refresh(appointment)
        return appointment

    async def update(
        self, user_id: uuid.UUID, appointment_id: uuid.UUID, payload: AppointmentUpdate
    ) -> Appointment:
        appointment = await self._get_owned(user_id, appointment_id)
        changes = payload.model_dump(exclude_unset=True)
        # Vérifie la cohérence sur les valeurs finales (période partiellement modifiée)
        start_at = changes.get("start_at", appointment.start_at)
        end_at = changes.get("end_at", appointment.end_at)
        if _as_utc(end_at) <= _as_utc(start_at):
            raise InvalidPeriodError
        for field, value in changes.items():
            setattr(appointment, field, value)
        await self.db.commit()
        await self.db.refresh(appointment)
        return appointment

    async def delete(self, user_id: uuid.UUID, appointment_id: uuid.UUID) -> None:
        appointment = await self._get_owned(user_id, appointment_id)
        await self.appointments.delete(appointment)
        await self.db.commit()
