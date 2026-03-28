# NoteBud — Development Plan

> Last audited: 2026-03-26 · Branch: `feature/neo4j-graphrag-infra-migration` @ `55d4ff8`
> Backend (S3-01 → S3-31): complete. Three lanes remain open.

---

## 0. Workflow Rules

These rules govern how tasks in Section 12 are executed.

1. **After every completed task:** Provide a summary of what was done. Wait for explicit approval before proceeding.
2. **Commit flow:** After approval, draft a commit message and wait for approval of that message before committing.
3. **Continue signal:** The word "continue" signals approval to move to the next task.
4. **Group completion:** Announce clearly when all tasks in a group (e.g. "Frontend — Data shape & mock cleanup") are done. Do not start the next group without explicit instruction.
5. **Branching:** A new branch and PR is created per group. The user creates the branch and PR, merges it, then signals readiness for the next group.
6. **Branch/PR lifecycle:** Do not start tasks from a new group until the previous PR has been merged and a new branch has been created.
7. **Task completion:** Mark a task as `[x]` in Section 12 immediately after its commit is made.
8. **New session audit:** At the start of every new Claude Code session, read Section 12 and report which tasks are `[x]` complete and which are `[ ]` pending before doing anything else.
---

## 1. Current State Snapshot

### Project Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16.1.6 + React 19 + TypeScript + Tailwind CSS 4 |
| Backend | FastAPI (async) + Python 3.12 |
| Database | Neo4j 2025.01 (graph + vector index) |
| Storage | Google Cloud Storage |
| LLM | Google Gemini (`text-embedding-004` + generative) |
| Containerization | Docker (frontend + Neo4j only; no backend Dockerfile) |

---

### Directory Tree

```
NoteBud/
├── .github/workflows/ci.yml
├── docs/
│   ├── api-contracts/
│   ├── ml-integration-points.md
│   ├── rag-architecture.md
│   └── development-plan.md          ← this file
├── frontend/
│   ├── Dockerfile
│   ├── package.json
│   ├── tsconfig.json
│   ├── next.config.ts
│   ├── .env.example / .env.local / .env.staging
│   ├── public/forest-bg.png + svg assets
│   └── src/
│       ├── app/
│       │   ├── backpack/page.tsx    ← NEW (notebook management)
│       │   ├── notes/page.tsx       ← NEW (UI placeholder only)
│       │   ├── layout.tsx
│       │   └── page.tsx
│       ├── components/
│       │   ├── NavBar.tsx
│       │   ├── NotebookCard.tsx     ← NEW
│       │   ├── NotebookGrid.tsx     ← NEW
│       │   ├── NotesTabs.tsx        ← NEW
│       │   └── providers.tsx
│       ├── hooks/
│       │   └── useNotebooks.ts      ← NEW
│       └── lib/api/
│           ├── client.ts
│           ├── index.ts
│           ├── mockNotebooks.ts     ← NEW
│           └── notebooks.ts
├── backend/
│   ├── requirements.txt
│   ├── pytest.ini
│   ├── .env / .env.example / .env.development / .env.staging
│   ├── service-account-key.json
│   ├── infrastructure/docker/docker-compose.yml
│   ├── scripts/migrate_to_neo4j.py
│   ├── src/
│   │   ├── api/
│   │   │   ├── main.py
│   │   │   └── routers/
│   │   │       ├── health.py
│   │   │       ├── files.py
│   │   │       ├── notebooks.py
│   │   │       ├── query.py
│   │   │       └── courses.py
│   │   ├── lib/
│   │   │   ├── config/settings.py
│   │   │   ├── db/neo4j.py
│   │   │   ├── repositories/
│   │   │   │   ├── notebook_repository.py
│   │   │   │   ├── document_repository.py
│   │   │   │   ├── chunk_repository.py
│   │   │   │   └── course_repository.py
│   │   │   ├── schemas/notebook.py
│   │   │   └── storage/gcs.py
│   │   └── services/
│   │       ├── ingestion/ingestion_service.py
│   │       ├── rag/graph_rag_service.py
│   │       └── vector_store/vector_store_service.py
│   └── tests/
│       ├── conftest.py
│       ├── fixtures/course_seed.py
│       ├── api/test_health.py
│       └── services/
│           ├── test_rag_service.py
│           └── test_vector_store.py
├── ml/
└── shared/
```

---

## 2. Full Audit Results

### 2a. Frontend — Pages & Routes

| Route | File | Status | Data source |
|-------|------|--------|-------------|
| `/` | `app/page.tsx` | Working | `GET /api/v1/health` (React Query) |
| `/backpack` | `app/backpack/page.tsx` | Partial — mock only | `useNotebooks({ mock })` / `useDeleteNotebook` / `useCreateNotebook` |
| `/notes` | `app/notes/page.tsx` | UI placeholder | No API calls |

**`/backpack` detail:**
- Reads `?mock=1` from URL query params to switch between mock and real data
- NavBar currently injects `?mock=1` on Backpack and Notes links (marked TODO to remove)
- Shows a yellow warning banner when mock mode is active
- Renders `NotebookGrid` → `NotebookCard` per notebook
- Create form: fields for `title` and `course_code` only (no description input yet)
- Delete button per card → `useDeleteNotebook(id)`
- No notebook detail route — cards are not clickable/navigable yet

**`/notes` detail:**
- Two-pane layout: collapsible chat left, notes right
- Hardcoded initial tabs: `['Notes-1', 'Notes-2', 'Notes-3']`
- Hardcoded active tab: `'2026-03-24'`
- All content is placeholder text — zero API integration

---

### 2b. Frontend — Components

