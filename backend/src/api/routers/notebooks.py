from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from src.lib.db.session import get_db
from src.lib.schemas.notebook import NotebookCreate, NotebookRead
from src.services.notebooks.notebook_service import (
    create_notebook,
    get_all_notebooks,
    get_notebook_by_id,
)

router = APIRouter()


@router.post("", response_model=NotebookRead, status_code=201)
async def create_notebook_endpoint(data: NotebookCreate, db: AsyncSession = Depends(get_db)):
    return await create_notebook(db, data)


@router.get("", response_model=list[NotebookRead], status_code=200)
async def list_notebooks_endpoint(db: AsyncSession = Depends(get_db)):
    return await get_all_notebooks(db)


@router.get("/{notebook_id}", response_model=NotebookRead, status_code=200)
async def get_notebook_endpoint(notebook_id: int, db: AsyncSession = Depends(get_db)):
    notebook = await get_notebook_by_id(db, notebook_id)
    if notebook is None:
        raise HTTPException(status_code=404, detail="Notebook not found")
    return notebook
