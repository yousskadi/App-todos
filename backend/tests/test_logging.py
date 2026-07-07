import json
import logging
import sys

from opentelemetry.sdk.trace import TracerProvider

from app.core.config import get_settings
from app.logging_config import JsonFormatter, setup_logging

UVICORN_LOGGERS = ("uvicorn", "uvicorn.error", "uvicorn.access")


def make_record(exc_info=None):
    return logging.LogRecord(
        name="app.test",
        level=logging.INFO,
        pathname=__file__,
        lineno=1,
        msg="bonjour",
        args=(),
        exc_info=exc_info,
    )


def test_ligne_json_avec_champs_de_base():
    entry = json.loads(JsonFormatter().format(make_record()))
    assert entry["level"] == "INFO"
    assert entry["logger"] == "app.test"
    assert entry["message"] == "bonjour"
    assert entry["timestamp"].endswith("+00:00")
    # Pas de span actif : pas de champs de corrélation
    assert "trace_id" not in entry


def test_correlation_quand_span_actif():
    tracer = TracerProvider().get_tracer(__name__)
    with tracer.start_as_current_span("test") as span:
        entry = json.loads(JsonFormatter().format(make_record()))
    ctx = span.get_span_context()
    assert entry["trace_id"] == format(ctx.trace_id, "032x")
    assert entry["span_id"] == format(ctx.span_id, "016x")


def test_exception_incluse():
    try:
        raise ValueError("boom")
    except ValueError:
        entry = json.loads(JsonFormatter().format(make_record(exc_info=sys.exc_info())))
    assert "ValueError: boom" in entry["exception"]


def test_setup_logging_noop_par_defaut(monkeypatch):
    monkeypatch.delenv("LOG_JSON", raising=False)
    get_settings.cache_clear()
    avant = logging.getLogger().handlers[:]
    try:
        setup_logging()
        assert logging.getLogger().handlers == avant
    finally:
        get_settings.cache_clear()


def test_setup_logging_active(monkeypatch):
    root = logging.getLogger()
    etat_avant = (root.handlers[:], root.level)
    uvicorn_avant = {
        name: (logging.getLogger(name).handlers[:], logging.getLogger(name).propagate)
        for name in UVICORN_LOGGERS
    }
    monkeypatch.setenv("LOG_JSON", "1")
    get_settings.cache_clear()
    try:
        setup_logging()
        assert len(root.handlers) == 1
        assert isinstance(root.handlers[0].formatter, JsonFormatter)
        for name in UVICORN_LOGGERS:
            assert logging.getLogger(name).handlers == []
            assert logging.getLogger(name).propagate is True
    finally:
        root.handlers, level = etat_avant[0], etat_avant[1]
        root.setLevel(level)
        for name, (handlers, propagate) in uvicorn_avant.items():
            logging.getLogger(name).handlers = handlers
            logging.getLogger(name).propagate = propagate
        get_settings.cache_clear()