| Component | File | Props | API calls | Notes |
|-----------|------|-------|-----------|-------|
| `NavBar` | `components/NavBar.tsx` | none | none | `usePathname()` for active route; hardcoded user data; links have `?mock=1` TODO |
| `NotebookCard` | `components/NotebookCard.tsx` | `notebook: NotebookResponse`, `onDelete?: (id: number)`, `isDeleting?`, `onEdit?: (id: number)`, `isEditing?` | none | `onDelete/onEdit` still typed as `number` — **breaking** |
| `NotebookGrid` | `components/NotebookGrid.tsx` | `children: ReactNode` | none | Responsive grid: 1→2→3→4 cols |
| `NotesTabs` | `components/NotesTabs.tsx` | `tabs`, `activeTab`, `onSelectTab`, `onAddTab`, `onCloseTab`, `chatOpen` | none | Pure controlled component |
| `Providers` | `components/providers.tsx` | `children` | none | React Query client, staleTime 60s |

---

### 2c. Frontend — Hooks

**File:** `src/hooks/useNotebooks.ts`

All four hooks accept `UseNotebooksOptions = { mock?: boolean }`:

| Hook | Query key | Mock path | Real path | ID type used |
|------|-----------|-----------|-----------|-------------|
| `useNotebooks` | `['notebooks', 'mock'\|'real']` | `getMockNotebooks()` | `getNotebooks()` | — |
| `useCreateNotebook` | invalidates `notebooks` | `createMockNotebook(payload)` | `createNotebook(payload)` | — |
| `useUpdateNotebook` | invalidates `notebooks` | **mock flag ignored** | `updateNotebook(id, payload)` | `number` ⚠️ |
| `useDeleteNotebook` | invalidates `notebooks` | `deleteMockNotebook(id)` | `deleteNotebook(id)` | `number` ⚠️ |

---

### 2d. Frontend — API Layer

**`src/lib/api/notebooks.ts`** — All types and functions:

```typescript
// TYPES — id fields still integer (Postgres-era, breaking vs. backend)
interface NotebookResponse {
  id: number;                  // ⚠️ BREAKING — backend returns UUID string
  title: string;
  course_code: string;
  description: string | null;
  created_at: string;
  updated_at: string;
  owner_id: number | null;     // ⚠️ BREAKING — backend returns string | null
}

interface NotebookCreate  { title: string; course_code: string; description?: string | null; }
interface NotebookUpdate  { title?: string; course_code?: string; description?: string | null; }
```

| Function | Method | Endpoint | Request | Response |
|----------|--------|----------|---------|----------|
| `getNotebooks()` | GET | `/notebooks` | — | `NotebookResponse[]` |
| `createNotebook(payload)` | POST | `/notebooks` | `NotebookCreate` | `NotebookResponse` |
| `getNotebook(id: number)` | GET | `/notebooks/{id}` | — | `NotebookResponse` |
| `updateNotebook(id: number, payload)` | PATCH | `/notebooks/{id}` | `NotebookUpdate` | `NotebookResponse` |
| `deleteNotebook(id: number)` | DELETE | `/notebooks/{id}` | — | `void` |

**`src/lib/api/mockNotebooks.ts`** — In-memory mock store:

- 6 hardcoded notebooks (BIO 101, CHEM 201, MATH 142, ARTH 110, PSYC 101, CS 225)
- All use integer IDs (1–6), `owner_id: 1` (except newly created: `null`)
- Auto-increments IDs from `max(existing) + 1` on create
- Module-level store — resets on hot reload
- Functions: `resetMockNotebooks`, `getMockNotebooksSnapshot`, `getMockNotebooks`, `createMockNotebook`, `deleteMockNotebook`
- No `updateMockNotebook` — update hook ignores mock flag entirely

**`src/lib/api/client.ts`** — Axios instance:
- Base URL: `process.env.NEXT_PUBLIC_API_URL`
- `withCredentials: true`
- Auth interceptor: `getAuthToken()` returns `null` — TODO line 14
- Error interceptor: `handleApiError()` is no-op — TODO line 28

---

### 2e. Frontend — Hardcoded / Mock Data

| File | Type | Detail |
|------|------|--------|
| `NavBar.tsx:178` | Hardcoded user | `"John Doe"` |
| `NavBar.tsx:179` | Hardcoded email | `"tom@example.com"` |
| `NavBar.tsx:19,24,97,173` | Placeholder avatar | `images.unsplash.com` photo URL |
| `NavBar.tsx:19,24` | Placeholder logo | `tailwindcss.com` CDN SVG |
| `NavBar.tsx:11` | TODO | Remove `?mock=1` from nav links after backend is implemented |
| `notes/page.tsx` | Hardcoded tabs | `['Notes-1', 'Notes-2', 'Notes-3']` |
| `notes/page.tsx` | Hardcoded active tab | `'2026-03-24'` |
| `mockNotebooks.ts` | Mock store | 6 notebooks, integer IDs, reset on reload |

---

### 2f. Frontend — Environment Variables

| Variable | Referenced in | Dev value | Staging value |
|----------|--------------|-----------|---------------|
| `NEXT_PUBLIC_API_URL` | `client.ts:3` | `http://localhost:8000/api/v1` | `https://staging-api.notebud.com/api/v1` |

---

### 2g. Frontend — TODO / FIXME Comments

| File | Line | Comment |
|------|------|---------|
| `NavBar.tsx` | 11 | `// TODO: Remove mock=1 after backend is implemented` |
| `client.ts` | 14 | `// TODO: Replace with real auth (e.g. getAccessToken from auth context/store)` |
| `client.ts` | 28 | `// TODO: Hook up to toast/notification, redirect on 401, log to monitoring, etc.` |

