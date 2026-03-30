import datetime
import re

import jwt
from fastapi import APIRouter, Depends, HTTPException, status
from neo4j import AsyncDriver
from pydantic import BaseModel, field_validator

from src.lib.config.settings import settings
from src.lib.db.neo4j import get_driver
from src.lib.repositories.user_repository import UserRepository
from src.lib.auth.password import pwd_context

router = APIRouter()

_USERNAME_RE = re.compile(r"^[a-zA-Z0-9_-]+$")


class RegisterRequest(BaseModel):
    username: str
    password: str

    @field_validator("username")
    @classmethod
    def username_rules(cls, v: str) -> str:
        s = v.strip()
        if len(s) < 3:
            raise ValueError("Username must be at least 3 characters.")
        if len(s) > 32:
            raise ValueError("Username must be at most 32 characters.")
        if not _USERNAME_RE.fullmatch(s):
            raise ValueError(
                "Username may only contain letters, digits, underscores, and hyphens."
            )
        return s

    @field_validator("password")
    @classmethod
    def password_rules(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters.")
        if len(v) > 128:
            raise ValueError("Password must be at most 128 characters.")
        if not re.search(r"[A-Za-z]", v):
            raise ValueError("Password must contain at least one letter.")
        if not re.search(r"\d", v):
            raise ValueError("Password must contain at least one number.")
        return v


class LoginRequest(BaseModel):
    """Login accepts any non-empty password so existing accounts are not locked out."""

    username: str
    password: str

    @field_validator("username")
    @classmethod
    def username_nonempty(cls, v: str) -> str:
        s = v.strip()
        if not s:
            raise ValueError("Username is required.")
        return s

    @field_validator("password")
    @classmethod
    def password_nonempty(cls, v: str) -> str:
        s = v.strip()
        if not s:
            raise ValueError("Password is required.")
        return v


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


def get_user_repo(driver: AsyncDriver = Depends(get_driver)) -> UserRepository:
    return UserRepository(driver)


@router.post("/register", status_code=201)
async def register(
    body: RegisterRequest,
    user_repo: UserRepository = Depends(get_user_repo),
):
    hashed = pwd_context.hash(body.password)
    try:
        user = await user_repo.create_user(body.username, hashed)
    except ValueError as e:
        raise HTTPException(status_code=409, detail=str(e))
    return {"id": user["id"], "username": user["username"]}


@router.post("/token", response_model=TokenResponse)
async def login(
    body: LoginRequest,
    user_repo: UserRepository = Depends(get_user_repo),
):
    user = await user_repo.get_by_username(body.username)
    if user is None or not pwd_context.verify(body.password, user["hashed_password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    payload = {
        "sub": user["id"],
        "username": user["username"],
        "exp": datetime.datetime.now(datetime.UTC) + datetime.timedelta(hours=24),
    }
    token = jwt.encode(payload, settings.JWT_SECRET, algorithm="HS256")
    return TokenResponse(access_token=token)
