# ML Integration Points with Backend

> **Sprint 1 — ML Team | NoteBud**
> This document defines exactly what the backend sends to the ML service and what it receives back at each integration point. Backend engineers must read this before implementing upload handling and retrieval endpoints.
>
> **Depends on:** [RAG Architecture Document](./rag-architecture.md)

---

## Overview

There are **4 integration points** between the backend and the ML service:

| # | Integration Point | Direction | Trigger |
|---|-------------------|-----------|---------|
| 1 | File Upload → Ingestion Trigger | Backend → ML | User uploads a file |
| 2 | Ingestion Service Request/Response | Backend ↔ ML | Backend calls ML ingestion endpoint |
| 3 | Retrieval Service Request/Response | Backend ↔ ML | User submits a Q&A query |
| 4 | Answer Response (final) | ML → Backend | ML returns generated answer |

---

## Integration Point 1: Backend → ML After File Upload

### Context
When a user uploads a file to their notebook, the backend stores the file (e.g., in GCS/S3) and then notifies the ML service to begin ingestion.

### What Backend Sends to ML

**Endpoint:** `POST /ml/ingest`

**Request Body:**
```json
{
  "notebook_id": "uuid",
  "user_id": "uuid",
  "file_id": "uuid",
  "file_url": "string",
  "file_name": "string",
  "file_type": "pdf" | "docx" | "pptx",
  "file_size_bytes": "integer"
}
```

**Field Descriptions:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `notebook_id` | UUID | Yes | The notebook this file belongs to |
| `user_id` | UUID | Yes | Owner of the notebook |
| `file_id` | UUID | Yes | Unique identifier for this file (used for deduplication and chunk tracking) |
| `file_url` | string | Yes | Presigned or internal URL where the ML service can download the file |
| `file_name` | string | Yes | Original filename (e.g., `lecture_notes_week3.pdf`) |
| `file_type` | enum | Yes | One of: `pdf`, `docx`, `pptx` |
| `file_size_bytes` | integer | Yes | File size in bytes (used for pre-validation) |

---

## Integration Point 2: Ingestion Service — What It Receives and Returns

### Context
The ML ingestion service processes the file: extracts text, chunks it, generates embeddings, and stores vectors in pgvector. This is an async operation.

### What ML Receives
Same payload as Integration Point 1 (`POST /ml/ingest`).

### Immediate Response (Acknowledgement)

**Status:** `202 Accepted`

```json
{
  "status": "queued",
  "job_id": "uuid",
  "message": "File ingestion started. Check job status via /ml/ingest/status/{job_id}"
}
```

### Completion Callback (ML → Backend)

Once ingestion completes, ML calls the backend's webhook:

**Endpoint:** `POST /api/files/{file_id}/ingestion-complete` (backend-owned)

**Payload on Success:**
```json
{
  "file_id": "uuid",
  "notebook_id": "uuid",
  "status": "success",
  "chunks_created": "integer",
  "processing_time_ms": "integer"
}
```

**Payload on Failure:**
```json
{
  "file_id": "uuid",
  "notebook_id": "uuid",
  "status": "failed",
  "error_code": "string",
  "error_message": "string"
}
```

**Error Codes:**

| Code | Meaning |
|------|---------|
| `UNSUPPORTED_FILE_TYPE` | File type not in [pdf, docx, pptx] |
| `FILE_TOO_LARGE` | File exceeds size limits |
| `EXTRACTION_FAILED` | Could not extract text (e.g., scanned PDF) |
| `EMBEDDING_FAILED` | Gemini embedding API error |
| `STORAGE_FAILED` | Could not write chunks to pgvector |

---

## Integration Point 3: Retrieval Service — What It Receives and Returns

### Context
When a user asks a question in their notebook's Q&A interface, the backend sends the query to the ML retrieval service, which returns relevant chunks.

### What Backend Sends to ML

**Endpoint:** `POST /ml/retrieve`

**Request Body:**
```json
{
  "notebook_id": "uuid",
  "user_id": "uuid",
  "query": "string",
  "top_k": "integer"
}
```

**Field Descriptions:**

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `notebook_id` | UUID | Yes | — | Scopes retrieval to this notebook only |
| `user_id` | UUID | Yes | — | Used for auth verification |
| `query` | string | Yes | — | The user's natural language question |
| `top_k` | integer | No | `5` | Number of chunks to return (max: 10) |

### What ML Returns

**Status:** `200 OK`

