from typing import Literal

from fastapi import APIRouter, Depends, HTTPException
from neo4j import AsyncDriver
from pydantic import BaseModel

from src.lib.auth.jwt import get_current_user
from src.lib.db.neo4j import get_driver
from src.lib.repositories.course_repository import CourseRepository
from src.lib.repositories.notebook_repository import NotebookRepository

router = APIRouter()


class TagRequest(BaseModel):
    type: Literal["prerequisite", "relates-to"]
    course_code: str


# ---------------------------------------------------------------------------
# Courses
# ---------------------------------------------------------------------------

@router.get("/courses")
async def list_courses(driver: AsyncDriver = Depends(get_driver)):
    """Return all Course nodes."""
    async with driver.session() as session:
        result = await session.run(
            "MATCH (c:Course) RETURN c ORDER BY c.name"
        )
        return [dict(record["c"]) async for record in result]


# ---------------------------------------------------------------------------
# Notebook tag system
# Tags live on Course nodes (not Notebook nodes).  All notebooks sharing the
# same course_code inherit the relationship automatically.
# ---------------------------------------------------------------------------

@router.post("/notebooks/{notebook_id}/tags", status_code=201)
async def add_notebook_tag(
    notebook_id: str,
    body: TagRequest,
    driver: AsyncDriver = Depends(get_driver),
    current_user: str = Depends(get_current_user),
):
    """Write a PREREQUISITE_OF or RELATES_TO edge at the Course level.

    type="prerequisite": body.course_code is a prerequisite of the notebook's
    course (i.e. body.course_code → PREREQUISITE_OF → notebook course).
    type="relates-to":  bidirectional RELATES_TO between the two courses.
    """
    notebook = await NotebookRepository(driver).get_by_id(notebook_id)
    if notebook is None:
        raise HTTPException(status_code=404, detail="Notebook not found")
    if notebook["owner_id"] != current_user:
        raise HTTPException(status_code=403, detail="Not authorized")

    nb_course = notebook["course_code"]
    course_repo = CourseRepository(driver)

    # Ensure both Course nodes exist before creating the edge.
    await course_repo.create_or_merge(nb_course, nb_course)
    await course_repo.create_or_merge(body.course_code, body.course_code)

    if body.type == "prerequisite":
        await course_repo.add_prerequisite(
            from_code=body.course_code, to_code=nb_course
        )
    else:
        await course_repo.add_relates_to(
            from_code=nb_course, to_code=body.course_code, weight=1.0
        )

    return {
        "notebook_id": notebook_id,
        "type": body.type,
        "course_code": body.course_code,
    }


@router.delete("/notebooks/{notebook_id}/tags/{tag}", status_code=204)
async def remove_notebook_tag(
    notebook_id: str,
    tag: str,
    driver: AsyncDriver = Depends(get_driver),
    current_user: str = Depends(get_current_user),
):
    """Remove all PREREQUISITE_OF and RELATES_TO edges between the notebook's
    course and the course identified by {tag} (a course_code).
    """
    notebook = await NotebookRepository(driver).get_by_id(notebook_id)
    if notebook is None:
        raise HTTPException(status_code=404, detail="Notebook not found")
    if notebook["owner_id"] != current_user:
        raise HTTPException(status_code=403, detail="Not authorized")

    nb_course = notebook["course_code"]

    async with driver.session() as session:
        await session.run(
            """
            MATCH (a:Course {code: $nb_course})-[r:PREREQUISITE_OF|RELATES_TO]-(b:Course {code: $tag})
            DELETE r
            """,
            nb_course=nb_course,
            tag=tag,
        )
