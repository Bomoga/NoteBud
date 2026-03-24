"""
TEST FIXTURE ONLY — this data never ships to production.

Production course relationships are exclusively user-defined via notebook
tags (implemented in S3-23).  This module exists solely to provide a
deterministic course graph for automated tests.

Usage in a pytest fixture:

    from tests.fixtures.course_seed import seed_courses

    @pytest.fixture(scope="session")
    async def seeded_courses(neo4j_driver):
        await seed_courses(neo4j_driver)
"""
from neo4j import AsyncDriver

from src.lib.repositories.course_repository import CourseRepository


async def seed_courses(driver: AsyncDriver) -> None:
    """Seed a deterministic course graph for use in tests.

    Graph seeded
    ─────────────
    Subject: Mathematics
      CALC1  Calculus 1
      CALC2  Calculus 2               PREREQUISITE_OF → CALC1
      CALC3  Multivariable Calculus   PREREQUISITE_OF → CALC2
      CALC2  RELATES_TO  PHYS1
      PHYS1  Physics with Calculus    RELATES_TO  LINALG
      LINALG Linear Algebra

    Subject: Computer Science
      DS     Data Structures
      ALGO   Algorithms               PREREQUISITE_OF → DS
      ALGO   RELATES_TO  DISCMATH
      DISCMATH  Discrete Mathematics
    """
    repo = CourseRepository(driver)

    # --- Mathematics ---
    await repo.create_or_merge("CALC1",  "Calculus 1",               subject="Mathematics")
    await repo.create_or_merge("CALC2",  "Calculus 2",               subject="Mathematics")
    await repo.create_or_merge("CALC3",  "Multivariable Calculus",   subject="Mathematics")
    await repo.create_or_merge("PHYS1",  "Physics with Calculus",    subject="Mathematics")
    await repo.create_or_merge("LINALG", "Linear Algebra",           subject="Mathematics")

    await repo.add_prerequisite("CALC1", "CALC2")   # Calc 1 is a prereq of Calc 2
    await repo.add_prerequisite("CALC2", "CALC3")   # Calc 2 is a prereq of Multivariable

    await repo.add_relates_to("CALC2",  "PHYS1",  weight=1.0)
    await repo.add_relates_to("PHYS1",  "LINALG", weight=1.0)

    # --- Computer Science ---
    await repo.create_or_merge("DS",       "Data Structures",     subject="Computer Science")
    await repo.create_or_merge("ALGO",     "Algorithms",          subject="Computer Science")
    await repo.create_or_merge("DISCMATH", "Discrete Mathematics",subject="Computer Science")

    await repo.add_prerequisite("DS",   "ALGO")      # Data Structures is a prereq of Algorithms
    await repo.add_relates_to("ALGO", "DISCMATH", weight=1.0)
