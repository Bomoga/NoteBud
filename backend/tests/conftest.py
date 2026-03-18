import pytest
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from src.lib.config.settings import settings
from src.lib.models.notebook import Notebook


@pytest.fixture
async def db_session():
    """Provide a test database session with cleanup after each test."""
    test_engine = create_async_engine(settings.DATABASE_URL, echo=False)
    session = AsyncSession(bind=test_engine, expire_on_commit=False)

    # Create test notebooks for FK constraints
    nb1 = Notebook(id=99901, title="Test Notebook 1", course_code="TEST101")
    nb2 = Notebook(id=99902, title="Test Notebook 2", course_code="TEST102")
    session.add_all([nb1, nb2])
    await session.commit()

    yield session

    # Cleanup: rollback any failed transaction, then delete test data
    await session.rollback()
    await session.execute(text("DELETE FROM chunks WHERE notebook_id IN (99901, 99902)"))
    await session.execute(text("DELETE FROM notebooks WHERE id IN (99901, 99902)"))
    await session.commit()
    await session.close()
    await test_engine.dispose()
