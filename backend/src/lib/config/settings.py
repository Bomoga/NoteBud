from pydantic_settings import BaseSettings, SettingsConfigDict
import os

class Settings(BaseSettings):
    ENVIRONMENT: str = "development"
    PROJECT_NAME: str = "NoteBud API"
    API_V1_STR: str = "/api/v1"

    NEO4J_URI: str = "bolt://localhost:7687"
    NEO4J_USERNAME: str = "neo4j"
    NEO4J_PASSWORD: str = "notebud_password"

    GCS_BUCKET_NAME: str = "notebud-dev-bucket"
    GOOGLE_APPLICATION_CREDENTIALS: str = "./service-account-key.json"

    model_config = SettingsConfigDict(
        env_file=(".env", f".env.{os.getenv('ENVIRONMENT', 'development')}"),
        env_file_encoding="utf-8",
    )

settings = Settings()