---

### 2h. Backend — API Routes

#### Health
| Method | Path | Request | Response shape | Notes |
|--------|------|---------|----------------|-------|
| GET | `/api/v1/health` | — | `{status, database, message?, error?}` | Never throws; always 200 |
| GET | `/` | — | `{message}` | Root only |

#### Notebooks
| Method | Path | Request body | Response shape | Status codes |
|--------|------|-------------|----------------|-------------|
| POST | `/api/v1/notebooks` | `{title, course_code, description?}` | `NotebookRead` | 201 |
| GET | `/api/v1/notebooks` | — | `NotebookRead[]` (ordered by `created_at DESC`) | 200 |
| GET | `/api/v1/notebooks/{id}` | — | `NotebookRead` | 200, 404 |
| PATCH | `/api/v1/notebooks/{id}` | `{title?, course_code?, description?}` | `NotebookRead` | 200, 404 |
| DELETE | `/api/v1/notebooks/{id}` | — | — | 204, 404 |

**`NotebookRead` schema (backend truth):**
```python
id: str           # UUID
title: str
course_code: str
description: Optional[str]
created_at: datetime
updated_at: datetime
owner_id: Optional[str]  # None until auth is implemented
```

#### Files
| Method | Path | Request | Response shape | Status codes |
|--------|------|---------|----------------|-------------|
| POST | `/api/v1/files/upload` | multipart `file`; query: `notebook_id (str)`, `source_type? (str)` | `{status, filename, content_type, gcs_uri, document_id}` | 201, 400, 500 |

`source_type` defaults: filename contains "syllabus" → `"syllabus"`, else `"content"`.

#### Courses
| Method | Path | Request body | Response shape | Status codes |
|--------|------|-------------|----------------|-------------|
| GET | `/api/v1/courses` | — | `list[dict]` Course nodes, ordered by name | 200 |
| POST | `/api/v1/notebooks/{id}/tags` | `{type: "prerequisite"\|"relates-to", course_code}` | `{notebook_id, type, course_code}` | 201, 404 |
| DELETE | `/api/v1/notebooks/{id}/tags/{tag}` | — | — | 204, 404 |

#### Query
| Method | Path | Request body | Response shape | Status codes |
|--------|------|-------------|----------------|-------------|
| POST | `/api/v1/notebooks/{id}/query` | `{query: str}` | `{answer: str, sources: list[str]}` | 200, 404 |

Currently returns stub: `{answer: "RAG service pending ML implementation", sources: []}`.

---

### 2i. Backend — Neo4j Schema

#### Node Labels & Properties

| Label | Properties | Constraint |
|-------|-----------|-----------|
| `:Notebook` | `id` (str), `title`, `course_code`, `description?`, `created_at`, `updated_at`, `owner_id?` | UNIQUE `id` |
| `:Document` | `id` (str), `gcs_uri`, `filename`, `file_type` | — |
| `:Chunk` + `:ContentChunk` | `id` (str), `text`, `embedding` (float[768]), `position` (int), `document_id` | UNIQUE `id`; vector index |
| `:Chunk` + `:SyllabusChunk` | same as ContentChunk | — |
| `:User` | `id` (str) | UNIQUE `id` |
| `:Course` | `code` (str), `name` | UNIQUE `code` |
| `:Subject` | `name` | — |

Vector index: `chunk_embeddings` on `:ContentChunk(embedding)`, 768-dim, cosine.

#### Relationships

| From | → | To | Properties | Set by |
|------|---|----|-----------|--------|
| `:Notebook` | `CONTAINS` | `:Document` | — | `files.py` on upload |
| `:Document` | `HAS_CHUNK` | `:Chunk` | — | `chunk_repository` on ingest |
| `:Chunk` | `NEXT` | `:Chunk` | — | `chunk_repository` (sequential chain) |
| `:Chunk` | `SIMILAR` | `:Chunk` | — | `vector_store_service` (**stub**) |
| `:Course` | `PREREQUISITE_OF` | `:Course` | — | `courses.py` via `add_notebook_tag` |
| `:Course` | `RELATES_TO` | `:Course` | `weight (float)` | `courses.py` bidirectional |
| `:Course` | `BELONGS_TO` | `:Subject` | — | `course_repository` |
| `:Notebook` | `FOR_COURSE` | `:Course` | — | **test fixtures only** (not a production route) |

---

### 2j. Backend — Services Status

| Service | Method | Status | Ticket |
|---------|--------|--------|--------|
| `IngestionService` | `_extract_text(gcs_uri)` | **STUB** — returns placeholder string | S3-16b |
| `IngestionService` | `_chunk_text(text)` | **STUB** — returns single chunk | S3-16b |
| `IngestionService` | `_embed_chunks(chunks)` | **STUB** — returns zero vectors `[0.0]*768` | S3-18 |
| `IngestionService` | `ingest_document(...)` | Implemented (orchestrates stubs) | — |
| `VectorStoreService` | `store_chunks(...)` | Implemented | — |
| `VectorStoreService` | `compute_similar_edges(...)` | **STUB** — logs only | S3-16b |
| `VectorStoreService` | `refresh_chunk_edges(...)` | **STUB** — logs only | S3-17 |
| `GraphRAGService` | `query(notebook_id, query_text)` | **STUB** — returns hardcoded string | S3-18 |

---

### 2k. Backend — Test Coverage

