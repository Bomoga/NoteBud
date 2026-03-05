from pydantic_settings import BaseSettings, SettingsConfigDict
import os

class Settings(BaseSettings):
    ENVIRONMENT: str = "development"
    PROJECT_NAME: str = "NoteBud API"
    API_V1_STR: str = "/api/v1"

    POSTGRES_USER: str = "notebud"
    POSTGRES_PASSWORD: str = "notebud_password1228"
    POSTGRES_SERVER: str = "localhost"
    POSTGRES_PORT: str = "5433"
    POSTGRES_DB: str = "notebud_dev"

    GCS_BUCKET_NAME: str = "notebud-dev-bucket"
    GOOGLE_APPLICATION_CREDENTIALS: str = "./service-account-key.json"

    @property
    def DATABASE_URL(self) -> str:
        return f"postgresql+asyncpg://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}@{self.POSTGRES_SERVER}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"

    model_config = SettingsConfigDict(env_file=f".env.{os.getenv('ENVIRONMENT', 'development')}", env_file_encoding="utf-8")

settings = Settings()