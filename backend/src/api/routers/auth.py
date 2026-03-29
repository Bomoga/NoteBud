import datetime

import jwt
from fastapi import APIRouter, Depends, HTTPException, status
from neo4j import AsyncDriver
from pydantic import BaseModel

from src.lib.config.settings import settings
from src.lib.db.neo4j import get_driver
from src.lib.repositories.user_repository import UserRepository
from src.lib.auth.password import pwd_context

router = APIRouter()


class RegisterRequest(BaseModel):
    username: str
    password: str


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
    if not body.username.strip() or not body.password:
        raise HTTPException(status_code=400, detail="Username and password are required.")
    hashed = pwd_context.hash(body.password)
    try:
        user = await user_repo.create_user(body.username.strip(), hashed)
    except ValueError as e:
        raise HTTPException(status_code=409, detail=str(e))
    return {"id": user["id"], "username": user["username"]}


@router.post("/token", response_model=TokenResponse)
async def login(
    body: RegisterRequest,
    user_repo: UserRepository = Depends(get_user_repo),
):
    user = await user_repo.get_by_username(body.username.strip())
    if user is None or not pwd_context.verify(body.password, user["hashed_password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    payload = {
        "sub": user["id"],
        "exp": datetime.datetime.now(datetime.UTC) + datetime.timedelta(hours=24),
    }
    token = jwt.encode(payload, settings.JWT_SECRET, algorithm="HS256")
    return TokenResponse(access_token=token)
