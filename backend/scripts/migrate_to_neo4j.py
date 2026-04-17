#!/usr/bin/env python3
"""
Structural migration verification: Postgres → Neo4j.

The Postgres database has no existing data — tables exist but are empty.
This script verifies structure only and is fully idempotent (safe to run
multiple times).

Run from backend/:
    python -m scripts.migrate_to_neo4j
"""
import asyncio
import os
import sys

import psycopg2

from src.lib.db.neo4j import get_driver, startup as neo4j_startup


# ---------------------------------------------------------------------------
# Connection config — override via environment variables if needed
# ---------------------------------------------------------------------------
POSTGRES_DSN = os.getenv(
    "POSTGRES_DSN",
    "host=localhost port=5433 dbname=notebud_dev user=notebud password=notebud_password1228",
)


# ---------------------------------------------------------------------------
# Postgres checks (synchronous — psycopg2 only)
# ---------------------------------------------------------------------------

def check_postgres() -> tuple[bool, dict[str, str], list[str]]:
    """Verify Postgres connection and confirm expected tables exist."""
    table_status: dict[str, str] = {}
    errors: list[str] = []

    try:
        conn = psycopg2.connect(POSTGRES_DSN)
        conn.autocommit = True
        cur = conn.cursor()

        for table in ("notebooks", "chunks"):
            cur.execute(
                "SELECT EXISTS ("
                "  SELECT 1 FROM information_schema.tables"
                "  WHERE table_schema = 'public' AND table_name = %s"
                ")",
                (table,),
            )
            exists = cur.fetchone()[0]
            table_status[table] = "EXISTS" if exists else "MISSING"

        cur.close()
        conn.close()
        connected = True
    except Exception as exc:
        connected = False
        errors.append(f"Postgres connection failed: {exc}")

    return connected, table_status, errors


# ---------------------------------------------------------------------------
# Neo4j checks (async)
# ---------------------------------------------------------------------------

async def check_neo4j() -> tuple[bool, list[dict], list[dict], dict | None, list[str]]:
    """Apply startup DDL, verify constraints/indexes, create placeholder Document."""
    errors: list[str] = []
    constraints: list[dict] = []
    indexes: list[dict] = []
    placeholder_doc: dict | None = None

    try:
        # Apply constraints + vector index (IF NOT EXISTS — idempotent)
        await neo4j_startup()

        driver = get_driver()

        async with driver.session() as session:
            result = await session.run("SHOW CONSTRAINTS")
            constraints = [dict(record) async for record in result]

            result = await session.run("SHOW VECTOR INDEXES")
            indexes = [dict(record) async for record in result]

            # Placeholder Document verifies the Document layer is wired correctly.
            # MERGE makes this idempotent.
            result = await session.run(
                """
                MERGE (d:Document {id: 'migration-placeholder'})
                SET d.filename  = 'Migrated content',
                    d.gcs_uri   = 'gs://placeholder/migration',
                    d.file_type = 'placeholder'
                RETURN d.id AS id, d.filename AS filename
                """
            )
            record = await result.single()
            placeholder_doc = dict(record)

        connected = True
    except Exception as exc:
        connected = False
        errors.append(f"Neo4j error: {exc}")

    return connected, constraints, indexes, placeholder_doc, errors


# ---------------------------------------------------------------------------
# Output helpers
# ---------------------------------------------------------------------------

def section(title: str) -> None:
    print(f"\n{'=' * 60}")
    print(f"  {title}")
    print("=" * 60)


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

async def main() -> None:
    print("\nNoteBud: Postgres → Neo4j migration verification")
    print("=" * 50)

    all_errors: list[str] = []

    # --- Postgres ---
    section("Postgres")
    pg_connected, tables, pg_errors = check_postgres()
    print(f"  Connection : {'OK' if pg_connected else 'FAILED'}")
    if pg_connected:
        for name, status in tables.items():
            marker = "✓" if status == "EXISTS" else "✗"
            print(f"  {marker} Table '{name}': {status}")
    all_errors.extend(pg_errors)

    # --- Neo4j ---
    section("Neo4j")
    neo4j_connected, constraints, indexes, placeholder_doc, neo4j_errors = (
        await check_neo4j()
    )
    print(f"  Connection : {'OK' if neo4j_connected else 'FAILED'}")

    if neo4j_connected:
        print(f"\n  Constraints ({len(constraints)}):")
        for c in constraints:
            print(f"    [{c.get('type', '?')}] {c.get('name', '?')}")

        print(f"\n  Vector indexes ({len(indexes)}):")
        if indexes:
            for idx in indexes:
                name = idx.get("name", "?")
                state = idx.get("state", "?")
                print(f"    {name} — {state}")
        else:
            print("    (none found — index may still be populating)")

        if placeholder_doc:
            print(f"\n  Placeholder Document node: {placeholder_doc}")

    all_errors.extend(neo4j_errors)

    # --- Summary ---
    section("Summary")
    if all_errors:
        print("  ERRORS encountered:")
        for err in all_errors:
            print(f"    ✗ {err}")
        sys.exit(1)
    else:
        print("  All checks passed — migration verification complete.")
        sys.exit(0)


if __name__ == "__main__":
    asyncio.run(main())
