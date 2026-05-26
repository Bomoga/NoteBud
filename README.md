# NoteBud

**NoteBud is an AI-powered study companion that organizes coursework into per-class notebooks with RAG-powered chat, a rich notes editor, file ingestion, and a built-in study environment.**

---

## Features

- **Backpack** — A workspace of course notebooks, each storing uploaded files, transcripts, and notes with AI-powered Q&A
- **Chat** — Notebook-scoped RAG chat with citations, groundedness indicators, and streaming responses
- **Notes Editor** — Tiptap-based rich-text editor with task lists, code blocks, and floating menus, scoped to each notebook at `/backpack/:id/notes`
- **Connections Panel** — D3-force graph visualization of relationships between notebook documents and concepts
- **File Management** — Upload and manage documents per notebook; files are ingested into the vector index automatically
- **Study Environment** — Deep Focus mode, Pomodoro timer, and ambient audio for long sessions
- **Authentication** — Username/password registration and login with JWT; protected routes throughout

---

## Tech Stack

### Frontend

- **Next.js 16 / React 19** — App router, SSR, routing
- **TypeScript** — Type safety
- **Tailwind CSS** — Styling
- **Tiptap** — Rich-text notes editor
- **TanStack React Query** — Server state and caching
- **Zustand** — Client-side global state (auth, UI)
- **Framer Motion** — Animations
- **D3-force** — Graph visualization
- **Axios** — HTTP client

### Backend

- **FastAPI** — Python REST API
- **Neo4j** — Graph store for notebooks, documents, chunks, and relationships; vector index for semantic search
- **neo4j-graphrag** — Graph RAG utilities
- **LlamaIndex** — Document loading, chunking, and RAG pipeline
- **Google GenAI (Gemini)** — LLM for answer generation and embeddings
- **Google Cloud Storage** — File and banner storage
- **Pydantic** — Request/response validation
- **PyJWT + passlib** — Authentication

### Infrastructure

- **Docker + Docker Compose** — Neo4j database with APOC plugin
- **GitHub Actions** — CI runs backend tests (pytest + Neo4j service) and frontend build on every push/PR

---

## Getting Started

### Prerequisites

- Docker & Docker Compose
- Node.js 20+
- Python 3.12+

### Local Development

```bash
# Clone the repository
git clone <repo-url>
cd NoteBud

# 1. Start Neo4j
cd backend/infrastructure/docker
docker compose up -d
cd ../../..

# 2. Backend
cd backend
cp .env.example .env   # fill in NEO4J_*, GEMINI_API_KEY, GCS credentials
pip install -r requirements.txt
uvicorn src.api.main:app --reload --port 8000
# Health check: http://localhost:8000/api/v1/health

# 3. Frontend
cd frontend
npm install
# echo 'NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1' > .env.local
npm run dev
```

**Backend `.env`:** Copy `backend/.env.example` to `.env`. Set `NEO4J_URI`, `NEO4J_USERNAME`, and `NEO4J_PASSWORD` to match `backend/infrastructure/docker/docker-compose.yml` (defaults: `neo4j` / `notebud_password`). Graph constraints and indexes are applied at API startup — no migration step required.

---

## Project Structure

```
NoteBud/
├── backend/          # FastAPI service (routers: auth, notebooks, notes, chat, files, users, events)
├── frontend/         # Next.js app (pages: /, /login, /register, /backpack, /backpack/[id], /backpack/[id]/notes)
├── ml/               # ML pipeline (chunking, embeddings, ingestion, retrieval)
├── docs/             # Architecture docs and API contracts
└── shared/           # Shared utilities
```

---

## API Highlights

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v1/auth/register` | Register a new user |
| POST | `/api/v1/auth/token` | Login, returns JWT |
| GET/POST | `/api/v1/notebooks` | List / create notebooks |
| GET | `/api/v1/notebooks/:id` | Get notebook detail |
| POST | `/api/v1/notebooks/:id/chat` | Streaming RAG chat |
| POST | `/api/v1/files` | Upload a file to a notebook |
| GET/POST | `/api/v1/notes` | List / create notes |

Full auth contract: [docs/api-contracts/AUTH.md](docs/api-contracts/AUTH.md)

---

## Git Workflow

| Branch | Purpose |
|--------|---------|
| `main` | Production-ready, protected |
| `dev` | Integration branch |
| `feature/*` | Feature development |
| `bugfix/*` | Bug fixes |
| `hotfix/*` | Emergency production fixes |

PRs target `dev`, not `main`. Squash and merge on approval.
