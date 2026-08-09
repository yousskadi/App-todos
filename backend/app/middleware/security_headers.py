from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

from app.docs import ASSETS_URL, DOCS_URL

# Routes d'API : rien n'est accordé. Aucune réponse JSON n'a de raison de
# charger quoi que ce soit, la CSP neutralise donc toute interprétation d'une
# réponse détournée.
API_CSP = "default-src 'none'; frame-ancestors 'none'"

# Page de documentation : elle sert du HTML, et `default-src 'none'` y
# bloquait CSS et JS (page blanche, sans message). Tout vient de l'origine, les
# assets étant vendorés dans l'image ; seul `data:` est ouvert aux images,
# swagger-ui.css embarquant ses icônes ainsi. Pas de `'unsafe-inline'` :
# l'initialisation de Swagger UI a été sortie de la page.
DOCS_CSP = (
    "default-src 'none'; "
    "script-src 'self'; "
    "style-src 'self'; "
    "img-src 'self' data:; "
    "font-src 'self'; "
    "connect-src 'self'; "
    "frame-ancestors 'none'"
)

_DOCS_ASSETS_PREFIX = f"{ASSETS_URL}/"


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """En-têtes de sécurité pour les réponses de l'API.

    La CSP est posée par périmètre : stricte partout, assouplie sur la seule
    page de documentation, qui est le seul HTML servi par l'API.
    """

    async def dispatch(self, request: Request, call_next) -> Response:
        response = await call_next(request)
        path = request.url.path
        is_docs = path == DOCS_URL or path.startswith(_DOCS_ASSETS_PREFIX)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["Referrer-Policy"] = "no-referrer"
        response.headers["Content-Security-Policy"] = DOCS_CSP if is_docs else API_CSP
        return response
