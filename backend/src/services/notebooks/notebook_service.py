from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.lib.models.notebook import Notebook
from src.lib.schemas.notebook import NotebookCreate, NotebookRead

async def create_notebook(db: AsyncSession, data: NotebookCreate) -> NotebookRead:
    notebook = Notebook(
        title=data.title,
        course_code=data.course_code,
        description=data.description
    )
    db.add(notebook)
    await db.commit()
    await db.refresh(notebook)
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
