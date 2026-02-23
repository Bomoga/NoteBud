from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from src.lib.config.settings import settings
from src.api.routers import health

app = FastAPI(
    title = settings.PROJECT_NAME,
    open_api_url = f"{settings.API_V1_STR}.openapi.json"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins = ["http://localhost:3000", 
                     "http://127.0.0.1:3000"],
    allow_credentials = True,
    allow_methods = ["*"],
    allow_headers = ["*"]
)

app.include_router(
    health.router,
    prefix=f"{settings.API_V1_STR}",
    tags=["System"]
)

@app.get("/")
async def root():
    return {"message": f"Welcome to the {settings.PROJECT_NAME}"}