| Test file | Tests | Status |
|-----------|-------|--------|
| `tests/api/test_health.py` | 1 — `test_health_check_returns_200` | Passing |
| `tests/services/test_vector_store.py` | 5 — chunk creation, HAS_CHUNK/NEXT edges, syllabus exclusion | All passing |
| `tests/services/test_rag_service.py` | 3 — cross-notebook context, isolation, syllabus exclusion | 2 xfail (S3-18), 1 passing |

**Fixtures:**
- `conftest.py`: session-scoped `neo4j_container` (testcontainers) + `neo4j_driver`
- `fixtures/course_seed.py`: seeds CALC1→CALC2→MULTICALC, DS→ALGO curriculum graph (test only)

---

### 2l. Backend — Environment Variables

| Variable | Default | File | Required for |
|----------|---------|------|-------------|
| `ENVIRONMENT` | `development` | `settings.py:17` | Env file selection |
| `NEO4J_URI` | `bolt://localhost:7687` | `settings.py` | All routes |
| `NEO4J_USERNAME` | `neo4j` | `settings.py` | All routes |
| `NEO4J_PASSWORD` | `notebud_password` | `settings.py` | All routes |
| `GCS_BUCKET_NAME` | `notebud-dev-bucket` | `settings.py` | File upload |
| `GOOGLE_APPLICATION_CREDENTIALS` | `./service-account-key.json` | `settings.py` | File upload |
| `GCS_CREDENTIALS_PATH` | — | `gcs.py:15` | Alternative credentials path |
| `GEMINI_API_KEY` | — | `.env.example` only | **ML lane** — missing from `.env.development` |

---

## 3. Mismatch Detection

### 3a. Route Coverage

| Frontend call | Backend route | Status |
|--------------|--------------|--------|
| `GET /health` | `GET /api/v1/health` | Wired |
| `GET /notebooks` | `GET /api/v1/notebooks` | Wired (mock bypass active via `?mock=1`) |
| `POST /notebooks` | `POST /api/v1/notebooks` | Wired (mock bypass active) |
| `GET /notebooks/:id` | `GET /api/v1/notebooks/{id}` | API function exists; not called from any page yet |
| `PATCH /notebooks/:id` | `PATCH /api/v1/notebooks/{id}` | API function exists; not called from any page yet |
| `DELETE /notebooks/:id` | `DELETE /api/v1/notebooks/{id}` | Wired on `/backpack` (mock bypass active) |

**Backend routes with no frontend integration at all:**

| Backend route | Method | What's missing |
|--------------|--------|---------------|
| `/api/v1/files/upload` | POST | No upload UI anywhere |
| `/api/v1/courses` | GET | No courses page |
| `/api/v1/notebooks/{id}/tags` | POST | No tag UI |
| `/api/v1/notebooks/{id}/tags/{tag}` | DELETE | No tag UI |
| `/api/v1/notebooks/{id}/query` | POST | No chat/RAG UI wired to API |

---

### 3b. Data Shape Mismatches

| Field | Frontend type | Backend type | Severity | Affected files |
|-------|--------------|--------------|----------|---------------|
| `NotebookResponse.id` | `number` | `string` (UUID) | **Breaking** | `notebooks.ts`, `mockNotebooks.ts`, `NotebookCard.tsx`, `useNotebooks.ts` |
| `NotebookResponse.owner_id` | `number \| null` | `string \| null` | **Breaking** | `notebooks.ts`, `mockNotebooks.ts` |
| `NotebookCard.onDelete(id: number)` | `number` | `string` | **Breaking** | `NotebookCard.tsx` |
| `NotebookCard.onEdit(id: number)` | `number` | `string` | **Breaking** | `NotebookCard.tsx` |
| `useUpdateNotebook` input | `{ id: number, ...}` | `{ id: string, ...}` | **Breaking** | `useNotebooks.ts` |
| `useDeleteNotebook` input | `number` | `string` | **Breaking** | `useNotebooks.ts` |
| Mock IDs (1–6) | `number` | — | Non-breaking (mock only) | `mockNotebooks.ts` |
| `create_at` / `updated_at` | `string` | `datetime` (serialized ISO) | Compatible | — |

**The mock data layer masks this entirely right now** — because `/backpack` runs with `?mock=1`, nothing actually hits the backend. The ID mismatch will surface the moment `?mock=1` is removed.

---

### 3c. Auth

| Frontend | Backend | Status |
|----------|---------|--------|
| `getAuthToken()` returns `null` (stub) | No auth expected | Compatible (both unauthenticated) |
| `withCredentials: true` | `allow_credentials=True` on CORS | Aligned |
| CORS origins | `http://localhost:3000` only | Aligned for dev; staging URL not in CORS list |

---

## 4. Priority Order

```
1.  [Frontend]  Fix id: number → id: string everywhere   BREAKING — must precede removing mock flag
2.  [Frontend]  Remove ?mock=1 from NavBar links          unblocked once #1 is done
3.  [Frontend]  /backpack — make cards clickable → /backpack/[id]
4.  [Frontend]  /backpack/[id] — notebook detail: edit, file upload, course tags
5.  [Frontend]  /notes — wire to real notebook/chunk data (replace placeholder)
6.  [ML]        Ingestion stubs: _extract_text, _chunk_text, _embed_chunks
7.  [ML]        compute_similar_edges (S3-16b)
8.  [ML]        GraphRAGService.query (S3-18) — un-xfail test_rag_service.py
9.  [Frontend]  /backpack/[id]/chat — RAG query UI         depends on S3-18
10. [Auth]      Backend JWT middleware + ownership scoping
11. [Auth]      Frontend auth context + Zustand store + login page
12. [Infra]     Backend Dockerfile + full docker-compose
```

---

## 5. Lane 1 — Frontend Fixes & Integration

