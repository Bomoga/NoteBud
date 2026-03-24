from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from src.lib.config.settings import settings
from src.lib.db.neo4j import startup, close_driver
from src.api.routers import health, files, notebooks, query


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
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
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
    query.router,
    prefix=f"{settings.API_V1_STR}/notebooks",
    tags=["Query"],
)


@app.get("/")
async def root():
    return {"message": f"Welcome to the {settings.PROJECT_NAME}"}