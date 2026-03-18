import pytest
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from src.lib.config.settings import settings
from src.lib.models.notebook import Notebook


@pytest.fixture
async def db_session():
    """Provide a test database session with dynamic test data and cleanup."""
    test_engine = create_async_engine(settings.DATABASE_URL, echo=False)
    session = AsyncSession(bind=test_engine, expire_on_commit=False)

    # Create test notebooks with auto-generated IDs
    nb1 = Notebook(title="Test Notebook 1", course_code="TEST101")
    nb2 = Notebook(title="Test Notebook 2", course_code="TEST102")
    session.add_all([nb1, nb2])
    await session.commit()

    # Capture IDs before they can expire
    nb1_id, nb2_id = nb1.id, nb2.id
    session.test_notebook_ids = (nb1_id, nb2_id)

    yield session

    # Cleanup: rollback any failed transaction, then delete test data
    await session.rollback()
    await session.execute(
        text("DELETE FROM chunks WHERE notebook_id IN (:id1, :id2)"),
        {"id1": nb1_id, "id2": nb2_id},
    )
    await session.execute(
        text("DELETE FROM notebooks WHERE id IN (:id1, :id2)"),
        {"id1": nb1_id, "id2": nb2_id},
    )
    await session.commit()
    await session.close()
    await test_engine.dispose()
