"""Logs structurés JSON corrélés aux traces.

Complément du traçage OpenTelemetry (app/telemetry.py) : chaque ligne de log
émise pendant une requête tracée porte le trace_id/span_id du span courant,
ce qui permet de sauter d'un log (Loki) à sa trace (Tempo) dans Grafana.

Désactivé par défaut : en dev local on garde les logs texte lisibles d'uvicorn.
Activer via LOG_JSON=1 (homelab : stdout JSON ramassé par Alloy -> Loki).
"""

import json
import logging
import sys
from datetime import UTC, datetime

from opentelemetry import trace

from app.core.config import get_settings


class JsonFormatter(logging.Formatter):
    """Une ligne JSON par enregistrement, avec corrélation de trace."""

    def format(self, record: logging.LogRecord) -> str:
        entry = {
            "timestamp": datetime.fromtimestamp(record.created, tz=UTC).isoformat(
                timespec="milliseconds"
            ),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
        }
        # Corrélation : si un span est actif, on attache ses identifiants au
        # format hexadécimal attendu par Grafana pour lier Loki et Tempo.
        ctx = trace.get_current_span().get_span_context()
        if ctx.is_valid:
            entry["trace_id"] = format(ctx.trace_id, "032x")
            entry["span_id"] = format(ctx.span_id, "016x")
        if record.exc_info:
            entry["exception"] = self.formatException(record.exc_info)
        return json.dumps(entry, ensure_ascii=False)


def setup_logging() -> None:
    """Bascule tous les logs du process en JSON sur stdout.

    Ne fait rien si LOG_JSON n'est pas actif (dev local : logs texte d'uvicorn).
    """
    settings = get_settings()
    if not settings.log_json:
        return

    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(JsonFormatter())

    root = logging.getLogger()
    root.handlers = [handler]
    root.setLevel(logging.INFO)

    # uvicorn installe ses propres handlers texte ; on les retire pour que ses
    # logs (démarrage, accès) remontent au root et sortent en JSON eux aussi.
    for name in ("uvicorn", "uvicorn.error", "uvicorn.access"):
        uvicorn_logger = logging.getLogger(name)
        uvicorn_logger.handlers = []
        uvicorn_logger.propagate = True
