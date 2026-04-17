# RAG Implementation Guide

> Authoritative task-by-task guide for completing the NoteBud RAG pipeline.
> Tasks are ordered by dependency — each section must be completed before the next.
> Cross-reference: [rag-architecture.md](./rag-architecture.md) | [ml-integration-points.md](./ml-integration-points.md)

---

## Dependency Order

```
1.  Scope get_by_notebook to ContentChunk           (#109 / S3-19)
2.  PDF ingestion loader                            (#47 / S2-ML-2)
3.  DOCX & PPTX ingestion loaders                  (#48 / S2-ML-3)
4.  Wire Gemini embeddings into ingestion           (#127 / S6-ML-1)
5.  Wire ingestion pipeline end-to-end             (#74 / S3-4)
6.  Implement query embedding + top-K retrieval    (#50 / S2-ML-5)  — also closes #110 / S3-20
7.  Graph-walk expansion                           (#134 / S6-ML-8)
8.  Implement GraphRAGService                      (#108 / S3-18) + (#128 / S6-ML-2)
9.  Prompt assembly + citation metadata            (no issue yet)
10. Streaming response                             (#75 / S3-5)
11. Implement refresh_chunk_edges                  (#107 / S3-17)
12. Fix SIMILAR edge partial-failure handling      (#129 / S6-ML-3)
13. Fix stale SIMILAR edge scores                  (#130 / S6-ML-4)
14. Fix edges_written log count                    (#131 / S6-ML-5)
15. Update stale comments                          (#132 / S6-ML-6) + (#133 / S6-ML-7)
16. End-to-end integration test                    (no issue yet)
```

---

## Task 1 — Scope `get_by_notebook` to ContentChunk only
**Board:** #109 / S3-19 (Ready) | **Depends on:** nothing

### Problem
`ChunkRepository.get_by_notebook()` returns all `:Chunk` nodes including `:SyllabusChunk`.
SyllabusChunks were ingested with zero embeddings and must never enter vector search.
Passing them to retrieval will silently corrupt similarity scores.

### File
`backend/src/lib/repositories/chunk_repository.py` — `get_by_notebook()` (line 101)

### Change
Update the Cypher label from `:Chunk` to `:ContentChunk`:

```cypher
-- before
MATCH (nb:Notebook {id: $notebook_id})
      -[:CONTAINS]->(d:Document)
      -[:HAS_CHUNK]->(c:Chunk)

-- after
MATCH (nb:Notebook {id: $notebook_id})
      -[:CONTAINS]->(d:Document)
      -[:HAS_CHUNK]->(c:ContentChunk)
```

### Notes
- `:ContentChunk` is a sub-label of `:Chunk` — Neo4j will still match it via the label hierarchy,
  but constraining to `:ContentChunk` excludes `:SyllabusChunk` nodes at the query level.
- The vector index `chunk_embeddings` is already scoped to `:ContentChunk` (see `backend/src/lib/db/neo4j.py`).
  This change makes the repository consistent with the index.
- Add a corresponding `get_syllabus_chunks_by_notebook()` method if syllabus content needs
  to be accessed separately in future.

---

## Task 2 — PDF Ingestion Loader
**Board:** #47 / S2-ML-2 (In-Progress) | **Depends on:** nothing

### Problem
`_extract_text()` in `ingestion_service.py` returns a hardcoded placeholder string.
No real PDF text extraction exists.

### Files
- **Implement in:** `backend/src/services/ingestion/ingestion_service.py` — `_extract_text()`
- **Or:** `ml/ingestion/` — create a dedicated `pdf_loader.py` and call it from the service

### Implementation
Use LlamaIndex `PDFReader` per the architecture doc:

```python
from llama_index.readers.file import PDFReader
import tempfile, os
from google.cloud import storage

def _extract_text_pdf(gcs_uri: str) -> list[dict]:
    """Download from GCS and extract text page-by-page.

    Returns a list of dicts: {text: str, page_number: int, source_file: str}
    """
    bucket_name, blob_path = _parse_gcs_uri(gcs_uri)
    client = storage.Client()
    blob = client.bucket(bucket_name).blob(blob_path)

    with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as f:
        blob.download_to_file(f)
        tmp_path = f.name

    try:
        reader = PDFReader()
        documents = reader.load_data(file=tmp_path)
        return [
            {
                "text": doc.text,
                "page_number": doc.metadata.get("page_label"),
                "source_file": os.path.basename(blob_path),
            }
            for doc in documents
        ]
    finally:
        os.unlink(tmp_path)
```