### 5.1 Fix Breaking Data Shape (do before removing mock)

**Files to change:**

`frontend/src/lib/api/notebooks.ts`:
```diff
interface NotebookResponse {
-  id: number;
+  id: string;
-  owner_id: number | null;
+  owner_id: string | null;
}

- getNotebook(id: number)
+ getNotebook(id: string)
- updateNotebook(id: number, payload)
+ updateNotebook(id: string, payload)
- deleteNotebook(id: number)
+ deleteNotebook(id: string)
```

`frontend/src/components/NotebookCard.tsx`:
```diff
interface NotebookCardProps {
-  onDelete?: (id: number) => void;
+  onDelete?: (id: string) => void;
-  onEdit?: (id: number) => void;
+  onEdit?: (id: string) => void;
}
```

`frontend/src/hooks/useNotebooks.ts`:
```diff
- useUpdateNotebook: accepts { id: number, ... }
+ useUpdateNotebook: accepts { id: string, ... }
- useDeleteNotebook: accepts number
+ useDeleteNotebook: accepts string
```

`frontend/src/lib/api/mockNotebooks.ts` — mock IDs should stay as strings:
```diff
- id: 1
+ id: "mock-1"
```
Update `createMockNotebook` to generate string IDs. Update `deleteMockNotebook` to compare strings.

---

### 5.2 Remove Mock Flag from NavBar

**File:** `frontend/src/components/NavBar.tsx` line 11

After #5.1 is done and real backend is reachable:
- Remove `?mock=1` query param from Backpack and Notes nav links
- Delete the yellow warning banner logic in `/backpack/page.tsx`
- The `mock` query param and `useMock` flag can remain as a dev escape hatch but should not be default

---

### 5.3 Wire Missing API Calls

Add to `frontend/src/lib/api/notebooks.ts`:

| Function | Method | Endpoint | Request body |
|----------|--------|----------|-------------|
| already exists: `updateNotebook` | PATCH | `/notebooks/{id}` | `NotebookUpdate` |
| already exists: `getNotebook` | GET | `/notebooks/{id}` | — |
| **add:** `uploadFile(notebookId, file, sourceType?)` | POST | `/files/upload?notebook_id={id}&source_type={type}` | multipart |
| **add:** `queryNotebook(id, query)` | POST | `/notebooks/{id}/query` | `{query: string}` |

Create `frontend/src/lib/api/courses.ts`:

| Function | Method | Endpoint |
|----------|--------|----------|
| `getCourses()` | GET | `/courses` |
| `addNotebookTag(notebookId, type, courseCode)` | POST | `/notebooks/{id}/tags` |
| `removeNotebookTag(notebookId, tag)` | DELETE | `/notebooks/{id}/tags/{tag}` |

Export new functions from `frontend/src/lib/api/index.ts`.

---

### 5.4 Build Missing Pages

#### `/backpack/[id]` — Notebook Detail

- Show notebook metadata (title, course_code, description)
- Inline edit via `updateNotebook()` — optimistic update
- **File upload section:**
  - Accept PDF / DOCX / PPTX
  - Source type toggle: `content` (default) vs `syllabus`
  - POST to `uploadFile(notebookId, file, sourceType)`
  - Show upload status (filename, GCS URI)
- **Course tag section:**
  - Autocomplete dropdown from `getCourses()`
  - Tag type selector: `prerequisite` | `relates-to`
  - Add/remove tags
- Link to `/backpack/[id]/chat`

#### `/backpack/[id]/chat` — RAG Chat

- Text input + submit
- POST to `queryNotebook(id, query)`
- Render `answer` as markdown
- Render `sources` as collapsible list
- Conversation history in local state (not persisted to backend)
- Shows stub answer until S3-18 is complete

#### `/notes` — Replace Placeholder

- Connect to real notebook/chunk data once ingestion pipeline is complete (depends on ML lane)
- Replace hardcoded tabs with real document/chunk navigation
- Wire left chat pane to `/backpack/[id]/chat` flow

#### `/courses` — Course List

- Fetch and display all courses from `getCourses()`
- Show course code, name, related courses

---

### 5.5 Fix NavBar Hardcoded Data

**File:** `frontend/src/components/NavBar.tsx`

| Location | Current | Replace with |
|----------|---------|-------------|
| Line 178 | `"John Doe"` | Auth context display name |
| Line 179 | `"tom@example.com"` | Auth context email |
| Lines 19, 24, 97, 173 | Unsplash avatar URL | Auth provider avatar or local default SVG |
| Lines 19, 24 | Tailwind CDN logo | Local asset in `public/` |

*Full replacement of user data blocked on Lane 3 (auth).*

---

### 5.6 Wire Auth Interceptor

**File:** `frontend/src/lib/api/client.ts`

- Line 14: replace `return null` with real token from Zustand auth store
- Line 28: redirect to `/login` on 401, surface other errors via toast notification

*Blocked on Lane 3.*

---

## 6. Lane 2 — ML / AI Pipeline

**Prerequisite before starting:** Add `GEMINI_API_KEY` to `backend/.env.development`.

All stubs are in:
- `backend/src/services/ingestion/ingestion_service.py`
- `backend/src/services/vector_store/vector_store_service.py`
- `backend/src/services/rag/graph_rag_service.py`

---

### Ingestion Pipeline Stubs

#### `_extract_text(gcs_uri: str) -> str`

1. Download file from GCS to a temp path
2. Route by extension:
   - `.pdf` → LlamaIndex `PDFReader`
   - `.docx` → LlamaIndex `DocxReader`
   - `.pptx` → LlamaIndex `PptxReader`
3. Return concatenated plain text; clean up temp file

