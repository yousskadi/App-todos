from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "postgresql+asyncpg://todos:todos@localhost:5432/todos"
    # Pas de valeur par défaut : l'app refuse de démarrer sans secret (fail-fast)
    jwt_secret: str
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 15
    refresh_token_expire_days: int = 30
    # False en dev local (http) ; True dès qu'on sert en https
    cookie_secure: bool = False
    # Origines autorisées en dev (Vite) ; vide en prod car nginx proxifie /api
    cors_origins: list[str] = ["http://localhost:5173"]


@lru_cache
def get_settings() -> Settings:
    return Settings()