### Constraints (from architecture doc)
- Max file size: 100 MB — reject at upload time in `files.py` router (already check this)
- Text-based PDFs only — scanned PDFs will return empty text; surface as `EXTRACTION_FAILED` error
- Add a guard: if all extracted pages are empty strings, raise `ValueError("EXTRACTION_FAILED")`

### Dependencies
```
pip install llama-index-readers-file
```
Add to `backend/requirements.txt`.

---

## Task 3 — DOCX & PPTX Ingestion Loaders
**Board:** #48 / S2-ML-3 (In-Progress) | **Depends on:** Task 2 (same pattern)

### Problem
Same as Task 2 — no loaders for DOCX or PPTX.

### Files
- `backend/src/services/ingestion/ingestion_service.py`
- Or: `ml/ingestion/docx_loader.py`, `ml/ingestion/pptx_loader.py`

### Implementation
Use LlamaIndex `DocxReader` and `PptxReader`:

```python
from llama_index.readers.file import DocxReader, PptxReader

def _extract_text_docx(gcs_uri: str) -> list[dict]:
    # Same GCS download pattern as PDF
    # DocxReader returns one Document per paragraph section
    reader = DocxReader()
    documents = reader.load_data(file=tmp_path)
    return [
        {
            "text": doc.text,
            "page_number": None,       # DOCX has no page numbers
            "source_file": filename,
        }
        for doc in documents
    ]

def _extract_text_pptx(gcs_uri: str) -> list[dict]:
    reader = PptxReader()
    documents = reader.load_data(file=tmp_path)
    return [
        {
            "text": doc.text,
            "slide_number": doc.metadata.get("slide_number"),
            "source_file": filename,
        }
        for doc in documents
    ]
```

### Constraints (from architecture doc)
- Max file size: 50 MB each
- DOCX: embedded images ignored (LlamaIndex handles this automatically)
- PPTX: speaker notes should be extracted — check that `PptxReader` includes them;
  if not, use `python-pptx` directly to iterate `slide.notes_slide.notes_text_frame`

### Dispatch
Update `_extract_text()` in `ingestion_service.py` to dispatch by file type:

```python
def _extract_text(gcs_uri: str, file_type: str) -> list[dict]:
    if file_type == "pdf":
        return _extract_text_pdf(gcs_uri)
    elif file_type == "docx":
        return _extract_text_docx(gcs_uri)
    elif file_type == "pptx":
        return _extract_text_pptx(gcs_uri)
    else:
        raise ValueError(f"Unsupported file type: {file_type}")
```

`ingest_document()` must also accept and pass through `file_type`.

---

## Task 4 — Wire Gemini Embeddings into Ingestion
**Board:** #127 / S6-ML-1 (To-do) | **Depends on:** Tasks 2–3

### Problem
`_embed_chunks()` in `ingestion_service.py` attaches `[0.0] * 768` zero vectors to every chunk.
`ml/services/gemini.py` has a fully implemented `GeminiClient.generate_embedding()` —
it just isn't called.

### Files
- `backend/src/services/ingestion/ingestion_service.py` — `_embed_chunks()`
- `ml/services/gemini.py` — `GeminiClient` (read-only reference)

### Implementation
Replace the stub with a real call:

```python
from ml.services.gemini import GeminiClient   # or import path per your module setup

_gemini = GeminiClient()   # reads GEMINI_API_KEY from env

def _embed_chunks(chunks: list[dict]) -> list[dict]:
    """Attach a real 768-dim Gemini embedding to each chunk.

    Batches up to 100 chunks per API call per architecture doc.
    """
    BATCH_SIZE = 100
    result = []
    for i in range(0, len(chunks), BATCH_SIZE):
        batch = chunks[i : i + BATCH_SIZE]
        for chunk in batch:
            chunk["embedding"] = _gemini.generate_embedding(chunk["text"])
        result.extend(batch)
    return result
```

