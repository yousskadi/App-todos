"""Métriques Prometheus (méthode RED : Rate, Errors, Duration).

Troisième signal d'observabilité, après les traces (app/telemetry.py) et les
logs (app/logging_config.py). Le homelab utilise kube-prometheus-stack, donc
un modèle *scrape* : on expose GET /metrics et un ServiceMonitor vient le
lire — pas de push, contrairement aux traces (OTLP).

Deux métriques suffisent pour la méthode RED :
- http_requests_total (compteur) : le débit via rate(), les erreurs via le
  label status ;
- http_request_duration_seconds (histogramme) : latence en percentiles via
  histogram_quantile().

Le label route est le *gabarit* de la route (/api/v1/tasks/{task_id}), jamais
le chemin réel, sinon chaque id créerait une série (explosion de cardinalité).

Désactivé par défaut : activer via METRICS_ENABLED=1.
"""

import time

from fastapi import FastAPI
from prometheus_client import (
    CONTENT_TYPE_LATEST,
    CollectorRegistry,
    Counter,
    Histogram,
    generate_latest,
)
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

from app.core.config import get_settings


def route_template(request: Request) -> str:
    """Gabarit de la route pour le chemin demandé (/api/v1/tasks/{task_id}).

    FastAPI inclut les routers paresseusement : le route.path posé dans le
    scope ne contient pas le préfixe (/health, pas /api/v1/health). On part
    donc du chemin réel et on remplace la valeur de chaque paramètre par son
    nom, segment par segment depuis la droite.
    """
    if request.scope.get("route") is None:
        return "unmatched"
    segments = request.scope["path"].split("/")
    for name, value in request.scope.get("path_params", {}).items():
        for i in range(len(segments) - 1, -1, -1):
            if segments[i] == str(value):
                segments[i] = "{" + name + "}"
                break
    return "/".join(segments)


class RequestMetricsMiddleware(BaseHTTPMiddleware):
    """Mesure chaque requête HTTP : compteur + histogramme de latence."""

    def __init__(self, app, requests_total: Counter, request_duration: Histogram):
        super().__init__(app)
        self.requests_total = requests_total
        self.request_duration = request_duration

    async def dispatch(self, request: Request, call_next) -> Response:
        start = time.perf_counter()
        response = await call_next(request)
        elapsed = time.perf_counter() - start

        template = route_template(request)
        if template == "/metrics":
            return response

        labels = {"method": request.method, "route": template}
        self.requests_total.labels(**labels, status=response.status_code).inc()
        self.request_duration.labels(**labels).observe(elapsed)
        return response


def setup_metrics(app: FastAPI) -> None:
    """Expose GET /metrics et branche la mesure des requêtes.

    Ne fait rien si METRICS_ENABLED n'est pas actif (dev local sans Prometheus).
    """
    settings = get_settings()
    if not settings.metrics_enabled:
        return

    # Registre dédié plutôt que le registre global du module prometheus_client :
    # setup_metrics reste rappelable (tests) sans collision de séries.
    registry = CollectorRegistry()
    requests_total = Counter(
        "http_requests_total",
        "Nombre de requêtes HTTP traitées",
        ["method", "route", "status"],
        registry=registry,
    )
    request_duration = Histogram(
        "http_request_duration_seconds",
        "Durée de traitement des requêtes HTTP",
        ["method", "route"],
        registry=registry,
    )

    app.add_middleware(
        RequestMetricsMiddleware,
        requests_total=requests_total,
        request_duration=request_duration,
    )

    # Hors de /api/v1 : scrapé en direct sur le port du pod, jamais proxifié
    # par nginx, donc jamais exposé au navigateur.
    @app.get("/metrics", include_in_schema=False)
    def metrics() -> Response:
        return Response(generate_latest(registry), media_type=CONTENT_TYPE_LATEST)
