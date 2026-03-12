# RAG Architecture Document

> **Sprint 1 — ML Team | NoteBud**
> This document describes the full Retrieval-Augmented Generation (RAG) pipeline for NoteBud. It is the authoritative reference for both backend and frontend teams to understand what the ML system does, enabling correct integration in Sprint 2.

---

## Overview

NoteBud's RAG pipeline transforms user-uploaded course materials into a Q&A system grounded in the student's own notes. When a user asks a question, the system retrieves the most relevant chunks from their notebook and passes them to an LLM (Gemini) to generate a cited, grounded answer.

The pipeline consists of **7 sequential flows**:

1. Ingestion
2. Chunking
3. Embedding
4. Vector Storage
5. Retrieval
6. Answer Generation
7. Citation

---

## Flow 1: Ingestion

**What goes in:** A raw file uploaded by the user (PDF, DOCX, or PPTX), along with metadata (notebook_id, user_id, original filename).

**What comes out:** Raw extracted text and page/slide-level metadata ready for chunking.

**Tool / Model:** LlamaIndex `SimpleDirectoryReader` or document loaders per file type.

### Supported File Types (V1)

| File Type | Loader | Constraints |
|-----------|--------|-------------|
| PDF | `PDFReader` (LlamaIndex) | Max 100 MB; text-based PDFs only (no scanned images) |
| DOCX | `DocxReader` (LlamaIndex) | Max 50 MB; embedded images ignored |
| PPTX | `PptxReader` (LlamaIndex) | Max 50 MB; speaker notes extracted; images ignored |

> **Note:** Scanned/image-only PDFs are not supported in V1. Files exceeding size limits are rejected at upload time by the backend.

---

## Flow 2: Chunking

**What goes in:** Raw extracted text from ingestion.

**What comes out:** A list of text chunks with positional metadata (source file, page/slide number, chunk index).

**Tool / Model:** LlamaIndex `SentenceSplitter`.

### Strategy

- **Chunk size:** 512 tokens
- **Chunk overlap:** 64 tokens (to preserve context across boundaries)
- **Split boundary:** Sentence boundaries preferred; hard split at token limit
- Each chunk retains: `source_file`, `page_number` (PDF) or `slide_number` (PPTX), `chunk_index`

---

## Flow 3: Embedding

**What goes in:** Individual text chunks (strings).

**What comes out:** A 768-dimensional dense vector per chunk representing semantic meaning.

**Tool / Model:** Gemini Embedding API (`models/text-embedding-004`).

### Details

- Model: `text-embedding-004` via Gemini API
- Output dimension: 768
- Batch size: Up to 100 chunks per API call
- Each embedding is stored alongside its chunk text and metadata

---

## Flow 4: Vector Storage

**What goes in:** Text chunks + their 768-dim embedding vectors + metadata.

**What comes out:** Persisted records in the vector store, queryable by notebook_id.

**Tool / Model:** PostgreSQL with `pgvector` extension.

### Schema (chunks table)

```sql
CREATE TABLE chunks (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notebook_id UUID NOT NULL REFERENCES notebooks(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL,
  source_file TEXT NOT NULL,
  page_number INT,
  chunk_index INT NOT NULL,
  content     TEXT NOT NULL,
  embedding   VECTOR(768),
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX ON chunks USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);
```

---

## Flow 5: Retrieval

**What goes in:** A user's natural language question + `notebook_id` (scopes retrieval to that course notebook).

**What comes out:** Top-K most semantically relevant chunks with similarity scores.

**Tool / Model:** pgvector cosine similarity search.

### Details

- The question is first embedded using the same Gemini embedding model
- Cosine similarity search is run against all chunks belonging to `notebook_id`
- **Top K:** 5 chunks returned by default (configurable)
- **Similarity threshold:** Chunks with cosine similarity < 0.70 are excluded
- Returned chunks include: `chunk_id`, `content`, `source_file`, `page_number`, `chunk_index`, `similarity_score`

---

## Flow 6: Answer Generation

**What goes in:** The user's question + top-K retrieved chunks (as context).

**What comes out:** A natural language answer grounded in the provided chunks.

**Tool / Model:** Gemini API (`gemini-1.5-flash`).

### Prompt Structure

```
System: You are a study assistant for NoteBud. Answer the student's question 
using ONLY the provided context chunks. If the answer cannot be found in the 
context, say so clearly. Do not hallucinate.

Context:
[Chunk 1]: <content> (Source: <file>, Page <N>)
[Chunk 2]: <content> (Source: <file>, Page <N>)
...

Question: <user_question>

Answer:
```

### Parameters

- `temperature`: 0.2 (low, for factual grounding)
- `max_output_tokens`: 1024
- `top_p`: 0.9

---

## Flow 7: Citation

**What goes in:** The generated answer + the source chunks used as context.

**What comes out:** The answer annotated with inline citations referencing the exact source chunks.

**Tool / Model:** Post-processing logic (rule-based matching + Gemini for citation insertion).

### Citation Format

Each citation references:
- `source_file`: original filename
- `page_number` or `slide_number`: where in the document
- `chunk_id`: unique identifier for the chunk (for frontend deep-linking)

### Groundedness Score

A **groundedness score** (0.0–1.0) is computed as:
- Ratio of answer sentences that map to at least one retrieved chunk
- If groundedness < 0.5, the response includes a warning: `"Low confidence: answer may not be fully supported by your notes."`

---

## End-to-End Data Flow Summary

```
User uploads file
        │
        ▼
 [1] Ingestion ──────────────── Raw text + metadata
        │
        ▼
 [2] Chunking ───────────────── 512-token chunks w/ overlap
        │
        ▼
 [3] Embedding ──────────────── 768-dim vectors (Gemini)
        │
        ▼
 [4] Vector Storage ─────────── PostgreSQL + pgvector


User asks a question
        │
        ▼
 [5] Retrieval ──────────────── Top-5 chunks by cosine similarity
        │
        ▼
 [6] Answer Generation ──────── Gemini 1.5 Flash w/ grounded prompt
        │
        ▼
 [7] Citation ───────────────── Inline citations + groundedness score
        │
        ▼
    Response to user
```

---

## V1 Supported File Types Summary

| Format | Supported | Max Size | Notes |
|--------|-----------|----------|-------|
| PDF    | Yes       | 100 MB   | Text-based only; scanned PDFs not supported |
| DOCX   | Yes       | 50 MB    | Embedded images ignored |
| PPTX   | Yes       | 50 MB    | Speaker notes extracted; images ignored |
| Images (PNG, JPG) | No | — | Not supported in V1 |
| Audio/Video | No  | — | Not supported in V1 |

---

## Key Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Embedding model | Gemini `text-embedding-004` | Consistent with LLM provider; 768 dims is a good balance |
| Vector DB | pgvector on PostgreSQL | Avoids a separate vector DB service; already using Postgres |
| Chunk size | 512 tokens / 64 overlap | Standard RAG best practice; balances context and precision |
| LLM | Gemini 1.5 Flash | Fast, cost-effective, large context window |
| Retrieval scope | Per `notebook_id` | Ensures answers only come from the user's relevant course notes |

---

*Last updated: 2026-03-12 | Author: alzxandzr (ML Team)*
