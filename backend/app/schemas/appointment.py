import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

_COLOR_PATTERN = r"^#[0-9a-fA-F]{6}$"


class AppointmentCreate(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    description: str = Field(default="", max_length=5000)
    location: str | None = Field(default=None, max_length=200)
    start_at: datetime
    end_at: datetime
    category: str | None = Field(default=None, max_length=50)
    color: str | None = Field(default=None, pattern=_COLOR_PATTERN)
    # Rappel N minutes avant le début (au plus une semaine) ; None = pas de rappel
    reminder_minutes_before: int | None = Field(default=None, ge=0, le=10080)


class AppointmentUpdate(BaseModel):
    """Mise à jour partielle : seuls les champs fournis sont modifiés."""

    title: str | None = Field(default=None, min_length=1, max_length=200)
    description: str | None = Field(default=None, max_length=5000)
    location: str | None = Field(default=None, max_length=200)
    start_at: datetime | None = None
    end_at: datetime | None = None
    category: str | None = Field(default=None, max_length=50)
    color: str | None = Field(default=None, pattern=_COLOR_PATTERN)
    reminder_minutes_before: int | None = Field(default=None, ge=0, le=10080)


class AppointmentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    title: str
    description: str
    location: str | None
    start_at: datetime
    end_at: datetime
    category: str | None
    color: str | None
    reminder_minutes_before: int | None
    created_at: datetime
    updated_at: datetime


class AppointmentListOut(BaseModel):
    items: list[AppointmentOut]
    total: int
