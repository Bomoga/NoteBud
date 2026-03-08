from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
from sqlalchemy.orm import declarative_base
from src.lib.config.settings import settings

engine = create_async_engine(
    settings.DATABASE_URL,
    echo = True,
    future = True
)

AsyncSessionLocal = async_sessionmaker(
    bind = engine,
    autoflush = False,
    expire_on_commit = False
)

Base = declarative_base()

async def get_db():
    async with AsyncSessionLocal() as session:
        yield session

from src.lib.models.notebook import Notebook

