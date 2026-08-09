"""Page de documentation OpenAPI, servie entièrement par l'API.

FastAPI génère sa page `/docs` avec des assets pris sur cdn.jsdelivr.net et un
`<script>` d'initialisation inline. Les deux sont incompatibles avec une CSP
qui n'accorde rien par défaut, et la doc d'une plateforme privée n'a pas à
dépendre d'un tiers public pour s'afficher.

Les assets sont donc vendorés dans `app/static/docs/` et l'initialisation de
Swagger UI vit dans un fichier (`swagger-init.js`), pas dans la page : la CSP
de la route tient alors en `script-src 'self'`, sans `'unsafe-inline'` ni hash
à resynchroniser à chaque changement de configuration.

ReDoc a été retiré plutôt que rapatrié ici : son badge « powered by Redocly »
est chargé en dur depuis `cdn.redoc.ly`, sans option pour le désactiver, et sa
recherche exige un Web Worker en `blob:`. Le garder revenait soit à rouvrir la
CSP à un tiers public, soit à vivre avec une violation permanente en console,
pour une seconde vue sur la même spécification.
"""

from pathlib import Path

from fastapi import APIRouter, Request
from fastapi.responses import HTMLResponse

DOCS_URL = "/api/docs"
OPENAPI_URL = "/api/openapi.json"
ASSETS_URL = "/api/docs-assets"
ASSETS_DIR = Path(__file__).parent / "static" / "docs"

# Évite une requête de favicon (404) que la page ne sait pas satisfaire.
_EMPTY_FAVICON = '<link rel="icon" href="data:,">'

router = APIRouter(include_in_schema=False)


@router.get(DOCS_URL, response_class=HTMLResponse)
async def swagger_ui(request: Request) -> HTMLResponse:
    return HTMLResponse(f"""<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{request.app.title}</title>
<link rel="stylesheet" href="{ASSETS_URL}/swagger-ui.css">
{_EMPTY_FAVICON}
</head>
<body>
<div id="swagger-ui"></div>
<script src="{ASSETS_URL}/swagger-ui-bundle.js"></script>
<script src="{ASSETS_URL}/swagger-init.js"></script>
</body>
</html>
""")
