"""Instrumentation OpenTelemetry (traces distribuees).

Instrumentation *manuelle* : on construit explicitement le pipeline de traces,
plutot que d'utiliser l'auto-instrumentation zero-code (opentelemetry-instrument).
C'est plus verbeux mais on voit exactement ce qui se passe et on garde le controle.

Pipeline : requete HTTP -> span FastAPI -> spans SQLAlchemy -> exporte en OTLP
vers un collecteur (Alloy), qui relaie vers Tempo.
"""

from fastapi import FastAPI
from opentelemetry import trace
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor
from opentelemetry.instrumentation.sqlalchemy import SQLAlchemyInstrumentor
from opentelemetry.sdk.resources import Resource
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from sqlalchemy.ext.asyncio import AsyncEngine

from app.core.config import get_settings


def setup_telemetry(app: FastAPI, engine: AsyncEngine) -> None:
    """Branche le traçage OTLP sur l'app FastAPI et l'engine SQLAlchemy.

    Ne fait rien si OTEL_ENABLED n'est pas actif (dev local sans backend traces).
    """
    settings = get_settings()
    if not settings.otel_enabled:
        return

    # 1. Resource : l'identite du service, attachee a chaque span emis.
    #    service.name est le nom qui apparait dans Tempo et le service graph.
    resource = Resource.create({"service.name": settings.otel_service_name})

    # 2. TracerProvider : la fabrique de spans, rattachee a cette Resource.
    provider = TracerProvider(resource=resource)

    # 3. Exporteur OTLP/gRPC : envoie les spans au collecteur (Alloy -> Tempo).
    #    insecure=True : OTLP en clair, pas de TLS a l'interieur du cluster.
    exporter = OTLPSpanExporter(
        endpoint=settings.otel_exporter_otlp_endpoint,
        insecure=True,
    )

    # 4. BatchSpanProcessor : bufferise les spans et les exporte par lots
    #    (bien plus efficace que d'envoyer span par span).
    provider.add_span_processor(BatchSpanProcessor(exporter))

    # 5. On enregistre ce provider comme provider global du process.
    trace.set_tracer_provider(provider)

    # 6. Auto-instrumentation des bibliotheques :
    #    - FastAPI : un span racine par requete HTTP (methode, route, statut).
    FastAPIInstrumentor.instrument_app(app)
    #    - SQLAlchemy : un span par requete SQL, imbrique sous le span HTTP.
    #      L'engine est asynchrone, on passe le sync_engine sous-jacent.
    SQLAlchemyInstrumentor().instrument(engine=engine.sync_engine)