```json
{
  "query": "string",
  "notebook_id": "uuid",
  "chunks": [
    {
      "chunk_id": "uuid",
      "content": "string",
      "source_file": "string",
      "page_number": "integer | null",
      "slide_number": "integer | null",
      "chunk_index": "integer",
      "similarity_score": "float"
    }
  ],
  "retrieval_time_ms": "integer"
}
```

**Chunk Field Descriptions:**

| Field | Type | Description |
|-------|------|-------------|
| `chunk_id` | UUID | Unique ID of the chunk (for citation deep-linking) |
| `content` | string | The raw text of the chunk |
| `source_file` | string | Original filename the chunk came from |
| `page_number` | integer or null | Page number (PDF only; null for DOCX/PPTX) |
| `slide_number` | integer or null | Slide number (PPTX only; null for PDF/DOCX) |
| `chunk_index` | integer | Sequential position of chunk within the source file |
| `similarity_score` | float (0.0–1.0) | Cosine similarity score; higher = more relevant |

> **Note:** Only chunks with `similarity_score >= 0.70` are returned. If no chunks meet this threshold, `chunks` will be an empty array.

**Empty Result Response:**
```json
{
  "query": "string",
  "notebook_id": "uuid",
  "chunks": [],
  "retrieval_time_ms": "integer",
  "warning": "No relevant content found in this notebook for the given query."
}
```

---

## Integration Point 4: Answer Response — What the Final Response Includes

### Context
After retrieval, the ML service calls Gemini to generate an answer and returns the full response to the backend, which forwards it to the frontend.

### Full Answer Response

**Endpoint:** `POST /ml/answer`

**Request Body (Backend → ML):**
```json
{
  "notebook_id": "uuid",
  "user_id": "uuid",
  "query": "string",
  "top_k": "integer"
}
```
*(The `/ml/answer` endpoint internally calls retrieval + Gemini generation in one step.)*

**Response Body (ML → Backend):**
```json
{
  "query": "string",
  "notebook_id": "uuid",
  "answer_text": "string",
  "citations": [
    {
      "chunk_id": "uuid",
      "source_file": "string",
      "page_number": "integer | null",
      "slide_number": "integer | null",
      "excerpt": "string"
    }
  ],
  "groundedness_score": "float",
  "groundedness_warning": "string | null",
  "processing_time_ms": "integer"
}
```

**Field Descriptions:**

| Field | Type | Description |
|-------|------|-------------|
| `answer_text` | string | The generated natural language answer |
| `citations` | array | List of source chunks the answer draws from |
| `citations[].chunk_id` | UUID | For frontend deep-linking to the exact chunk |
| `citations[].source_file` | string | Filename of the source document |
| `citations[].page_number` | integer or null | Page reference (PDF) |
| `citations[].slide_number` | integer or null | Slide reference (PPTX) |
| `citations[].excerpt` | string | Short snippet from the chunk used in the answer |
| `groundedness_score` | float (0.0–1.0) | How well the answer is supported by retrieved chunks |
| `groundedness_warning` | string or null | Set to a warning message if `groundedness_score < 0.5`; otherwise `null` |
| `processing_time_ms` | integer | Total time for retrieval + generation in milliseconds |

### Groundedness Score

| Score Range | Meaning | Warning Shown? |
|-------------|---------|----------------|
| 0.8 – 1.0 | Highly grounded | No |
| 0.5 – 0.79 | Partially grounded | No |
| 0.0 – 0.49 | Low grounding | Yes: `"Low confidence: answer may not be fully supported by your notes."` |

---

## Summary Table

| Integration Point | Endpoint | Method | Caller | Sync/Async |
|-------------------|----------|--------|--------|------------|
| 1. Upload trigger | `POST /ml/ingest` | POST | Backend | Async |
| 2. Ingestion complete | `POST /api/files/{file_id}/ingestion-complete` | POST | ML (callback) | Async |
| 3. Retrieval | `POST /ml/retrieve` | POST | Backend | Sync |
| 4. Full answer | `POST /ml/answer` | POST | Backend | Sync |

---

## Error Handling (All Endpoints)

All ML endpoints return standard error responses:

```json
{
  "error": true,
  "error_code": "string",
  "message": "string",
  "status_code": "integer"
}
```

| HTTP Status | Meaning |
|-------------|---------|
| `400` | Bad request (missing/invalid fields) |
| `401` | Unauthorized (invalid user_id or notebook access) |
| `404` | Notebook or file not found |
| `422` | Unprocessable entity (e.g., file format rejected) |
| `500` | Internal ML service error |
| `503` | Gemini API unavailable |

---

*Last updated: 2026-03-12 | Author: alzxandzr (ML Team) | Depends on: S1-11*
