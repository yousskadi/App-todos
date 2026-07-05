from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.db.session import get_db
from app.middleware.rate_limit import limiter
from app.schemas.auth import AccessTokenOut, LoginRequest, RegisterRequest, UserOut
from app.security.deps import CurrentUser
from app.security.tokens import create_access_token
from app.services.auth import (
    AuthService,
    EmailAlreadyRegisteredError,
    InvalidCredentialsError,
    InvalidRefreshTokenError,
)

router = APIRouter(prefix="/auth", tags=["auth"])

REFRESH_COOKIE = "refresh_token"
# Cookie envoyé uniquement vers les endpoints d'auth : il ne circule
# sur aucune autre requête, ce qui réduit la surface d'exposition.
REFRESH_COOKIE_PATH = "/api/v1/auth"

DbSession = Annotated[AsyncSession, Depends(get_db)]


def _set_refresh_cookie(response: Response, token: str) -> None:
    settings = get_settings()
    response.set_cookie(
        key=REFRESH_COOKIE,
        value=token,
        max_age=settings.refresh_token_expire_days * 24 * 3600,
        path=REFRESH_COOKIE_PATH,
        httponly=True,
        secure=settings.cookie_secure,
        samesite="strict",
    )


def _delete_refresh_cookie(response: Response) -> None:
    response.delete_cookie(key=REFRESH_COOKIE, path=REFRESH_COOKIE_PATH)


@router.post("/register", response_model=UserOut, status_code=status.HTTP_201_CREATED)
@limiter.limit("5/minute")
async def register(request: Request, payload: RegisterRequest, db: DbSession) -> UserOut:
    try:
        user = await AuthService(db).register(
            email=payload.email,
            password=payload.password,
            display_name=payload.display_name,
        )
    except EmailAlreadyRegisteredError:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Cet email est déjà utilisé",
        ) from None
    return UserOut.model_validate(user)


@router.post("/login", response_model=AccessTokenOut)
@limiter.limit("5/minute")
async def login(
    request: Request, payload: LoginRequest, response: Response, db: DbSession
) -> AccessTokenOut:
    service = AuthService(db)
    try:
        user = await service.authenticate(payload.email, payload.password)
    except InvalidCredentialsError:
        # Message unique : ne révèle pas si l'email existe
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email ou mot de passe incorrect",
        ) from None
    refresh_token = await service.issue_refresh_token(user.id)
    _set_refresh_cookie(response, refresh_token)
    return AccessTokenOut(
        access_token=create_access_token(user.id), user=UserOut.model_validate(user)
    )


@router.post("/refresh", response_model=AccessTokenOut)
@limiter.limit("30/minute")
async def refresh(request: Request, response: Response, db: DbSession) -> AccessTokenOut:
    token = request.cookies.get(REFRESH_COOKIE)
    if token is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Session expirée")
    try:
        user, new_token = await AuthService(db).rotate_refresh_token(token)
    except InvalidRefreshTokenError:
        _delete_refresh_cookie(response)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Session expirée"
        ) from None
    _set_refresh_cookie(response, new_token)
    return AccessTokenOut(
        access_token=create_access_token(user.id), user=UserOut.model_validate(user)
    )


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout(request: Request, response: Response, db: DbSession) -> None:
    token = request.cookies.get(REFRESH_COOKIE)
    if token is not None:
        await AuthService(db).revoke_refresh_token(token)
    _delete_refresh_cookie(response)


@router.get("/me", response_model=UserOut)
async def me(current_user: CurrentUser) -> UserOut:
    return UserOut.model_validate(current_user)
