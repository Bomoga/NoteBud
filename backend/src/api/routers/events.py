from fastapi import APIRouter, Depends, HTTPException, status
from neo4j import AsyncDriver

from src.lib.auth.jwt import get_current_user
from src.lib.db.neo4j import get_driver
from src.lib.repositories.event_repository import CalendarEventRepository
from src.lib.schemas.event import CalendarEventCreate, CalendarEventUpdate, CalendarEventRead

router = APIRouter()


def get_repo(driver: AsyncDriver = Depends(get_driver)) -> CalendarEventRepository:
    return CalendarEventRepository(driver)


@router.get("", response_model=list[CalendarEventRead])
async def list_events(
    repo: CalendarEventRepository = Depends(get_repo),
    current_user: str = Depends(get_current_user),
):
    return await repo.list(owner_id=current_user)


@router.post("", response_model=CalendarEventRead, status_code=status.HTTP_201_CREATED)
async def create_event(
    data: CalendarEventCreate,
    repo: CalendarEventRepository = Depends(get_repo),
    current_user: str = Depends(get_current_user),
):
    return await repo.create(data, owner_id=current_user)


@router.patch("/{event_id}", response_model=CalendarEventRead)
async def update_event(
    event_id: str,
    data: CalendarEventUpdate,
    repo: CalendarEventRepository = Depends(get_repo),
    current_user: str = Depends(get_current_user),
):
    result = await repo.update(event_id, data, owner_id=current_user)
    if result is None:
        raise HTTPException(status_code=404, detail="Event not found")
    return result


@router.delete("/{event_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_event(
    event_id: str,
    repo: CalendarEventRepository = Depends(get_repo),
    current_user: str = Depends(get_current_user),
):
    deleted = await repo.delete(event_id, owner_id=current_user)
    if not deleted:
        raise HTTPException(status_code=404, detail="Event not found")
