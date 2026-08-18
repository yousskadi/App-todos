FROM python:3.12-slim

# Rattrapage de paquets système dont l'image de base amont n'a pas encore intégré le
# correctif. Debian l'a publié, mais python:3.12-slim n'a pas été rebuildée depuis :
# un simple rebuild ne suffit donc pas, il faut upgrader explicitement.
# À retirer quand l'image amont l'aura intégré : la CVE disparaîtra d'elle-même du
# rapport du job `image`, qui ne bloque que sur les CVE corrigeables.
#   - util-linux CVE-2026-53615 (HIGH, corrigée dans 2.41.5-0+deb13u1)
#     Une seule CVE, mais 9 paquets binaires issus du même paquet source.
RUN apt-get update && \
    apt-get install -y --only-upgrade \
        bsdutils libblkid1 liblastlog2-2 libmount1 libsmartcols1 libuuid1 \
        login mount util-linux && \
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
