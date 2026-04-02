# 📒 NoteBud

**NoteBud is an AI-powered notebook and study companion that creates a smart, personalized
workspace for each student's classes. Unlike generic note-taking apps, NoteBud learns and
adapts through machine learning and continuous feedback, becoming smarter as students use
it.**

---

## ✨ Features

- **Smart Course Notebooks** — Each course gets its own dedicated notebook storing uploaded files, transcripts, notes, and links with a RAG-powered Q&A interface
- **Notebook-Scoped Notes Workspace** — Notes open from a specific backpack notebook at `/backpack/:id/notes`, with left file-tree navigation and a right assistant panel
- **Study Environment** — Built-in Deep Focus mode, Pomodoro timers, ambient audio, and a friendly interface designed for long study sessions
- **Trust & Transparency** — Answers include citations to specific notebook chunks, groundedness indicators, and warnings when evidence is insufficient
- **Planner & Review** — Study planner surfaces what to review before exams using spaced repetition and AI-generated review cards

---

## 🛠️ Tech Stack

### Frontend
- **React / Next.js** — UI framework, routing, server-side rendering
- **TypeScript** — Type safety
- **Tailwind CSS** — Styling
- **TanStack React Query** — API state management and caching
- **Zustand** — Client global state (available in dependencies; use where needed)
- **Axios** — HTTP client

### Backend
- **FastAPI** — Python REST API
- **Neo4j** — Graph store for notebooks, documents, chunks, and course relationships; vector index on content chunks
- **neo4j-graphrag** — Graph RAG utilities
- **Pydantic** — Request and response validation

### AI / ML
- **Gemini API** — LLM for answer generation and embeddings
- **Google ADK / LangGraph** — Agent orchestration
- **LlamaIndex / LangChain** — Document loading, chunking, RAG pipeline
- **scikit-learn / PyTorch** — ML model training

### Infrastructure
- **Docker + Docker Compose** — Containerization and local dev
- **GCS / S3** — Cloud object storage
- **GitHub Actions** — CI/CD
- **Vercel / AWS** — Hosting and deployment

---

## 🚀 Getting Started

### Prerequisites
- Docker & Docker Compose
- Node.js (for frontend)
- Python 3.10+ (for backend)

### Local Development

```bash
# Clone the repository
git clone <repo-url>
cd NoteBud

# 1. Start Neo4j
cd backend/infrastructure/docker
docker compose up -d
cd ../../..

# 2. Backend (in one terminal)
cd backend
cp .env.example .env   # set NEO4J_* and other keys; match NEO4J_AUTH in docker-compose.yml
pip install -r requirements.txt
uvicorn src.api.main:app --reload --port 8000

# 3. Frontend (in another terminal)
cd frontend
npm install
# Base URL must include the API version prefix (paths in code are like /notebooks)
# echo 'NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1' > .env.local
npm run dev
```

For in-memory notebook data during UI or hook tests, pass `{ mock: true }` into the hooks in `frontend/src/hooks/useNotebooks.ts` (the Backpack page uses the live API by default). See [frontend/README.md](frontend/README.md#backpack-and-mock-data).

Notes are now notebook-scoped under `frontend/src/app/backpack/[id]/notes/page.tsx` and are opened from notebook cards. See [frontend/README.md](frontend/README.md#notes-workspace-routing-and-ui) for UI details (`FileTree`, tabs, and modal behavior).
Architecture overview: [docs/notes-workspace-ui-architecture.md](docs/notes-workspace-ui-architecture.md).

**Backend .env:** Copy `backend/.env.example` to `.env`. Set `NEO4J_URI`, `NEO4J_USERNAME`, and `NEO4J_PASSWORD` to match `backend/infrastructure/docker/docker-compose.yml` (default compose auth is `neo4j` / `notebud_password`). `GEMINI_API_KEY` is optional until embedding/LLM paths are enabled. Graph constraints and indexes are applied at API startup—there is no Alembic or SQL migration step. The API is at `http://localhost:8000`; health check: `http://localhost:8000/api/v1/health`.

### Authentication

- **API contract:** [docs/api-contracts/AUTH.md](docs/api-contracts/AUTH.md) — username/password rules, `POST /api/v1/auth/register`, `POST /api/v1/auth/token`, JWT claims.
- **Frontend:** `/login` and `/register`; tokens persisted with Zustand and sent as `Authorization: Bearer …` to protected routes (e.g. notebooks).

---

## 🌿 Git Workflow

### Branch Structure

| Branch | Purpose |
|---|---|
| `main` | Production-ready, always deployable, protected |
| `dev` | Integration branch for features |
| `feature/*` | Individual feature development |
| `bugfix/*` | Bug fixes |
| `hotfix/*` | Emergency production fixes |

### Contributing

```bash
# 1. Create a feature branch from dev
git checkout dev && git pull origin dev
git checkout -b feature/your-feature-name

# 2. Commit with conventional messages
# Format: <type>: <description>
# Types: feat, fix, docs, style, refactor, test, chore
git commit -m "feat: add notebook list component"

# 3. Keep branch updated
git checkout dev && git pull origin dev
git checkout feature/your-feature-name
git rebase dev

# 4. Push and open a PR targeting dev
git push origin feature/your-feature-name
```

**PR Guidelines:**
- Target `dev`, never `main`
- Keep PRs small and focused
- At least one team member must review before merging
- Squash and merge on approval