### Notes
- `GeminiClient` uses `EMBEDDING_MODEL = "gemini-embedding-001"` and returns 768-dim vectors.
  Verify this matches the vector index dimension in Neo4j (`vector.dimensions: 768` in `neo4j.py`).
- Add retry logic around `generate_embedding()` — Gemini API can return transient 503s.
  A simple exponential backoff (3 retries, 1s/2s/4s) is sufficient for V1.
- If `GEMINI_API_KEY` is not set, raise a clear `EnvironmentError` at startup rather than
  failing silently at request time.

---

## Task 5 — Wire Ingestion Pipeline End-to-End
**Board:** #74 / S3-4 (Ready) | **Depends on:** Tasks 2–4

### Problem
The orchestration in `ingest_document()` exists but calls stubs for steps 1–3.
After Tasks 2–4 those stubs are replaced — this task wires them together and
ensures the full flow works: upload → extract → chunk → embed → store → edges.

### File
`backend/src/services/ingestion/ingestion_service.py`

### What to verify/complete

**Chunking** — `_chunk_text()` currently returns the raw text as a single chunk.
Replace with LlamaIndex `SentenceSplitter` per the architecture doc:

```python
from llama_index.core.node_parser import SentenceSplitter

_splitter = SentenceSplitter(chunk_size=512, chunk_overlap=64)

def _chunk_text(pages: list[dict]) -> list[dict]:
    """Split page-level text into 512-token chunks with 64-token overlap.

    Input: list of {text, page_number/slide_number, source_file}
    Output: list of {text, position, page_number, slide_number, source_file}
    """
    chunks = []
    position = 0
    for page in pages:
        nodes = _splitter.get_nodes_from_documents(
            [Document(text=page["text"])]
        )
        for node in nodes:
            chunks.append({
                "text": node.text,
                "position": position,
                "page_number": page.get("page_number"),
                "slide_number": page.get("slide_number"),
                "source_file": page["source_file"],
            })
            position += 1
    return chunks
```

**Metadata on chunks** — `create_chunks()` in `ChunkRepository` currently stores
`text`, `embedding`, `position`. The chunk nodes need `source_file`, `page_number`,
and `slide_number` added to the CREATE query so citations can reference them later.
Update the Cypher in `chunk_repository.py` to store these fields.

**Error surface** — `ingest_document()` should map internal errors to the error codes
defined in `ml-integration-points.md`: `EXTRACTION_FAILED`, `EMBEDDING_FAILED`, `STORAGE_FAILED`.

### Stale comment to fix
`ingestion_service.py` line 73 still reads `"compute_similar_edges() (stub — S3-16b)"`.
Update to `"compute_similar_edges() (implemented — see vector_store_service.py)"`.

---

## Task 6 — Query Embedding + Top-K Retrieval
**Board:** #50 / S2-ML-5 (In-Progress) — also closes #110 / S3-20 | **Depends on:** Tasks 1, 4, 5

### Problem
No retrieval function exists. The vector index is ready in Neo4j but nothing queries it
with a user's question at request time.

### Files
- **Create:** `backend/src/lib/repositories/chunk_repository.py` — add `search_similar()`
- **Create:** `backend/src/services/retrieval/retrieval_service.py` (new file)

### Implementation

**Step 1 — embed the query** (in retrieval service):
```python
from ml.services.gemini import GeminiClient

async def retrieve_chunks(
    driver: AsyncDriver,
    notebook_id: str,
    query: str,
    top_k: int = 5,
) -> list[dict]:
    gemini = GeminiClient()
    query_embedding = gemini.generate_embedding(query)
    repo = ChunkRepository(driver)
    return await repo.search_similar(notebook_id, query_embedding, top_k)
```