#### `_chunk_text(text: str) -> list[dict]`

1. LlamaIndex `SentenceSplitter`, `chunk_size=512`, `chunk_overlap=64`
2. Return `[{"text": str, "position": int}, ...]`

#### `_embed_chunks(chunks: list[dict]) -> list[dict]`

1. Gemini `text-embedding-004` via `google.generativeai`
2. Batch up to 100 texts per API call
3. Attach `embedding: list[float]` (768-dim) to each chunk dict; return list

---

### S3-16b — `compute_similar_edges(chunk_ids: list[str])`

**File:** `backend/src/services/vector_store/vector_store_service.py`

1. For each chunk ID, query `chunk_embeddings` vector index for top-K nearest neighbors (K=10)
2. Index is already scoped to `:ContentChunk` — no additional filter needed
3. Write `(:Chunk)-[:SIMILAR {score: float}]->(:Chunk)` for pairs with cosine ≥ 0.75
4. Batch write in a single transaction
5. Un-xfail SIMILAR edge tests in `tests/services/test_vector_store.py`

---

### S3-17 — `refresh_chunk_edges(chunk_id: str)`

**File:** `backend/src/services/vector_store/vector_store_service.py`

1. `MATCH (c:Chunk {id: $id})-[r:SIMILAR]-() DELETE r` — remove stale edges
2. Re-run similarity search for this single chunk
3. Write new edges above threshold

---

### S3-18 — `GraphRAGService.query(notebook_id, query_text)`

**File:** `backend/src/services/rag/graph_rag_service.py`

```
query_text
  → embed (Gemini text-embedding-004)
  → vector search on chunk_embeddings
  → filter to notebook's chunks: Notebook→CONTAINS→Document→HAS_CHUNK→Chunk
  → graph expansion: follow NEXT (±2 hops) + SIMILAR edges
  → cross-notebook: Course→RELATES_TO/PREREQUISITE_OF→Course→Notebook→Chunk
  → assemble ranked context window (deduplicate)
  → Gemini generative call with context + original query
  → return {answer: str, sources: list[str]}
```

Sources should be document filenames or chunk IDs for citation display.
Un-xfail `tests/services/test_rag_service.py` tests 1 and 2 when done.

---

## 7. Lane 3 — Authentication

No auth exists on either side. `owner_id` on `:Notebook` is always `None`.

### Recommended: JWT via Supabase Auth (or any OIDC provider)

#### Backend

**New dependencies:** `python-jose` or `PyJWT`
**New env var:** `JWT_SECRET` (or `SUPABASE_JWT_SECRET`)

1. Create `backend/src/lib/auth/jwt.py`:
   - `decode_token(token: str) -> dict` — validates signature + expiry
   - `get_current_user(token = Depends(oauth2_scheme)) -> str` — returns `sub` claim (user ID)

2. Create `:User` node on first login (no user repo exists yet)

3. Inject auth into routes:

| Route | Change |
|-------|--------|
| `POST /notebooks` | Set `owner_id = current_user` |
| `GET /notebooks` | Filter `WHERE n.owner_id = $user_id` |
| `PATCH /notebooks/{id}` | 403 if `owner_id != current_user` |
| `DELETE /notebooks/{id}` | 403 if `owner_id != current_user` |
| `POST /files/upload` | Verify notebook ownership |
| `POST /notebooks/{id}/tags` | Verify notebook ownership |
| `POST /notebooks/{id}/query` | Verify notebook ownership |

4. Update CORS to include production/staging origins

#### Frontend

1. Create Zustand auth store at `frontend/src/lib/store/auth.ts` (Zustand is installed, currently unused)
2. Wire `client.ts` interceptor to read token from store
3. Create `/login` page
4. Handle 401 in error interceptor → redirect to `/login`
5. Replace NavBar hardcoded user data with auth store values

---

## 8. Lane 4 — Infrastructure

### 8.1 Backend Dockerfile

**New file:** `backend/infrastructure/docker/Dockerfile`

```dockerfile
FROM python:3.12-slim AS base
WORKDIR /app

FROM base AS deps
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

FROM base AS runner
COPY --from=deps /usr/local/lib/python3.12/site-packages /usr/local/lib/python3.12/site-packages
COPY src/ ./src/
RUN useradd -m -u 1001 notebud
USER notebud
EXPOSE 8000
CMD ["uvicorn", "src.api.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

---

### 8.2 Expand docker-compose.yml

**File:** `backend/infrastructure/docker/docker-compose.yml`

Add `api` and `frontend` services:

```yaml
services:
  db:
    # existing Neo4j — add healthcheck (see 8.3)

  api:
    build:
      context: ../../
      dockerfile: infrastructure/docker/Dockerfile
    ports:
      - "8000:8000"
    env_file: .env.development
    depends_on:
      db:
        condition: service_healthy

  frontend:
    build:
      context: ../../frontend
      target: dev
    ports:
      - "3000:3000"
    environment:
      NEXT_PUBLIC_API_URL: http://api:8000/api/v1
    depends_on:
      - api
```

---

### 8.3 Add Neo4j Healthcheck

The CI workflow has a healthcheck; the local compose does not. Add to `db` service:

```yaml
healthcheck:
  test: ["CMD", "cypher-shell", "-u", "neo4j", "-p", "notebud_password", "RETURN 1"]
  interval: 10s
  timeout: 5s
  retries: 10
```

---

### 8.4 CORS: Add Staging Origin

**File:** `backend/src/api/main.py`

Current: hardcoded to `http://localhost:3000` only.
Add staging origin from env var so it doesn't need to be hardcoded.

