from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.lib.models.notebook import Notebook
from src.lib.schemas.notebook import NotebookCreate, NotebookRead, NotebookUpdate

async def create_notebook(db: AsyncSession, data: NotebookCreate) -> NotebookRead:
    notebook = Notebook(
        title=data.title,
        course_code=data.course_code,
        description=data.description
    )
    db.add(notebook)
    try:
        await db.commit()
        await db.refresh(notebook)
    except Exception:
        await db.rollback()
        raise
    return NotebookRead.model_validate(notebook)


async def get_all_notebooks(db: AsyncSession) -> list[NotebookRead]:
    result = await db.execute(select(Notebook))
    notebooks = result.scalars().all()
    return [NotebookRead.model_validate(n) for n in notebooks]


async def get_notebook_by_id(db: AsyncSession, notebook_id: int) -> NotebookRead | None:
    result = await db.execute(select(Notebook).where(Notebook.id == notebook_id))
    notebook = result.scalar_one_or_none()
    if notebook is None:
        return None
    return NotebookRead.model_validate(notebook)


async def update_notebook(db: AsyncSession, notebook_id: int, data: NotebookUpdate) -> NotebookRead | None:
    result = await db.execute(select(Notebook).where(Notebook.id == notebook_id))
    notebook = result.scalar_one_or_none()
    if notebook is None:
        return None
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(notebook, field, value)
    try:
        await db.commit()
        await db.refresh(notebook)
    except Exception:
        await db.rollback()
        raise
    return NotebookRead.model_validate(notebook)


async def delete_notebook(db: AsyncSession, notebook_id: int) -> bool:
    result = await db.execute(select(Notebook).where(Notebook.id == notebook_id))
    notebook = result.scalar_one_or_none()
    if notebook is None:
        return False
    try:
        await db.delete(notebook)
        await db.commit()
    except Exception:
        await db.rollback()
        raise
    return True