**Step 2 — vector search scoped to notebook** (in ChunkRepository):
```python
async def search_similar(
    self,
    notebook_id: str,
    query_embedding: list[float],
    top_k: int = 5,
    score_threshold: float = 0.70,
) -> list[dict]:
    """Return top-K ContentChunks for a notebook by cosine similarity."""
    query = """
        MATCH (nb:Notebook {id: $notebook_id})
              -[:CONTAINS]->(d:Document)
              -[:HAS_CHUNK]->(c:ContentChunk)
        WITH collect(c) AS notebook_chunks
        CALL db.index.vector.queryNodes(
            'chunk_embeddings', $top_k * 3, $query_embedding
        ) YIELD node AS candidate, score
        WHERE candidate IN notebook_chunks
          AND score >= $score_threshold
        RETURN candidate.id        AS chunk_id,
               candidate.text      AS content,
               candidate.source_file AS source_file,
               candidate.page_number AS page_number,
               candidate.slide_number AS slide_number,
               candidate.position  AS chunk_index,
               score               AS similarity_score
        ORDER BY score DESC
        LIMIT $top_k
    """
    async with self._driver.session() as session:
        result = await session.run(
            query,
            notebook_id=notebook_id,
            query_embedding=query_embedding,
            top_k=top_k,
            score_threshold=score_threshold,
        )
        return await result.data()
```

### Notes
- `top_k * 3` is fetched from the index then filtered to the notebook — this over-fetches
  intentionally because the vector index is global (all notebooks) and we filter after.
  Adjust the multiplier if notebooks grow very large.
- Return empty list (not an error) when no chunks meet the threshold — the caller handles
  the "no relevant content" case.
- The `score_threshold` default of `0.70` matches the architecture doc.

---

## Task 7 — Graph-Walk Expansion
**Board:** no issue yet — create one | **Depends on:** Task 6

### Problem
Pure vector retrieval returns isolated chunks. SIMILAR and NEXT edges in Neo4j allow
the retrieval to pull in neighbouring chunks for richer context without extra embedding calls.

### File
`backend/src/services/retrieval/retrieval_service.py`

### Implementation
After retrieving top-K chunks, walk their NEXT and SIMILAR edges one hop:

```python
async def expand_chunks(
    driver: AsyncDriver,
    seed_chunk_ids: list[str],
    max_expansion: int = 2,
) -> list[dict]:
    """Walk NEXT and SIMILAR edges from seed chunks to gather context neighbours.

    max_expansion: max hops to walk (keep low — 1 or 2 — to avoid context bloat).
    """
    query = """
        UNWIND $seed_ids AS seed_id
        MATCH (seed:ContentChunk {id: seed_id})
        OPTIONAL MATCH (seed)-[:NEXT*1..2]-(neighbour:ContentChunk)
        OPTIONAL MATCH (seed)-[:SIMILAR]-(similar:ContentChunk)
        WITH collect(DISTINCT neighbour) + collect(DISTINCT similar) AS extras
        UNWIND extras AS extra
        WHERE extra IS NOT NULL AND NOT extra.id IN $seed_ids
        RETURN DISTINCT
            extra.id          AS chunk_id,
            extra.text        AS content,
            extra.source_file AS source_file,
            extra.page_number AS page_number,
            extra.slide_number AS slide_number,
            extra.position    AS chunk_index,
            0.0               AS similarity_score   -- expanded chunks have no direct score
    """
    async with driver.session() as session:
        result = await session.run(query, seed_ids=seed_chunk_ids)
        return await result.data()
```

Merge seed + expanded chunks in `retrieve_chunks()`, deduplicating by `chunk_id`.
Keep seed chunks first (they are the most relevant); expansion chunks follow.

### Notes
- Cap total context at 10–12 chunks before passing to Gemini to stay within prompt limits.
- SIMILAR edge walking is most valuable; NEXT edge walking preserves narrative continuity.
- Do not walk SIMILAR edges of expanded chunks (only seed → neighbour, not seed → neighbour → neighbour).

---

## Task 8 — Implement GraphRAGService
**Board:** #108 / S3-18 (Ready) + #128 / S6-ML-2 (To-do) | **Depends on:** Tasks 6–7

### Problem
`GraphRAGService.query()` at `backend/src/services/rag/graph_rag_service.py`
returns a hardcoded `"RAG service pending ML implementation"` string.

### File
`backend/src/services/rag/graph_rag_service.py`

### Implementation
Replace the stub with real retrieval + generation:

```python
from src.services.retrieval.retrieval_service import retrieve_chunks, expand_chunks
from ml.services.gemini import GeminiClient

class GraphRAGService:
    def __init__(self, driver: AsyncDriver):
        self._driver = driver
        self._gemini = GeminiClient()

    async def query(self, notebook_id: str, query_text: str) -> dict:
        # 1. Retrieve top-K chunks by vector similarity
        seed_chunks = await retrieve_chunks(self._driver, notebook_id, query_text, top_k=5)

        if not seed_chunks:
            return {
                "answer": "No relevant content found in this notebook for your question.",
                "citations": [],
                "groundedness_score": 0.0,
                "groundedness_warning": "No matching content found.",
            }

        # 2. Expand via graph walk
        seed_ids = [c["chunk_id"] for c in seed_chunks]
        expanded = await expand_chunks(self._driver, seed_ids)
        all_chunks = seed_chunks + expanded   # seeds first, then context neighbours

        # 3. Assemble prompt and generate answer (see Task 9)
        prompt = _build_prompt(query_text, all_chunks)
        answer_text = self._gemini.generate_response(prompt)

        # 4. Build citations from seed chunks only (not expanded neighbours)
        citations = _build_citations(seed_chunks)

        # 5. Compute groundedness score (see Task 9)
        groundedness_score = _compute_groundedness(answer_text, seed_chunks)

        return {
            "answer": answer_text,
            "citations": citations,
            "groundedness_score": groundedness_score,
            "groundedness_warning": (
                "Low confidence: answer may not be fully supported by your notes."
                if groundedness_score < 0.5 else None
            ),
        }
```

---

## Task 9 — Prompt Assembly + Citation Metadata
**Board:** no issue yet — create one | **Depends on:** Task 8

### Problem
No prompt builder or citation builder exists. The query endpoint's `QueryResponse`
schema only has `answer: str` and `sources: list[str]` — too thin for real citations.

### Part A — Update QueryResponse schema

**File:** `backend/src/api/routers/query.py` (or a schemas file)

```python
class Citation(BaseModel):
    chunk_id: str
    source_file: str
    page_number: int | None
    slide_number: int | None
    excerpt: str                  # first 200 chars of the chunk

class QueryResponse(BaseModel):
    answer: str
    citations: list[Citation]
    groundedness_score: float
    groundedness_warning: str | None
```

### Part B — Prompt builder

```python
def _build_prompt(question: str, chunks: list[dict]) -> str:
    context_lines = []
    for i, chunk in enumerate(chunks, 1):
        source = chunk["source_file"]
        loc = f"Page {chunk['page_number']}" if chunk.get("page_number") else \
              f"Slide {chunk['slide_number']}" if chunk.get("slide_number") else "—"
        context_lines.append(f"[Chunk {i}] (Source: {source}, {loc})\n{chunk['content']}")

    context = "\n\n".join(context_lines)

    return f"""You are a study assistant for NoteBud. Answer the student's question \
using ONLY the provided context chunks. If the answer cannot be found in the context, \
say so clearly. Do not hallucinate.

Context:
{context}

Question: {question}

Answer:"""
```

Matches the prompt structure in `rag-architecture.md` exactly.

### Part C — Citation builder

```python
def _build_citations(chunks: list[dict]) -> list[dict]:
    return [
        {
            "chunk_id": c["chunk_id"],
            "source_file": c["source_file"],
            "page_number": c.get("page_number"),
            "slide_number": c.get("slide_number"),
            "excerpt": c["content"][:200],
        }
        for c in chunks
    ]
```

### Part D — Groundedness score

Simple V1 approach — ratio of answer sentences that contain a substring from any chunk:

```python
def _compute_groundedness(answer: str, chunks: list[dict]) -> float:
    sentences = [s.strip() for s in answer.split(".") if s.strip()]
    if not sentences:
        return 0.0
    chunk_texts = " ".join(c["content"] for c in chunks).lower()
    grounded = sum(
        1 for s in sentences
        if any(word in chunk_texts for word in s.lower().split() if len(word) > 4)
    )
    return round(grounded / len(sentences), 2)
```

This is deliberately simple. A more robust approach (Gemini-based attribution scoring)
can replace it in a later sprint.