```python
allow_origins=settings.ALLOWED_ORIGINS  # new settings field
```

---

## 9. Lane 5 — Testing Gaps

| Area | Current state | Needed |
|------|--------------|--------|
| Backend notebooks API | No tests | `tests/api/test_notebooks.py` |
| Backend files API | No tests | `tests/api/test_files.py` |
| Backend courses API | No tests | `tests/api/test_courses.py` |
| Backend query API | No tests | `tests/api/test_query.py` |
| ML SIMILAR edges | xfail | Un-xfail when S3-16b lands |
| ML RAG service | 2 xfail | Un-xfail when S3-18 lands |
| Frontend unit | CI runs `npm run build` only | Add Vitest + React Testing Library |
| Frontend E2E | Nothing | Add Playwright for critical paths |
| Auth | Nothing | JWT unit tests + auth integration tests |

---

## 10. Environment Variable Checklist

| Variable | Location | Status |
|----------|---------|--------|
| `NEO4J_URI` | `backend/.env.development` | Set |
| `NEO4J_USERNAME` | `backend/.env.development` | Set |
| `NEO4J_PASSWORD` | `backend/.env.development` | Set |
| `GCS_BUCKET_NAME` | `backend/.env.development` | Set |
| `GOOGLE_APPLICATION_CREDENTIALS` | `backend/.env.development` | Set |
| `GEMINI_API_KEY` | `backend/.env.development` | **Missing — add before ML work** |
| `JWT_SECRET` | `backend/.env.development` | **Missing — add before auth work** |
| `ALLOWED_ORIGINS` | `backend/.env.development` | **Missing — needed for staging CORS** |
| `NEXT_PUBLIC_API_URL` | `frontend/.env.local` | Set |

---

## 11. Architectural Decisions (Record)

| Decision | Detail |
|----------|--------|
| Dual-label chunks | Every chunk is `:Chunk` + `:ContentChunk` OR `:SyllabusChunk`. Vector index scoped to `:ContentChunk` only — syllabus data permanently excluded. |
| Course relationships on Course nodes | Notebooks point to Courses; graph topology lives on Course nodes. All notebooks sharing a course inherit its relationships automatically. |
| `SIMILAR` edges derived post-ingest | Not written inline with chunk creation. Computed as a background step after `store_chunks()`. Never computed for SyllabusChunks. |
| In-process background tasks | FastAPI `BackgroundTasks` (same process, no queue). Consider moving to Celery when embedding/similarity volumes grow. |
| `owner_id` is a string FK | References `:User.id`. User nodes are schema-defined but have no repo or creation flow. Auth lane must create User node on first login. |
| Mock mode via `?mock=1` | Intentional dev shortcut. `useNotebooks({ mock })` switches data source. NavBar injects this flag temporarily. Must be removed after ID type fix and real backend validation. |

---

*Last updated: 2026-03-26 · Re-audited after frontend dev branch pull*

---

## 12. Task List

> Tasks are ordered sequentially. Each task unblocks the next where a dependency exists.
> `[ ]` = pending · `[x]` = complete · Updated at the start of every new session (Rule 7).

---

### Group A — Frontend: Data Shape & Mock Cleanup

- [x] S5-01: Fix `NotebookResponse.id` type: `number` → `string` in `notebooks.ts`
- [x] S5-02: Fix `NotebookResponse.owner_id` type: `number | null` → `string | null` in `notebooks.ts` *(needs S5-01)*
- [x] S5-03: Fix `getNotebook`, `updateNotebook`, `deleteNotebook` signatures: `id: number` → `id: string` in `notebooks.ts` *(needs S5-01)*
- [x] S5-04: Fix `NotebookCard` callback types: `onDelete/onEdit(id: number)` → `(id: string)` in `NotebookCard.tsx` *(needs S5-01)*
- [x] S5-05: Fix `useUpdateNotebook` and `useDeleteNotebook` id type: `number` → `string` in `useNotebooks.ts` *(needs S5-01)*
- [x] S5-06: Update `mockNotebooks.ts`: change all IDs to strings (`"mock-1"` etc.), update `createMockNotebook` and `deleteMockNotebook` *(needs S5-01)*
- [x] S5-07: Remove `?mock=1` query param from NavBar Backpack and Notes links *(needs S5-01 – S5-06)*
- [x] S5-08: Remove mock warning banner and `useMock` flag logic from `/backpack/page.tsx` *(needs S5-07)*

---

### Group B — Frontend: API Layer Completion

- [x] S5-09: Add `uploadFile(notebookId, file, sourceType?)` to `notebooks.ts` *(needs S5-03)*
- [x] S5-10: Add `queryNotebook(id, query)` to `notebooks.ts` *(needs S5-03)*
- [x] S5-11: Create `frontend/src/lib/api/courses.ts` with `getCourses`, `addNotebookTag`, `removeNotebookTag`
- [x] S5-12: Re-export new functions (`uploadFile`, `queryNotebook`, courses API) from `lib/api/index.ts` *(needs S5-09 – S5-11)*

---

### Group C — Frontend: Page & Feature Build-out

- [x] S5-13: Make `NotebookCard` clickable — navigate to `/backpack/[id]` on card click *(needs S5-04)*
- [x] S5-14: Build `/backpack/[id]` notebook detail page: display metadata, inline edit via `updateNotebook` *(needs S5-05, S5-13)*
- [x] S5-15: Add file upload section to `/backpack/[id]`: PDF/DOCX/PPTX input, source type toggle, call `uploadFile` *(needs S5-09, S5-14)*
- [x] S5-16: Add course tag section to `/backpack/[id]`: course autocomplete from `getCourses`, add/remove tags *(needs S5-11, S5-14)*
- [x] S5-17: Build `/courses` page: list all courses with relationship display *(needs S5-11)*
- [x] S5-18: Add description field to the create notebook form on `/backpack` *(needs S5-08)*

