from pydantic import AliasChoices, Field
from pydantic_settings import BaseSettings, SettingsConfigDict
import os

class Settings(BaseSettings):
    ENVIRONMENT: str = "development"
    PROJECT_NAME: str = "NoteBud API"
    API_V1_STR: str = "/api/v1"

    NEO4J_URI: str = Field(
        default="bolt://localhost:7687",
        validation_alias=AliasChoices("NEO4J_URI", "NEO4J_BOLT_URL"),
    )
    NEO4J_USERNAME: str = Field(
        default="neo4j",
        validation_alias=AliasChoices("NEO4J_USERNAME", "NEO4J_USER"),
    )
    NEO4J_PASSWORD: str = Field(
        default="notebud_password",
        validation_alias=AliasChoices("NEO4J_PASSWORD", "NEO4J_PASS"),
    )

    GCS_BUCKET_NAME: str = "notebud-dev-bucket"
    GOOGLE_APPLICATION_CREDENTIALS: str = "./service-account-key.json"

    model_config = SettingsConfigDict(
        env_file=(".env", f".env.{os.getenv('ENVIRONMENT', 'development')}"),
        env_file_encoding="utf-8",
    )

settings = Settings()