---

## Task 10 — Streaming Response
**Board:** #75 / S3-5 (Ready) | **Depends on:** Tasks 8–9

### Problem
The query endpoint returns a plain synchronous response. The architecture doc requires streaming.

### Files
- `backend/src/api/routers/query.py`
- `ml/services/gemini.py` — add `generate_response_stream()`

### Part A — Add streaming to GeminiClient

```python
from collections.abc import Generator

def generate_response_stream(self, prompt: str) -> Generator[str, None, None]:
    """Stream response tokens from Gemini."""
    response = self._client.models.generate_content_stream(
        model=self.GENERATION_MODEL,
        contents=prompt,
        config={"temperature": 0.2, "max_output_tokens": 1024},
    )
    for chunk in response:
        if chunk.text:
            yield chunk.text
```

### Part B — Streaming endpoint

```python
from fastapi.responses import StreamingResponse
import json

@router.post("/{notebook_id}/query/stream")
async def query_notebook_stream(
    notebook_id: str,
    body: QueryRequest,
    driver: AsyncDriver = Depends(get_driver),
):
    """Server-Sent Events stream for RAG answers."""
    service = GraphRAGService(driver)

    async def event_stream():
        # Send citations first as a metadata event
        seed_chunks = await retrieve_chunks(driver, notebook_id, body.query)
        citations = _build_citations(seed_chunks)
        yield f"data: {json.dumps({'type': 'citations', 'citations': citations})}\n\n"

        # Stream answer tokens
        prompt = _build_prompt(body.query, seed_chunks)
        for token in service._gemini.generate_response_stream(prompt):
            yield f"data: {json.dumps({'type': 'token', 'text': token})}\n\n"

        yield "data: [DONE]\n\n"

    return StreamingResponse(event_stream(), media_type="text/event-stream")
```

### Notes
- Keep the existing non-streaming `POST /{notebook_id}/query` endpoint — the frontend
  may not always need streaming (e.g., for automated tests).
- The frontend needs to consume SSE via `EventSource` or `fetch` with `ReadableStream`.

---

## Task 11 — Implement `refresh_chunk_edges`
**Board:** #107 / S3-17 (Ready) | **Depends on:** Task 8

### Problem
`refresh_chunk_edges()` in `vector_store_service.py` is a stub.
It will be called when a document's embeddings are updated (e.g., after re-ingestion).

### File
`backend/src/services/vector_store/vector_store_service.py`

### Implementation
For a single chunk: delete its existing SIMILAR edges, then re-query the vector index
and rebuild them.

```python
async def refresh_chunk_edges(driver: AsyncDriver, chunk_id: str) -> None:
    """Delete and recompute SIMILAR edges for a single ContentChunk."""
    # 1. Delete existing edges
    async with driver.session() as session:
        await session.run(
            "MATCH (c:ContentChunk {id: $chunk_id})-[r:SIMILAR]-() DELETE r",
            chunk_id=chunk_id,
        )
    # 2. Recompute
    await compute_similar_edges(driver, [chunk_id])
    logger.info("refresh_chunk_edges: refreshed edges for chunk %s", chunk_id)
```

### Notes
- The current signature `refresh_chunk_edges(chunk_id: str)` lacks a `driver` parameter.
  Add `driver: AsyncDriver` as the first argument (breaking change — update all call sites).
- If re-ingestion replaces a whole document, call this for all chunk IDs of that document,
  not just one. Consider a `refresh_document_edges(driver, document_id)` wrapper.

---

## Task 12 — Fix SIMILAR Edge Partial-Failure Handling
**Board:** #129 / S6-ML-3 (To-do) | **Depends on:** nothing (standalone fix)

### Problem
In `compute_similar_edges()`, each chunk's read + write queries run as separate auto-commit
operations within the same session. If a write fails mid-batch (e.g., Gemini timeout,
Neo4j transient error), the batch is left in a partially-written state with no rollback.

### File
`backend/src/services/vector_store/vector_store_service.py` — `compute_similar_edges()`

### Fix
Wrap each chunk's read + write inside an explicit transaction:

