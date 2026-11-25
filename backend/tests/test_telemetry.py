from opentelemetry.instrumentation.sqlalchemy import SQLAlchemyInstrumentor
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import SimpleSpanProcessor
from opentelemetry.sdk.trace.export.in_memory_span_exporter import InMemorySpanExporter
from sqlalchemy import text


# The instrumentor only logs a warning when the installed SQLAlchemy is outside
# its supported range, and traces then lose their SQL spans without any error.
async def test_sqlalchemy_queries_emit_spans(engine):
    exporter = InMemorySpanExporter()
    provider = TracerProvider()
    provider.add_span_processor(SimpleSpanProcessor(exporter))

    instrumentor = SQLAlchemyInstrumentor()
    instrumentor.instrument(engine=engine.sync_engine, tracer_provider=provider)
    try:
        async with engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
    finally:
        instrumentor.uninstrument()

    assert exporter.get_finished_spans()
