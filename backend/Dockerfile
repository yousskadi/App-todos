FROM python:3.12-slim

# Debian has published these fixes but python:3.12-slim has not been rebuilt
# since, so a plain rebuild keeps the vulnerable packages. Without this step the
# Trivy scan of the `image` job fails on fixable HIGH CVEs (util-linux, openssl,
# pcre2). Drop a package from the list once the upstream image ships its fix.
RUN apt-get update && \
    apt-get install -y --only-upgrade \
        bsdutils libblkid1 liblastlog2-2 libmount1 libsmartcols1 libuuid1 \
        login mount util-linux \
        libpcre2-8-0 libssl3t64 openssl openssl-provider-legacy && \
    rm -rf /var/lib/apt/lists/*

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
