import os

# Doit être défini avant tout import de app.* (la config est lue à l'import)
os.environ.setdefault("JWT_SECRET", "secret-de-test-uniquement-jamais-en-production")

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine
from sqlalchemy.pool import StaticPool

from app.db.base import Base
from app.db.session import get_db
from app.main import create_app
from app.middleware.rate_limit import limiter
from app.models import (  # noqa: F401 — enregistre les modèles
    appointment,
    refresh_session,
    task,
    user,
)

# SQLite en mémoire par défaut (rapide, aucun service requis) ;
# la CI fournit TEST_DATABASE_URL pointant sur Postgres.
TEST_DATABASE_URL = os.environ.get("TEST_DATABASE_URL", "sqlite+aiosqlite://")


@pytest.fixture
async def engine():
    kwargs = {}
    if TEST_DATABASE_URL.startswith("sqlite"):
        # StaticPool : une seule connexion partagée, sinon chaque connexion
        # SQLite en mémoire verrait une base différente
        kwargs = {"poolclass": StaticPool, "connect_args": {"check_same_thread": False}}
    engine = create_async_engine(TEST_DATABASE_URL, **kwargs)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield engine
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await engine.dispose()


@pytest.fixture
async def client(engine):
    session_factory = async_sessionmaker(engine, expire_on_commit=False)

    async def override_get_db():
        async with session_factory() as session:
            yield session

    app = create_app()
    app.dependency_overrides[get_db] = override_get_db

    # Désactivé par défaut : les tests enchaînent les requêtes bien au-delà
    # des limites par minute. Le test dédié au rate limiting le réactive.
    limiter.enabled = False

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        yield c


REGISTER_PAYLOAD = {
    "email": "youssef@example.com",
    "password": "MotDePasseSolide123",
    "display_name": "Youssef",
}


@pytest.fixture
async def registered_user(client):
    response = await client.post("/api/v1/auth/register", json=REGISTER_PAYLOAD)
    assert response.status_code == 201
    return REGISTER_PAYLOAD


@pytest.fixture
async def auth_client(client, registered_user):
    """Client authentifié : access token dans les headers, cookie refresh en jar."""
    response = await client.post(
        "/api/v1/auth/login",
        json={"email": registered_user["email"], "password": registered_user["password"]},
    )
    assert response.status_code == 200
    client.headers["Authorization"] = f"Bearer {response.json()['access_token']}"
    return client
