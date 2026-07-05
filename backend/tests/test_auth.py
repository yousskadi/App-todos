from app.middleware.rate_limit import limiter
from tests.conftest import REGISTER_PAYLOAD

AUTH = "/api/v1/auth"


async def test_register_returns_user_without_password(client):
    response = await client.post(f"{AUTH}/register", json=REGISTER_PAYLOAD)
    assert response.status_code == 201
    body = response.json()
    assert body["email"] == REGISTER_PAYLOAD["email"]
    assert "password" not in body
    assert "password_hash" not in body


async def test_register_duplicate_email_conflict(client, registered_user):
    response = await client.post(f"{AUTH}/register", json=REGISTER_PAYLOAD)
    assert response.status_code == 409


async def test_register_rejects_short_password(client):
    payload = {**REGISTER_PAYLOAD, "password": "court"}
    response = await client.post(f"{AUTH}/register", json=payload)
    assert response.status_code == 422


async def test_login_sets_refresh_cookie_and_returns_access_token(client, registered_user):
    response = await client.post(
        f"{AUTH}/login",
        json={"email": registered_user["email"], "password": registered_user["password"]},
    )
    assert response.status_code == 200
    assert response.json()["access_token"]
    set_cookie = response.headers["set-cookie"]
    assert "refresh_token=" in set_cookie
    assert "HttpOnly" in set_cookie
    assert "samesite=strict" in set_cookie.lower()


async def test_login_same_error_for_unknown_email_and_bad_password(client, registered_user):
    bad_password = await client.post(
        f"{AUTH}/login",
        json={"email": registered_user["email"], "password": "MauvaisMotDePasse1"},
    )
    unknown_email = await client.post(
        f"{AUTH}/login",
        json={"email": "inconnu@example.com", "password": "MauvaisMotDePasse1"},
    )
    assert bad_password.status_code == unknown_email.status_code == 401
    # Même message : ne révèle pas l'existence du compte
    assert bad_password.json() == unknown_email.json()


async def test_me_requires_authentication(client):
    response = await client.get(f"{AUTH}/me")
    assert response.status_code == 401


async def test_me_returns_current_user(auth_client):
    response = await auth_client.get(f"{AUTH}/me")
    assert response.status_code == 200
    assert response.json()["email"] == REGISTER_PAYLOAD["email"]


async def test_me_rejects_invalid_token(client):
    response = await client.get(f"{AUTH}/me", headers={"Authorization": "Bearer nimporte.quoi"})
    assert response.status_code == 401


async def test_refresh_rotates_token(auth_client):
    old_refresh = auth_client.cookies.get("refresh_token")
    response = await auth_client.post(f"{AUTH}/refresh")
    assert response.status_code == 200
    assert response.json()["access_token"]
    assert auth_client.cookies.get("refresh_token") != old_refresh


async def test_refresh_reuse_revokes_all_sessions(auth_client):
    stolen = auth_client.cookies.get("refresh_token")
    response = await auth_client.post(f"{AUTH}/refresh")
    assert response.status_code == 200
    current = auth_client.cookies.get("refresh_token")

    # Rejeu du token déjà roté (scénario de vol) → refusé…
    auth_client.cookies.set("refresh_token", stolen, path="/api/v1/auth")
    response = await auth_client.post(f"{AUTH}/refresh")
    assert response.status_code == 401

    # …et la session légitime est révoquée aussi
    auth_client.cookies.set("refresh_token", current, path="/api/v1/auth")
    response = await auth_client.post(f"{AUTH}/refresh")
    assert response.status_code == 401


async def test_refresh_without_cookie(client):
    response = await client.post(f"{AUTH}/refresh")
    assert response.status_code == 401


async def test_logout_revokes_refresh_token(auth_client):
    refresh_token = auth_client.cookies.get("refresh_token")
    response = await auth_client.post(f"{AUTH}/logout")
    assert response.status_code == 204

    auth_client.cookies.set("refresh_token", refresh_token, path="/api/v1/auth")
    response = await auth_client.post(f"{AUTH}/refresh")
    assert response.status_code == 401


async def test_login_rate_limited(client, registered_user):
    limiter.enabled = True
    try:
        limiter.reset()
        statuses = []
        for _ in range(6):
            response = await client.post(
                f"{AUTH}/login",
                json={"email": registered_user["email"], "password": "MauvaisMotDePasse1"},
            )
            statuses.append(response.status_code)
        assert statuses[-1] == 429
    finally:
        limiter.enabled = False
        limiter.reset()
