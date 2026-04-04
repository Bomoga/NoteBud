from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from neo4j import AsyncDriver

from src.lib.auth.jwt import get_current_user
from src.lib.db.neo4j import get_driver
from src.lib.repositories.note_chunk_repository import NoteChunkRepository
from src.lib.repositories.note_repository import NoteRepository
from src.lib.repositories.notebook_repository import NotebookRepository
from src.lib.schemas.note import NoteCreate, NoteRead, NoteUpdate
from src.services.ingestion.note_ingestion_service import ingest_note

router = APIRouter()


def get_repo(driver: AsyncDriver = Depends(get_driver)) -> NoteRepository:
    return NoteRepository(driver)


def get_notebook_repo(driver: AsyncDriver = Depends(get_driver)) -> NotebookRepository:
    return NotebookRepository(driver)


def get_note_chunk_repo(driver: AsyncDriver = Depends(get_driver)) -> NoteChunkRepository:
    return NoteChunkRepository(driver)


@router.post("/{notebook_id}/notes", response_model=NoteRead, status_code=201)
async def create_note_endpoint(
    notebook_id: str,
    data: NoteCreate,
    background_tasks: BackgroundTasks,
    repo: NoteRepository = Depends(get_repo),
    notebook_repo: NotebookRepository = Depends(get_notebook_repo),
    driver: AsyncDriver = Depends(get_driver),
    current_user: str = Depends(get_current_user),
):
    notebook = await notebook_repo.get_by_id(notebook_id)
    if notebook is None:
        raise HTTPException(status_code=404, detail="Notebook not found")
    if notebook["owner_id"] != current_user:
        raise HTTPException(status_code=403, detail="Forbidden")
    note = await repo.create(notebook_id, data, owner_id=current_user)
    if note is None:
        raise HTTPException(status_code=404, detail="Notebook not found")
    if note["content"]:
        background_tasks.add_task(
            ingest_note,
            driver, note["id"], note["title"], note["content"], notebook_id,
        )
    return note


@router.get("/{notebook_id}/notes", response_model=list[NoteRead], status_code=200)
async def list_notes_endpoint(
    notebook_id: str,
    repo: NoteRepository = Depends(get_repo),
    notebook_repo: NotebookRepository = Depends(get_notebook_repo),
    current_user: str = Depends(get_current_user),
):
    notebook = await notebook_repo.get_by_id(notebook_id)
    if notebook is None:
        raise HTTPException(status_code=404, detail="Notebook not found")
    if notebook["owner_id"] != current_user:
        raise HTTPException(status_code=403, detail="Not authorized")
    return await repo.list(notebook_id)


@router.get("/{notebook_id}/notes/{note_id}", response_model=NoteRead, status_code=200)
async def get_note_endpoint(
    notebook_id: str,
    note_id: str,
    repo: NoteRepository = Depends(get_repo),
    notebook_repo: NotebookRepository = Depends(get_notebook_repo),
    current_user: str = Depends(get_current_user),
):
    notebook = await notebook_repo.get_by_id(notebook_id)
    if notebook is None:
        raise HTTPException(status_code=404, detail="Notebook not found")
    note = await repo.get_by_id(note_id)
    if note is None:
        raise HTTPException(status_code=404, detail="Note not found")
    if note["owner_id"] != current_user:
        raise HTTPException(status_code=403, detail="Not authorized")
    if note.get("notebook_id") != notebook_id:
        raise HTTPException(status_code=404, detail="Note not found")
    return note


@router.patch("/{notebook_id}/notes/{note_id}", response_model=NoteRead, status_code=200)
async def update_note_endpoint(
    notebook_id: str,
    note_id: str,
    data: NoteUpdate,
    background_tasks: BackgroundTasks,
    repo: NoteRepository = Depends(get_repo),
    driver: AsyncDriver = Depends(get_driver),
    current_user: str = Depends(get_current_user),
):
    existing = await repo.get_by_id(note_id)
    if existing is None:
        raise HTTPException(status_code=404, detail="Note not found")
    if existing["notebook_id"] != notebook_id:
        raise HTTPException(status_code=404, detail="Note not found")
    if existing["owner_id"] != current_user:
        raise HTTPException(status_code=403, detail="Not authorized")
    updated = await repo.update(note_id, data)
    if updated is None:
        raise HTTPException(status_code=404, detail="Note not found")
    if "content" in data.model_dump(exclude_unset=True):
        background_tasks.add_task(
            ingest_note,
            driver, note_id, updated["title"], updated["content"], notebook_id,
        )
    return updated


@router.delete("/{notebook_id}/notes/{note_id}", status_code=204)
async def delete_note_endpoint(
    notebook_id: str,
    note_id: str,
    repo: NoteRepository = Depends(get_repo),
    note_chunk_repo: NoteChunkRepository = Depends(get_note_chunk_repo),
    current_user: str = Depends(get_current_user),
):
    existing = await repo.get_by_id(note_id)
    if existing is None:
        raise HTTPException(status_code=404, detail="Note not found")
    if existing["notebook_id"] != notebook_id:
        raise HTTPException(status_code=404, detail="Note not found")
    if existing["owner_id"] != current_user:
        raise HTTPException(status_code=403, detail="Not authorized")
    await note_chunk_repo.delete_by_note(note_id)
    await repo.delete(note_id)
