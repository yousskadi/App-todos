from fastapi import APIRouter

from app.api.v1 import appointments, auth, health, tasks

api_router = APIRouter()
api_router.include_router(health.router, tags=["health"])
api_router.include_router(auth.router)
api_router.include_router(tasks.router)
api_router.include_router(appointments.router)
