# 📒 NoteBud

**NoteBud is an AI-powered notebook and study companion that creates a smart, personalized
workspace for each student's classes. Unlike generic note-taking apps, NoteBud learns and
adapts through machine learning and continuous feedback, becoming smarter as students use
it.**

---

## ✨ Features

- **Smart Course Notebooks** — Each course gets its own dedicated notebook storing uploaded files, transcripts, notes, and links with a RAG-powered Q&A interface
- **Study Environment** — Built-in Deep Focus mode, Pomodoro timers, ambient audio, and a friendly interface designed for long study sessions
- **Trust & Transparency** — Answers include citations to specific notebook chunks, groundedness indicators, and warnings when evidence is insufficient
- **Planner & Review** — Study planner surfaces what to review before exams using spaced repetition and AI-generated review cards

---

## 🛠️ Tech Stack

### Frontend
- **React / Next.js** — UI framework, routing, server-side rendering
- **TypeScript** — Type safety
- **Tailwind CSS** — Styling
- **React Query** — API state management and caching
- **Zustand / Redux** — Global state management
- **Axios** — HTTP client

### Backend
- **FastAPI / Flask** — Python REST API framework
- **PostgreSQL** — Primary database
- **pgvector** — Vector embeddings storage
- **SQLAlchemy + Alembic** — ORM and migrations
- **JWT + Pydantic** — Auth and request validation

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
cd notebud

# Start all services
docker-compose up

# Frontend (in separate terminal)
cd frontend
npm install
npm run dev

# Backend (in separate terminal)
cd backend
pip install -r requirements.txt
uvicorn main:app --reload
```

---

## 🌿 Git Workflow

### Branch Structure

| Branch | Purpose |
|---|---|
| `main` | Production-ready, always deployable, protected |
| `develop` | Integration branch for features |
| `feature/*` | Individual feature development |
| `bugfix/*` | Bug fixes |
| `hotfix/*` | Emergency production fixes |

### Contributing

```bash
# 1. Create a feature branch from develop
git checkout develop && git pull origin develop
git checkout -b feature/your-feature-name

# 2. Commit with conventional messages
# Format: <type>: <description>
# Types: feat, fix, docs, style, refactor, test, chore
git commit -m "feat: add notebook list component"

# 3. Keep branch updated
git checkout develop && git pull origin develop
git checkout feature/your-feature-name
git rebase develop

# 4. Push and open a PR targeting develop
git push origin feature/your-feature-name
```

**PR Guidelines:**
- Target `develop`, never `main`
- Keep PRs small and focused
- At least one team member must review before merging
- Squash and merge on approval
