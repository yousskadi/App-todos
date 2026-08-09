from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from slowapi.errors import RateLimitExceeded
from slowapi.extension import _rate_limit_exceeded_handler

from app.api.v1.router import api_router
from app.core.config import get_settings
from app.db.session import engine
from app.docs import ASSETS_DIR, ASSETS_URL, OPENAPI_URL
from app.docs import router as docs_router
from app.logging_config import setup_logging
from app.metrics import setup_metrics
from app.middleware.rate_limit import limiter
from app.middleware.security_headers import SecurityHeadersMiddleware
from app.telemetry import setup_telemetry


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(
        title="App Todos API",
        description="API de gestion de tâches et rendez-vous",
        version="0.1.0",
        openapi_url=OPENAPI_URL,
        # Pages de documentation servies par app.docs : assets vendorés et
        # initialisation hors ligne, pour tenir sous une CSP sans inline ni CDN.
        docs_url=None,
        redoc_url=None,
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

    app.mount(ASSETS_URL, StaticFiles(directory=ASSETS_DIR), name="docs-assets")
    app.include_router(docs_router)
    app.include_router(api_router, prefix="/api/v1")
    return app


app = create_app()
# Logs JSON structurés (no-op si LOG_JSON n'est pas actif).
setup_logging()
# Métriques Prometheus (no-op si METRICS_ENABLED n'est pas actif).
setup_metrics(app)
# Traçage OpenTelemetry (no-op si OTEL_ENABLED n'est pas actif).
setup_telemetry(app, engine)
