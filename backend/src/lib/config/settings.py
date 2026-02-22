from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "NoteBud API"
    API_V1_STR: str = "/api/v1"

    POSTGRES_USER: str = "notebud"
    POSTGRES_PASSWORD: str = "notebud_password1228"
    POSTGRES_SERVER: str = "localhost"
    POSTGRES_PORT: str = "5433"
    POSTGRES_DB: str = "notebud_dev"

    @property
    def DATABASE_URL(self) -> str:
        return f"postgresql+asyncpg://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}@{self.POSTGRES_SERVER}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"

    class Config:
        env_file = ".env.development"

settings = Settings()