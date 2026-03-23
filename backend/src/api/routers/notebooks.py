from fastapi import APIRouter, HTTPException
from src.lib.schemas.notebook import NotebookCreate, NotebookRead, NotebookUpdate

router = APIRouter()

# Stubbed endpoints — full implementation in S3-21 (NotebookRepository).
# Path params changed from int to str (Option A schema fix).


@router.post("", response_model=NotebookRead, status_code=201)
async def create_notebook_endpoint(data: NotebookCreate):
    raise HTTPException(status_code=501, detail="Not implemented — pending S3-21")


@router.get("", response_model=list[NotebookRead], status_code=200)
async def list_notebooks_endpoint():
    raise HTTPException(status_code=501, detail="Not implemented — pending S3-21")


@router.get("/{notebook_id}", response_model=NotebookRead, status_code=200)
async def get_notebook_endpoint(notebook_id: str):
    raise HTTPException(status_code=501, detail="Not implemented — pending S3-21")


@router.patch("/{notebook_id}", response_model=NotebookRead, status_code=200)
async def update_notebook_endpoint(notebook_id: str, data: NotebookUpdate):
    raise HTTPException(status_code=501, detail="Not implemented — pending S3-21")


@router.delete("/{notebook_id}", status_code=204)
async def delete_notebook_endpoint(notebook_id: str):
    raise HTTPException(status_code=501, detail="Not implemented — pending S3-21")