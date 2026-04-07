from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from src.lib.config.settings import settings
from src.lib.db.neo4j import startup, close_driver
from src.api.routers import health, files, notebooks, notes, query, chat, courses, auth, users


@asynccontextmanager
async def lifespan(app: FastAPI):
    await startup()
    yield
    await close_driver()


app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(
    auth.router,
    prefix=f"{settings.API_V1_STR}/auth",
    tags=["Auth"],
)

app.include_router(
    health.router,
    prefix=f"{settings.API_V1_STR}",
    tags=["System"],
)

app.include_router(
    files.router,
    prefix=f"{settings.API_V1_STR}/files",
    tags=["Files"],
)

app.include_router(
    notebooks.router,
    prefix=f"{settings.API_V1_STR}/notebooks",
    tags=["Notebooks"],
)

app.include_router(
    notes.router,
    prefix=f"{settings.API_V1_STR}/notebooks",
    tags=["Notes"],
)

app.include_router(
    query.router,
    prefix=f"{settings.API_V1_STR}/notebooks",
    tags=["Query"],
)

app.include_router(
    chat.router,
    prefix=f"{settings.API_V1_STR}/notebooks",
    tags=["Chat"],
)

app.include_router(
    courses.router,
    prefix=f"{settings.API_V1_STR}",
    tags=["Courses"],
)


app.include_router(
    users.router,
    prefix=f"{settings.API_V1_STR}/users",
    tags=["Users"],
)


@app.get("/")
async def root():
    return {"message": f"Welcome to the {settings.PROJECT_NAME}"}