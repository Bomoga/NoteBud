# Plan: Persistent Note Storage for NoteBud

## Role Constraint

> **Backend engineer only.** All implementation work is scoped to the backend (`backend/`). The Frontend Work section and API Contract are specifications for the frontend team — treat them as read-only reference. Do not modify any files under `frontend/`.
>
> **Commit cadence.** After each task is completed, create a git commit before starting the next one. Use the format: `S6-XX: <title>`.

---

## Status

The notes workspace (`/backpack/[id]/notes/page.tsx`) currently has tab management in React state only — tabs are ephemeral and note content is a placeholder `<div>`. No `Note` model exists in the backend. The `Notebook` model holds metadata; `Document` holds uploaded files. A first-class `Note` entity is needed that persists the user's typed markdown across sessions, with per-tab autosave.

---

## Storage Architecture Decision

### Note content stored directly in Neo4j `:Note` node
- Each `:Note` node stores `content` (markdown string) as a node property
- Relationship: `(:Notebook)-[:HAS_NOTE]->(:Note)`
- Markdown text is small (rarely >100 KB), Neo4j handles it fine. Single Cypher query for read/write — much lower latency than a GCS round-trip. Autosave fires on a debounce (every ~1–2 s); GCS latency would make this feel laggy.

### Images within notes
- Images are the exception: they can be large and binary
- Store image files in GCS (same bucket, `notes/images/` prefix)
- Reference them in markdown as a relative or absolute URL (`![alt](/api/v1/notes/images/{id})` or signed GCS URL)
- The `Note` node itself stores only the markdown text (with image URL references), not raw binary

---

## Data Model

### Neo4j `:Note` node properties
```
id            : UUID string
notebook_id   : string (denormalized for fast lookup)
title         : string (user-editable tab label)
content       : string (markdown body)
created_at    : datetime
updated_at    : datetime
owner_id      : string
```

### Relationship
```
(:Notebook {id})-[:HAS_NOTE]->(:Note {id})
```

---

## Backend Work

### 1. Pydantic Schemas — `backend/src/lib/schemas/note.py` (new file)
```python
class NoteCreate(BaseModel):
    title: str
    content: str = ""

class NoteUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None

class NoteRead(BaseModel):
    id: str
    notebook_id: str
    title: str
    content: str
    created_at: datetime
    updated_at: datetime
    owner_id: str
```

### 2. Repository — `backend/src/lib/repositories/note_repository.py` (new file)
CRUD mirroring `NotebookRepository`:
- `create(notebook_id, data, owner_id)` — creates `:Note` node + `[:HAS_NOTE]` edge
- `get_by_id(note_id)` — single node fetch
- `list(notebook_id)` — all notes for a notebook, ordered by `created_at`
- `update(note_id, data)` — partial update via `SET n += $updates`
- `delete(note_id)` — `DETACH DELETE`

### 3. Router — `backend/src/api/routers/notes.py` (new file)
```
POST   /api/v1/notebooks/{notebook_id}/notes          → create note
GET    /api/v1/notebooks/{notebook_id}/notes          → list notes
GET    /api/v1/notebooks/{notebook_id}/notes/{id}     → get note
PATCH  /api/v1/notebooks/{notebook_id}/notes/{id}     → update note (autosave)
DELETE /api/v1/notebooks/{notebook_id}/notes/{id}     → delete note
```
Authorization: verify `owner_id == current_user` on all mutating endpoints (same pattern as `notebooks.py`).

### 4. Register router in `backend/src/api/main.py`
Add `from src.api.routers import notes` and `app.include_router(notes.router)`.

---

## Frontend Work

### 5. API layer — `frontend/src/lib/api/notes.ts` (new file)
Axios calls for all 5 endpoints, typed with `NoteRead`/`NoteCreate`/`NoteUpdate`.

### 6. React Query hook — `frontend/src/hooks/useNotes.ts` (new file)
- `useNotes(notebookId)` — list query
- `useNote(noteId)` — single note query (load content when tab is selected)
- `useCreateNote()` — mutation, called when user adds a tab
- `useUpdateNote()` — mutation, called by autosave
- `useDeleteNote()` — mutation, called when user closes a tab

### 7. Autosave in notes page — `frontend/src/app/backpack/[id]/notes/page.tsx`
- Replace hardcoded `tabs` state with data from `useNotes(notebookId)`
- Track `activeNoteId` (UUID) instead of `activeTab` (string label)
- Debounce `useUpdateNote` mutation: fire 1.5 s after the user stops typing
- Show a subtle "Saving…" / "Saved" indicator in the tab bar or editor header

