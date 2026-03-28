import os

from pydantic import AliasChoices, Field, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

_JWT_DEV_PLACEHOLDER = "dev-jwt-secret-change-in-production"


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

    JWT_SECRET: str = _JWT_DEV_PLACEHOLDER

    ALLOWED_ORIGINS: list[str] = ["http://localhost:3000", "http://127.0.0.1:3000"]

    # Optional until embedding / LLM paths are wired; omit or leave placeholder for local CRUD-only dev.
    gemini_api_key: str | None = Field(
        default=None,
        validation_alias=AliasChoices("GEMINI_API_KEY", "gemini_api_key"),
    )

    model_config = SettingsConfigDict(
        env_file=(".env", f".env.{os.getenv('ENVIRONMENT', 'development')}"),
        env_file_encoding="utf-8",
    )

    @model_validator(mode="after")
    def _require_strong_jwt_secret_in_prod(self) -> "Settings":
        if self.ENVIRONMENT != "development" and self.JWT_SECRET == _JWT_DEV_PLACEHOLDER:
            raise ValueError(
                "JWT_SECRET must be set to a strong secret in non-development environments."
            )
        return self

settings = Settings()