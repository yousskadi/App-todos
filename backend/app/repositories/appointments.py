import uuid
from datetime import datetime

from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.appointment import Appointment


class AppointmentRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get(self, user_id: uuid.UUID, appointment_id: uuid.UUID) -> Appointment | None:
        result = await self.db.execute(
            select(Appointment).where(
                Appointment.id == appointment_id, Appointment.user_id == user_id
            )
        )
        return result.scalar_one_or_none()

    async def list(
        self,
        user_id: uuid.UUID,
        *,
        start_from: datetime | None = None,
        start_to: datetime | None = None,
        category: str | None = None,
        q: str | None = None,
        limit: int = 50,
        offset: int = 0,
    ) -> tuple[list[Appointment], int]:
        query = select(Appointment).where(Appointment.user_id == user_id)
        if start_from is not None:
            query = query.where(Appointment.start_at >= start_from)
        if start_to is not None:
            query = query.where(Appointment.start_at < start_to)
        if category is not None:
            query = query.where(Appointment.category == category)
        if q:
            pattern = f"%{q}%"
            query = query.where(
                or_(
                    Appointment.title.ilike(pattern),
                    Appointment.description.ilike(pattern),
                    Appointment.location.ilike(pattern),
                )
            )

        total = await self.db.scalar(select(func.count()).select_from(query.subquery())) or 0
        result = await self.db.execute(
            query.order_by(Appointment.start_at.asc()).limit(limit).offset(offset)
        )
        return list(result.scalars()), total

    def add(self, appointment: Appointment) -> None:
        self.db.add(appointment)

    async def delete(self, appointment: Appointment) -> None:
        await self.db.delete(appointment)
