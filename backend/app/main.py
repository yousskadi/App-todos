from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi.errors import RateLimitExceeded
from slowapi.extension import _rate_limit_exceeded_handler

from app.api.v1.router import api_router
from app.core.config import get_settings
from app.db.session import engine
from app.middleware.rate_limit import limiter
from app.middleware.security_headers import SecurityHeadersMiddleware
from app.telemetry import setup_telemetry


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(
        title="App Todos API",
        description="API de gestion de tâches et rendez-vous",
        version="0.1.0",
        docs_url="/api/docs",
        openapi_url="/api/openapi.json",
    )

    app.state.limiter = limiter
    app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

    app.add_middleware(SecurityHeadersMiddleware)
    if settings.cors_origins:
        app.add_middleware(
            CORSMiddleware,
            allow_origins=settings.cors_origins,
            allow_credentials=True,
            allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE"],
            allow_headers=["Authorization", "Content-Type"],
        )

    app.include_router(api_router, prefix="/api/v1")
    return app


app = create_app()
# Traçage OpenTelemetry (no-op si OTEL_ENABLED n'est pas actif).
setup_telemetry(app, engine)
