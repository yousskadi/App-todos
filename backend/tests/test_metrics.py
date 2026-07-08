import pytest
from httpx import ASGITransport, AsyncClient

from app.core.config import get_settings
from app.main import create_app
from app.metrics import setup_metrics


@pytest.fixture
async def metrics_client(monkeypatch):
    """Client sur une app avec les métriques activées (registre dédié)."""
    monkeypatch.setenv("METRICS_ENABLED", "1")
    get_settings.cache_clear()
    app = create_app()
    setup_metrics(app)
    try:
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as c:
            yield c
    finally:
        get_settings.cache_clear()


async def test_metrics_absent_par_defaut(client):
    # Le fixture client n'appelle pas setup_metrics : l'app n'expose rien
    response = await client.get("/metrics")
    assert response.status_code == 404


async def test_requete_comptee_avec_gabarit_de_route(metrics_client):
    assert (await metrics_client.get("/api/v1/health")).status_code == 200

    response = await metrics_client.get("/metrics")
    assert response.status_code == 200
    corps = response.text
    assert (
        'http_requests_total{method="GET",route="/api/v1/health",status="200"} 1.0'
        in corps
    )
    assert 'http_request_duration_seconds_bucket' in corps


async def test_erreurs_visibles_par_label_status(metrics_client):
    # Sans token : 401, comptée sous son statut
    assert (await metrics_client.get("/api/v1/tasks")).status_code == 401

    corps = (await metrics_client.get("/metrics")).text
    assert (
        'http_requests_total{method="GET",route="/api/v1/tasks",status="401"} 1.0'
        in corps
    )


async def test_parametre_remplace_par_son_nom(metrics_client):
    # L'id réel ne doit jamais apparaître dans le label (cardinalité bornée)
    assert (await metrics_client.get("/api/v1/tasks/123")).status_code == 401

    corps = (await metrics_client.get("/metrics")).text
    assert 'route="/api/v1/tasks/{task_id}"' in corps
    assert 'route="/api/v1/tasks/123"' not in corps


async def test_scrape_non_compte(metrics_client):
    await metrics_client.get("/metrics")
    corps = (await metrics_client.get("/metrics")).text
    assert 'route="/metrics"' not in corps


async def test_exemplar_trace_id_en_openmetrics(metrics_client):
    # Avec un span actif, la latence porte un exemplar trace_id, visible
    # seulement au format OpenMetrics (négocié via l'en-tête Accept).
    from opentelemetry.sdk.trace import TracerProvider

    tracer = TracerProvider().get_tracer("test")
    with tracer.start_as_current_span("req") as span:
        assert (await metrics_client.get("/api/v1/health")).status_code == 200
        trace_id = format(span.get_span_context().trace_id, "032x")

    response = await metrics_client.get(
        "/metrics", headers={"Accept": "application/openmetrics-text"}
    )
    assert "application/openmetrics-text" in response.headers["content-type"]
    assert f'# {{trace_id="{trace_id}"}}' in response.text


async def test_exemplar_absent_du_format_classique(metrics_client):
    # Sans en-tête OpenMetrics, le format texte classique n'expose pas d'exemplar.
    from opentelemetry.sdk.trace import TracerProvider

    tracer = TracerProvider().get_tracer("test")
    with tracer.start_as_current_span("req"):
        await metrics_client.get("/api/v1/health")

    corps = (await metrics_client.get("/metrics")).text
    assert "trace_id" not in corps
