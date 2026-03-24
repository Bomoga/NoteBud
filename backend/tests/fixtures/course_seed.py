"""
TEST FIXTURE ONLY — this data never ships to production.

Production course relationships are exclusively user-defined via notebook
tags (POST /api/v1/notebooks/{id}/tags, implemented in S3-23).
"""
from src.lib.repositories.course_repository import CourseRepository


async def seed_courses(driver) -> None:
    """Seed a curriculum graph for use in tests."""
    repo = CourseRepository(driver)

    # --- Mathematics ---
    await repo.create_or_merge("CALC1",     "Calculus 1",             subject="Mathematics")
    await repo.create_or_merge("CALC2",     "Calculus 2",             subject="Mathematics")
    await repo.create_or_merge("MULTICALC", "Multivariable Calculus", subject="Mathematics")
    await repo.create_or_merge("PHYS1",     "Physics with Calculus",  subject="Mathematics")
    await repo.create_or_merge("LINALG",    "Linear Algebra",         subject="Mathematics")

    await repo.add_prerequisite(from_code="CALC1", to_code="CALC2")
    await repo.add_prerequisite(from_code="CALC2", to_code="MULTICALC")
    await repo.add_relates_to("CALC2", "PHYS1",  weight=1.0)
    await repo.add_relates_to("PHYS1", "LINALG", weight=1.0)

    # --- Computer Science ---
    await repo.create_or_merge("DS",    "Data Structures",      subject="Computer Science")
    await repo.create_or_merge("ALGO",  "Algorithms",           subject="Computer Science")
    await repo.create_or_merge("DISCM", "Discrete Mathematics", subject="Computer Science")

    await repo.add_prerequisite(from_code="DS",   to_code="ALGO")
    await repo.add_relates_to("ALGO", "DISCM", weight=1.0)
