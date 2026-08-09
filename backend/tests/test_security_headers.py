"""CSP par périmètre : stricte sur l'API, ouverte à l'origine sur /api/docs.

Le piège d'origine : une CSP unique `default-src 'none'` posée sur toutes les
réponses rendait /api/docs blanche, sans message. Le relâchement ne doit pas
déborder sur les routes d'API, d'où le premier test.
"""

from html.parser import HTMLParser

import pytest

from app.docs import ASSETS_DIR, ASSETS_URL, DOCS_URL, OPENAPI_URL
from app.middleware.security_headers import API_CSP, DOCS_CSP

API_ROUTES = ["/api/v1/health", OPENAPI_URL, "/api/v1/tasks", "/api/v1/inexistant"]


@pytest.mark.parametrize("path", API_ROUTES)
async def test_routes_api_gardent_la_csp_stricte(client, path):
    """Y compris en 401 et en 404 : une réponse d'erreur est une réponse."""
    response = await client.get(path)
    assert response.headers["content-security-policy"] == API_CSP
    assert "default-src 'none'" in API_CSP


@pytest.mark.parametrize("path", [DOCS_URL, f"{ASSETS_URL}/swagger-ui-bundle.js"])
async def test_docs_recoivent_la_csp_permissive(client, path):
    response = await client.get(path)
    assert response.status_code == 200
    assert response.headers["content-security-policy"] == DOCS_CSP


async def test_les_autres_en_tetes_sont_partout(client):
    for path in [*API_ROUTES, DOCS_URL]:
        headers = (await client.get(path)).headers
        assert headers["x-content-type-options"] == "nosniff"
        assert headers["x-frame-options"] == "DENY"
        assert headers["referrer-policy"] == "no-referrer"


class _Scripts(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.sources: list[str | None] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        if tag == "script":
            self.sources.append(dict(attrs).get("src"))


async def test_la_page_docs_ne_contient_aucun_script_inline(client):
    """`script-src 'self'` interdit l'inline : la page doit s'en passer.

    Sans ce test, remettre `get_swagger_ui_html` de FastAPI rendrait à nouveau
    la page blanche, la CSP restant valide par ailleurs.
    """
    parser = _Scripts()
    parser.feed((await client.get(DOCS_URL)).text)
    assert parser.sources, "aucun <script> dans la page de documentation"
    assert all(src and src.startswith(f"{ASSETS_URL}/") for src in parser.sources)


async def test_les_assets_de_la_page_docs_sont_servis(client):
    """Aucune référence à un CDN, et chaque asset référencé répond 200."""
    html = (await client.get(DOCS_URL)).text
    assert "cdn.jsdelivr.net" not in html
    for name in ("swagger-ui.css", "swagger-ui-bundle.js", "swagger-init.js"):
        reference = f"{ASSETS_URL}/{name}"
        assert reference in html
        assert (await client.get(reference)).status_code == 200


def test_les_assets_sont_vendores():
    """Filet contre un `pip install .` qui oublierait les fichiers non-.py."""
    for name in ("swagger-ui.css", "swagger-ui-bundle.js", "swagger-init.js"):
        assert (ASSETS_DIR / name).is_file()