```python
async with driver.session() as session:
    for chunk_id in batch:
        async with session.begin_transaction() as tx:
            # run read query on tx
            # run write query on tx
            await tx.commit()
```

Alternatively, batch the writes: collect all pairs for the entire batch first,
then write them in a single transaction per batch.

---

## Task 13 — Fix Stale SIMILAR Edge Scores on Recomputation
**Board:** #130 / S6-ML-4 (To-do) | **Depends on:** Task 11

### Problem
`MERGE (a)-[r1:SIMILAR]-(b) ON CREATE SET r1.score = pair.score` only sets the score
on creation. When `refresh_chunk_edges` recomputes edges after re-ingestion,
existing edges keep their original score. The score silently diverges from the true
current cosine similarity.

### File
`backend/src/services/vector_store/vector_store_service.py`

### Fix
Add `ON MATCH SET` to keep scores current:

```cypher
MERGE (a)-[r1:SIMILAR]-(b)
  ON CREATE SET r1.score = pair.score
  ON MATCH SET  r1.score = pair.score
```

---

## Task 14 — Fix `edges_written` Log Count
**Board:** #131 / S6-ML-5 (To-do) | **Depends on:** nothing (logging fix only)

### Problem
`RETURN count(r1) AS edges_written` counts all pairs in the UNWIND,
not only newly created edges. On reruns the log is inflated.

### File
`backend/src/services/vector_store/vector_store_service.py`

### Fix
Track created vs matched using a flag property:

```cypher
MERGE (a)-[r1:SIMILAR]-(b)
  ON CREATE SET r1.score = pair.score, r1._new = true
  ON MATCH SET  r1.score = pair.score, r1._new = false
WITH r1 WHERE r1._new = true
RETURN count(r1) AS edges_written
```

Or use Neo4j's `summary.counters.relationships_created` from the result summary
instead of a RETURN clause.

---

## Task 15 — Update Stale Comments
**Board:** #132 / S6-ML-6 (To-do) + #133 / S6-ML-7 (To-do) | **Depends on:** nothing

### Changes needed

| File | Line | Current (wrong) | Correct |
|------|------|-----------------|---------|
| `backend/src/services/ingestion/ingestion_service.py` | 73 | `compute_similar_edges() (stub — S3-16b)` | `compute_similar_edges() (implemented — vector_store_service.py)` |
| `ml/retrieval/__init__.py` | comment | references `pgvector` | update to reference Neo4j vector index `chunk_embeddings` |
| `docs/rag-architecture.md` | Flow 4 | describes pgvector/PostgreSQL schema | update to describe Neo4j vector index (see `backend/src/lib/db/neo4j.py`) |
| `docs/ml-integration-points.md` | error codes | `STORAGE_FAILED: Could not write chunks to pgvector` | replace "pgvector" with "Neo4j" |

---

## Task 16 — End-to-End Integration Test
**Board:** no issue yet — create one | **Depends on:** all above

### Problem
No test exercises the full flow: file upload → ingestion → chunking → embedding →
storage → query → answer. Unit tests exist for storage and edges individually but
a mid-pipeline failure would go undetected until production.

### File
Create `backend/tests/services/test_rag_e2e.py`

### What to test

```
1. Upload a small test PDF (3–5 pages) → call ingest_document()
2. Assert ContentChunk nodes were created in Neo4j with non-zero embeddings
3. Assert SIMILAR edges were created between chunks
4. Call retrieve_chunks() with a question that has a known answer in the test doc
5. Assert at least one chunk is returned with similarity_score >= 0.70
6. Call GraphRAGService.query() with the same question
7. Assert answer is non-empty, citations list is non-empty
8. Assert groundedness_score > 0.0
```

### Notes
- Use a real (small) test PDF committed to `backend/tests/fixtures/` — do not mock extraction.
- The Gemini API calls can be mocked for CI (return deterministic embeddings + answer),
  but a manual smoke test against the real API should be run before each release.
- Mark the test with `@pytest.mark.integration` so it is skipped in unit test runs
  (`pytest -m "not integration"` in CI).

---

*Last updated: 2026-03-30 | Derived from codebase analysis on auth-backend-fix + feature/backpack-notes-ui branches*