---

### Group D — ML/AI: Environment & Ingestion

- [ ] S5-19: Add `GEMINI_API_KEY` to `backend/.env.development`
- [ ] S5-20: Implement `_extract_text(gcs_uri)` in `ingestion_service.py`: download from GCS, route to LlamaIndex PDF/DOCX/PPTX reader *(needs S5-19)*
- [ ] S5-21: Implement `_chunk_text(text)` in `ingestion_service.py`: LlamaIndex `SentenceSplitter`, 512 tokens, 64 overlap *(needs S5-20)*
- [ ] S5-22: Implement `_embed_chunks(chunks)` in `ingestion_service.py`: Gemini `text-embedding-004`, batch 100, 768-dim *(needs S5-19, S5-21)*

---

### Group E — ML/AI: Graph & RAG

- [ ] S5-23: Implement `compute_similar_edges(chunk_ids)` in `vector_store_service.py`: query `chunk_embeddings` index, write `SIMILAR` edges ≥ 0.75 cosine *(needs S5-22)*
- [ ] S5-24: Implement `refresh_chunk_edges(chunk_id)` in `vector_store_service.py`: delete stale `SIMILAR` edges, re-run similarity for single chunk *(needs S5-23)*
- [ ] S5-25: Implement `GraphRAGService.query(notebook_id, query_text)` in `graph_rag_service.py`: embed → vector search → graph expansion → cross-notebook context → Gemini generative call *(needs S5-22, S5-23)*
- [ ] S5-26: Un-xfail `test_rag_returns_context_from_both_notebooks` and `test_isolated_notebook_gets_no_cross_notebook_context` in `test_rag_service.py` *(needs S5-25)*
- [ ] S5-27: Un-xfail SIMILAR edge tests in `test_vector_store.py` *(needs S5-23)*

---

### Group F — Frontend: RAG-Dependent Pages

- [ ] S5-28: Build `/backpack/[id]/chat` page: query input, call `queryNotebook`, render answer + sources *(needs S5-10, S5-25)*
- [ ] S5-29: Rebuild `/notes` page: replace placeholder tabs and content with real document/chunk navigation *(needs S5-25, S5-15)*

---

### Group G — Auth: Backend

- [x] S5-30: Add `JWT_SECRET` to `backend/.env.development`
- [x] S5-31: Create `backend/src/lib/auth/jwt.py`: `decode_token()` and `get_current_user()` FastAPI dependency *(needs S5-30)*
- [x] S5-32: Create `UserRepository`: `create_or_get(user_id)` that upserts a `:User` node *(needs S5-31)*
- [x] S5-33: Inject auth into `POST /notebooks`: set `owner_id = current_user` *(needs S5-31)*
- [x] S5-34: Scope `GET /notebooks` to authenticated user: filter `WHERE n.owner_id = $user_id` *(needs S5-33)*
- [x] S5-35: Guard `PATCH`, `DELETE /notebooks/{id}`, `POST /files/upload`, `POST /notebooks/{id}/tags`, `POST /notebooks/{id}/query` — 403 if ownership mismatch *(needs S5-33)*
- [x] S5-36: Add `ALLOWED_ORIGINS` setting to `backend/src/lib/config/settings.py` and update CORS in `main.py`
- [x] S5-37: Add `ALLOWED_ORIGINS` to `backend/.env.development` and `.env.staging` *(needs S5-36)*

---

### Group H — Auth: Frontend

- [ ] S5-38: Create Zustand auth store at `frontend/src/lib/store/auth.ts` (token, user display name, email, avatar)
- [ ] S5-39: Create `/login` page with auth provider sign-in flow *(needs S5-38)*
- [ ] S5-40: Wire `client.ts` auth interceptor (line 14): read token from Zustand store *(needs S5-38)*
- [ ] S5-41: Wire `client.ts` error interceptor (line 28): redirect to `/login` on 401, surface errors via toast *(needs S5-39, S5-40)*
- [ ] S5-42: Replace NavBar hardcoded user data (`"John Doe"`, `"tom@example.com"`, Unsplash avatar, Tailwind logo) with auth store values and local assets *(needs S5-38)*

---

### Group I — Testing

- [ ] S5-43: Add `tests/api/test_notebooks.py`: full CRUD integration tests against Neo4j testcontainer
- [ ] S5-44: Add `tests/api/test_files.py`: upload endpoint with GCS mock *(needs S5-43)*
- [ ] S5-45: Add `tests/api/test_courses.py`: list, add tag, remove tag *(needs S5-43)*
- [ ] S5-46: Add `tests/api/test_query.py`: stub response validation; real response validation post-S5-25 *(needs S5-25, S5-43)*
- [ ] S5-47: Set up Vitest + React Testing Library in frontend
- [ ] S5-48: Add frontend unit tests for `useNotebooks` hooks and API functions *(needs S5-47)*
- [ ] S5-49: Add auth unit tests (`decode_token`, `get_current_user`) and auth integration tests for guarded routes *(needs S5-35)*

---

### Group J — Infrastructure

- [ ] S5-50: Add Neo4j healthcheck to `backend/infrastructure/docker/docker-compose.yml`
- [ ] S5-51: Create `backend/infrastructure/docker/Dockerfile` for FastAPI backend
- [ ] S5-52: Expand `docker-compose.yml` with `api` and `frontend` services; wire `depends_on` with healthcheck *(needs S5-50, S5-51)*