### 8. Tab state shape change
Each tab becomes a `NoteRead` object. `NotesTabs.tsx` receives `notes: NoteRead[]` and `activeNoteId: string` instead of `tabs: string[]`.

---

## API Contract

All endpoints are nested under `/api/v1/notebooks/{notebook_id}/notes` and require a Bearer token (`Authorization: Bearer <jwt>`).

### POST `/api/v1/notebooks/{notebook_id}/notes`
Create a new note (fires when the user adds a tab).

**Request body**
```json
{
  "title": "Notes-1",
  "content": ""
}
```
**Response `201`**
```json
{
  "id": "uuid",
  "notebook_id": "uuid",
  "title": "Notes-1",
  "content": "",
  "created_at": "2026-04-01T10:00:00Z",
  "updated_at": "2026-04-01T10:00:00Z",
  "owner_id": "user-uuid"
}
```
**Errors:** `401` unauthenticated, `404` notebook not found.

---

### GET `/api/v1/notebooks/{notebook_id}/notes`
List all notes for a notebook (called on page load to restore tabs).

**Response `200`**
```json
[
  { "id": "...", "title": "Notes-1", "content": "...", "created_at": "...", "updated_at": "...", "notebook_id": "...", "owner_id": "..." },
  { "id": "...", "title": "Notes-2", "content": "...", "created_at": "...", "updated_at": "...", "notebook_id": "...", "owner_id": "..." }
]
```
Ordered by `created_at ASC` so tabs restore in original order.

**Errors:** `401`, `404`.

---

### GET `/api/v1/notebooks/{notebook_id}/notes/{note_id}`
Fetch a single note (available for targeted refresh; not required on initial load since list returns full content).

**Response `200`** — same shape as a single item from the list response.

**Errors:** `401`, `404`.

---

### PATCH `/api/v1/notebooks/{notebook_id}/notes/{note_id}`
Partial update — the autosave endpoint. Only send fields that changed.

**Request body** (all fields optional)
```json
{
  "title": "Renamed Tab",
  "content": "# My Notes\n\nSome content here..."
}
```
**Response `200`** — full updated `NoteRead` object.

**Errors:** `401`, `403` (not owner), `404`.

**Frontend behaviour:** debounced 1 500 ms after last keystroke. Fires silently; UI shows "Saving…" → "Saved" in the tab bar.

---

### DELETE `/api/v1/notebooks/{notebook_id}/notes/{note_id}`
Delete a note (fires when user closes a tab).

**Response `204`** — no body.

**Errors:** `401`, `403`, `404`.

---

### Image upload — POST `/api/v1/notebooks/{notebook_id}/notes/{note_id}/images`
*(Future endpoint — not in this sprint.)*
Accepts `multipart/form-data` with a single image file. Stores in GCS under `notes/images/{note_id}/{filename}`. Returns a signed URL or a `/api/v1/...` proxy path that the editor inserts as a markdown image reference.

---

## Critical Files to Modify

| File | Change |
|------|--------|
| `backend/src/lib/schemas/note.py` | **Create** — Pydantic schemas |
| `backend/src/lib/repositories/note_repository.py` | **Create** — Cypher CRUD |
| `backend/src/api/routers/notes.py` | **Create** — REST endpoints |
| `backend/src/api/main.py` | Register new notes router |
| `frontend/src/lib/api/notes.ts` | **Create** — Axios API layer |
| `frontend/src/hooks/useNotes.ts` | **Create** — React Query hooks |
| `frontend/src/app/backpack/[id]/notes/page.tsx` | Wire tabs to real notes, add autosave |
| `frontend/src/components/NotesTabs.tsx` | Accept `NoteRead[]` instead of `string[]` |

### Existing patterns to reuse
- `NotebookRepository` (`backend/src/lib/repositories/notebook_repository.py`) — copy the `_node_to_dict` helper and session pattern
- Notebooks router (`backend/src/api/routers/notebooks.py`) — copy ownership auth check pattern
- `useNotebooks` hook (`frontend/src/hooks/useNotebooks.ts`) — copy React Query structure
- Auth header injection via `client.ts` Axios instance — already configured

---

## Verification — Note Storage

1. **Backend unit test:** Call `POST /api/v1/notebooks/{id}/notes`, then `GET` the same note, assert content matches.
2. **Autosave test:** Open the notes page, type in the editor, wait 2 s, hard-refresh the browser — note content should persist.
3. **Tab persistence test:** Create 3 tabs, close the browser, reopen — all 3 tabs should reappear with their content.
4. **Delete test:** Close a tab → `DELETE` fires → note is gone from DB and doesn't reappear on refresh.
5. **Auth test:** Attempt to `PATCH` a note owned by another user → expect `403`.

