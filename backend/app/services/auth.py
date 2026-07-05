import logging
import uuid
from datetime import UTC, datetime, timedelta

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.models.user import User
from app.repositories.refresh_sessions import RefreshSessionRepository
from app.repositories.users import UserRepository
from app.security.passwords import hash_password, verify_password
from app.security.tokens import generate_refresh_token, hash_refresh_token

logger = logging.getLogger(__name__)


class EmailAlreadyRegisteredError(Exception):
    pass


class InvalidCredentialsError(Exception):
    pass


class InvalidRefreshTokenError(Exception):
    pass


class AuthService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.users = UserRepository(db)
        self.sessions = RefreshSessionRepository(db)

    async def register(self, email: str, password: str, display_name: str) -> User:
        if await self.users.get_by_email(email) is not None:
            raise EmailAlreadyRegisteredError
        user = await self.users.create(
            email=email,
            password_hash=hash_password(password),
            display_name=display_name,
        )
        await self.db.commit()
        logger.info("user registered", extra={"user_id": str(user.id)})
        return user

    async def authenticate(self, email: str, password: str) -> User:
        user = await self.users.get_by_email(email)
        if user is None:
            # Hash factice pour égaliser le temps de réponse
            # (sinon un attaquant distingue « email inconnu » par le timing)
            hash_password(password)
            raise InvalidCredentialsError
        if not verify_password(password, user.password_hash) or not user.is_active:
            raise InvalidCredentialsError
        return user

    async def issue_refresh_token(self, user_id: uuid.UUID) -> str:
        settings = get_settings()
        token = generate_refresh_token()
        await self.sessions.create(
            user_id=user_id,
            token_hash=hash_refresh_token(token),
            expires_at=datetime.now(UTC) + timedelta(days=settings.refresh_token_expire_days),
        )
        await self.db.commit()
        return token

    async def rotate_refresh_token(self, token: str) -> tuple[User, str]:
        """Valide un refresh token, le révoque et en émet un nouveau.

        Si un token déjà révoqué est présenté, il a été rejoué (vol probable) :
        toutes les sessions de l'utilisateur sont révoquées.
        """
        session = await self.sessions.get_by_token_hash(hash_refresh_token(token))
        if session is None:
            raise InvalidRefreshTokenError
        if session.revoked_at is not None:
            await self.sessions.revoke_all_for_user(session.user_id)
            await self.db.commit()
            logger.warning(
                "refresh token reuse detected, all sessions revoked",
                extra={"user_id": str(session.user_id)},
            )
            raise InvalidRefreshTokenError
        if session.expires_at.replace(tzinfo=UTC) < datetime.now(UTC):
            raise InvalidRefreshTokenError
        user = await self.users.get_by_id(session.user_id)
        if user is None or not user.is_active:
            raise InvalidRefreshTokenError

        await self.sessions.revoke(session)
        new_token = await self.issue_refresh_token(user.id)
        return user, new_token

    async def revoke_refresh_token(self, token: str) -> None:
        session = await self.sessions.get_by_token_hash(hash_refresh_token(token))
        if session is not None and session.revoked_at is None:
            await self.sessions.revoke(session)
            await self.db.commit()
