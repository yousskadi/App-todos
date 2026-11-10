FROM python:3.12-slim

# Debian has published this fix but python:3.12-slim has not been rebuilt
# since. Without this step the Trivy scan of the `image` job fails on a fixable
# HIGH CVE (zlib1g: CVE-2026-85091). Drop a package once the upstream image
# ships its fix.
RUN apt-get update \
    && apt-get install -y --no-install-recommends --only-upgrade zlib1g \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

RUN groupadd -r appuser && useradd -r -g appuser appuser

COPY pyproject.toml alembic.ini ./
COPY alembic ./alembic
COPY app ./app

RUN pip install --no-cache-dir .

USER appuser
EXPOSE 8000

# Applique les migrations puis démarre l'API
CMD ["sh", "-c", "alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port 8000"]