---

# Plan: Note GraphRAG Integration

## Context

The current GraphRAG pipeline retrieves answers exclusively from uploaded document chunks (`:ContentChunk` nodes). User-written notes (`:Note` nodes — just built) are disconnected from the retrieval graph. This plan integrates notes into GraphRAG so that when a user queries their notebook, the AI draws on **both** their uploaded documents and their own written notes, with cross-type similarity edges connecting the two.

---

## Graph Schema Additions

### New node label: `:NoteChunk` (sub-label of `:Chunk`)
Follows the existing convention — every chunk node carries `:Chunk` + a type label.

```
(:Note)-[:HAS_CHUNK]->(:NoteChunk:Chunk)
```

**Properties** (same as `:ContentChunk` plus `note_id` and `note_title`):
```
id           : UUID string
note_id      : string (denormalized — fast lookup, cascade delete)
note_title   : string (for citation display)
text         : string (chunk text, stripped of heavy markdown syntax)
embedding    : vector(768)
position     : int (0-based, for NEXT edges)
```

### New edges
```
(:Note)-[:HAS_CHUNK]->(:NoteChunk:Chunk)    — ownership (mirrors Document→ContentChunk)
(:NoteChunk)-[:NEXT]->(:NoteChunk)          — sequential order within a note
(:NoteChunk)-[:SIMILAR]-(:ContentChunk)     — cross-type similarity (KEY GRAPH CONNECTION)
(:NoteChunk)-[:SIMILAR]-(:NoteChunk)        — similarity between chunks across notes
```

### New unique constraint
```cypher
CREATE CONSTRAINT IF NOT EXISTS FOR (n:Note) REQUIRE n.id IS UNIQUE
```
Missing from current DDL in `backend/src/lib/db/neo4j.py` — needs to be added.

### New vector index
```cypher
CREATE VECTOR INDEX note_chunk_embeddings IF NOT EXISTS
FOR (c:NoteChunk) ON (c.embedding)
OPTIONS {indexConfig: {`vector.dimensions`: 768, `vector.similarity_function`: 'cosine'}}
```

---

## Files to Create

### 1. `backend/src/lib/repositories/note_chunk_repository.py`

```python
create_chunks(note_id, note_title, chunks) -> list[str]
    # Creates :NoteChunk:Chunk nodes + [:HAS_CHUNK] edge from Note + [:NEXT] edges
    # Mirrors ChunkRepository.create_chunks() exactly

delete_by_note(note_id) -> int
    # DETACH DELETE all NoteChunks for a note (called before re-indexing on save)
    # MATCH (n:Note {id: $note_id})-[:HAS_CHUNK]->(c:NoteChunk) DETACH DELETE c
```

### 2. `backend/src/services/ingestion/note_ingestion_service.py`

Full pipeline triggered as a BackgroundTask on note save:

```python
async def ingest_note(driver, note_id, note_title, content, notebook_id) -> None:
    # 1. Strip heavy markdown syntax (headers, bold, links) → plain text for embedding
    # 2. Chunk with same SentenceSplitter(512, 64) as document pipeline
    # 3. Embed with Gemini (reuse _embed_chunks from ingestion_service.py)
    # 4. delete_by_note(note_id)           — delete stale NoteChunks
    # 5. create_chunks(note_id, ...)        — write new NoteChunk nodes
    # 6. compute_note_similar_edges(driver, new_chunk_ids, notebook_id)
```

**Markdown stripping:** use `re.sub` to strip `#`, `*`, `_`, `` ` ``, `[]()` before embedding. Store the original markdown in `:Note.content`; store stripped text in `:NoteChunk.text` for embedding accuracy.

**Empty note guard:** if content is blank or produces no chunks after stripping, skip ingestion silently.

---

## Files to Modify

### 3. `backend/src/services/vector_store/vector_store_service.py`

Add `compute_note_similar_edges()`:

```python
async def compute_note_similar_edges(
    driver, note_chunk_ids, notebook_id
) -> None:
    """Build cross-type SIMILAR edges from NoteChunks to ContentChunks and other NoteChunks.

    For each NoteChunk:
      a. Query chunk_embeddings (ContentChunk index) — write SIMILAR to matching ContentChunks
         in the same notebook only (scoped via MATCH (nb:Notebook)-[:CONTAINS]->...)
      b. Query note_chunk_embeddings (NoteChunk index) — write SIMILAR to matching NoteChunks
         in the same notebook only (scoped via MATCH (nb:Notebook)-[:HAS_NOTE]->...)
    Threshold: 0.80 (same as existing compute_similar_edges)
    """
```

Two separate index queries are required because Neo4j vector indexes are per-label — there is no unified index across `:ContentChunk` and `:NoteChunk`.

### 4. `backend/src/lib/db/neo4j.py`

Add to `_STARTUP_CYPHER`:

```python
"CREATE CONSTRAINT IF NOT EXISTS FOR (n:Note) REQUIRE n.id IS UNIQUE",
(
    "CREATE VECTOR INDEX note_chunk_embeddings IF NOT EXISTS "
    "FOR (c:NoteChunk) ON (c.embedding) "
    "OPTIONS {indexConfig: {"
    "`vector.dimensions`: 768, "
    "`vector.similarity_function`: 'cosine'"
    "}}"
),
```

### 5. `backend/src/api/routers/notes.py`

Trigger `ingest_note` as a BackgroundTask **only when `content` changed**:

```python
from fastapi import BackgroundTasks
from src.services.ingestion.note_ingestion_service import ingest_note

@router.patch("/{notebook_id}/notes/{note_id}")
async def update_note_endpoint(..., background_tasks: BackgroundTasks):
    ...
    updated = await repo.update(note_id, data)
    if "content" in data.model_dump(exclude_unset=True):
        background_tasks.add_task(
            ingest_note,
            driver, note_id, updated["title"], updated["content"], notebook_id
        )
    return updated
```

Also wire BackgroundTask on `create_note_endpoint` (empty content → ingestion is a no-op, hook is ready for when content arrives).

### 6. `backend/src/lib/repositories/chunk_repository.py`

Fix `get_by_notebook()` label bug (Task 1 of impl guide): change `:Chunk` → `:ContentChunk`. Required so retrieval expansion doesn't accidentally traverse `:NoteChunk` nodes through the wrong path.

---

## How This Feeds Into Retrieval

When `search_similar()` is implemented (Task 6 of impl guide), it should query **both** indexes and merge results:

```python
# Query 1: ContentChunks matching the user's question
CALL db.index.vector.queryNodes('chunk_embeddings', $top_k, $query_embedding)

# Query 2: NoteChunks matching the user's question
CALL db.index.vector.queryNodes('note_chunk_embeddings', $top_k, $query_embedding)

# Merge, re-rank by score, take top-K overall
```

The graph walk (Task 7) then **automatically** traverses cross-type SIMILAR edges — a ContentChunk seed walks to NoteChunks and vice versa — without any special-casing. This is the GraphRAG payoff.

**Citation shape** will need a `source_type` field (`"document"` vs `"note"`) and `note_title` for NoteChunk citations (replacing `source_file`).

---

## Delete Cascade

When a `:Note` is deleted, `NoteRepository.delete()` already uses `DETACH DELETE`. Add an explicit pre-delete of NoteChunks via `NoteChunkRepository.delete_by_note()` before the DETACH DELETE to ensure SIMILAR edges to ContentChunks are also cleaned up.

---

## Critical Files Summary

| File | Action |
|------|--------|
| `backend/src/lib/db/neo4j.py` | Add `:Note` constraint + `note_chunk_embeddings` index |
| `backend/src/lib/repositories/note_chunk_repository.py` | **Create** — NoteChunk CRUD |
| `backend/src/services/ingestion/note_ingestion_service.py` | **Create** — note chunk/embed/store pipeline |
| `backend/src/services/vector_store/vector_store_service.py` | Add `compute_note_similar_edges()` |
| `backend/src/api/routers/notes.py` | Trigger `ingest_note` as BackgroundTask on PATCH/POST |
| `backend/src/lib/repositories/chunk_repository.py` | Fix `get_by_notebook()` label: `:Chunk` → `:ContentChunk` |

---

## Verification — GraphRAG Integration

1. **Schema test:** After startup, confirm `note_chunk_embeddings` index and `:Note` constraint exist in Neo4j browser.
2. **Ingest test:** Save a note with content → confirm `:NoteChunk` nodes appear linked via `[:HAS_CHUNK]` from the `:Note` node.
3. **SIMILAR edge test:** Confirm `:SIMILAR` edges exist between NoteChunks and ContentChunks in the same notebook (requires at least one document also ingested).
4. **Re-index test:** Edit note content → confirm old NoteChunks are deleted and new ones created.
5. **Delete test:** Delete a note → confirm all NoteChunks and their SIMILAR edges are removed.
6. **Empty note test:** Save a note with no content → confirm no NoteChunks are created, no error raised.
