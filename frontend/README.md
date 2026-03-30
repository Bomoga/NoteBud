# NoteBud Frontend

Setup instructions for the NoteBud Next.js frontend.

---

## Prerequisites

- **Node.js** 20+ (LTS recommended)
- **npm** (included with Node.js)

---

## Local Development

### 1. Install dependencies

```bash
cd frontend
npm install
```

> **Note:** Run this after cloning, switching branches, or if you see `Cannot find module 'next'` or similar. Dependencies are not committed; `node_modules` must be installed locally.

### 2. Start the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 3. Environment variables

Create a `.env.local` file in the `frontend` directory if you need to override defaults:

```
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
```

The value must include the `/api/v1` prefix: the client calls paths like `/notebooks`, which Axios joins to this base (full URL: `http://localhost:8000/api/v1/notebooks`). A base of `http://localhost:8000` alone will hit the wrong routes and fail even if the backend is up.

---

## Authentication

- **Pages:** [http://localhost:3000/login](http://localhost:3000/login) and [http://localhost:3000/register](http://localhost:3000/register).
- **State:** `src/lib/store/auth.ts` (Zustand + persistence) holds the JWT; `src/lib/api/client.ts` attaches it to API requests.
- **Rules:** Username and password constraints for **registration** are defined in `src/lib/authPolicy.ts` and must stay aligned with the backend (`backend/src/api/routers/auth.py`). Full API wording: [../docs/api-contracts/AUTH.md](../docs/api-contracts/AUTH.md).

---

## Backpack and mock data

The **Backpack** page lists notebooks and calls the backend (`GET /api/v1/notebooks`) via React Query.

The hooks in `src/hooks/useNotebooks.ts` also support **`{ mock: true }`**, which uses the in-memory store in `src/lib/api/mockNotebooks.ts` instead of the network (handy for Storybook, tests, or a temporary demo page). The default Backpack route does not enable mock mode; wire `useSearchParams` or a dev toggle if you want `?mock=1` in the URL again.

---

## Docker

### Build

```bash
cd frontend
docker build -t notebud-frontend .
```

To point at a different backend (e.g., when using Docker Compose):

```bash
docker build --build-arg NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1 -t notebud-frontend .
```

`NEXT_PUBLIC_*` values are fixed at build time. Rebuild the image if you change the API URL.

### Run

```bash
docker run -p 3000:3000 notebud-frontend
```

### Run with hot reload (development)

```bash
# Build the dev image
docker build --target dev -t notebud-frontend:dev .

# Run with volume mount (edit files locally, changes reflect in the container)
# Use your UID/GID so files written to .next/ are not owned by root (see Troubleshooting).
docker run --rm \
  --user "$(id -u):$(id -g)" \
  -e HOME=/tmp \
  -p 3000:3000 \
  -v "$(pwd):/app" \
  -v /app/node_modules \
  notebud-frontend:dev
```

If **port 3000 is already taken**, change only the host port: `-p 3001:3000` and open [http://localhost:3001](http://localhost:3001).

The dev image sets `NEXT_PUBLIC_API_URL` to `http://localhost:8000/api/v1` by default. Override if needed: `-e NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1` (the browser on your machine calls this host, not the container).

The anonymous volume mounted at `/app/node_modules` keeps dependencies in the volume: on first use, Docker copies `node_modules` from the image into it, and the host bind mount does not replace that directory. Edit files in `src/` and the app will hot reload.

Use `--rm` so the container is removed when it stops (avoids stale containers tying up names).

---

## Troubleshooting

### Docker: `Bind for 0.0.0.0:3000 failed: port is already allocated`

Something else is already listening on host port **3000** (often a local `npm run dev`, another Docker container, or a left-over frontend container).

1. List containers: `docker ps`. Stop any frontend container: `docker stop <container_id>`.
2. See non-Docker processes: `ss -tlnp | grep ':3000'` (or `lsof -i :3000`).
3. Map a different **host** port: `-p 3001:3000` in `docker run` and use [http://localhost:3001](http://localhost:3001).

**Do not mix `sudo docker run` and normal `docker run`** for the same image unless you understand user namespaces; bind-mounted files may end up with ownership that breaks local `npm run dev`.

### Local `npm run dev`: `Permission denied` / lockfile IO error on `.next`

This usually happens after **Docker ran `next dev` as root** and wrote `.next/` on your repo via the volume mount. Your user can no longer create the Turbopack dev lockfile.

**Fix (pick one):**

```bash
sudo chown -R "$(id -u):$(id -g)" .next
# or remove the cache and let Next recreate it:
sudo rm -rf .next
```

**Prevention:** run the dev container with **`--user "$(id -u):$(id -g)"`** and **`-e HOME=/tmp`** as in the [Run with hot reload](#run-with-hot-reload-development) command above so new files in the project are owned by you.

### Next.js log shows `GET /api/v1/health 404`

That request went to the **Next.js** dev server on port 3000, not to FastAPI. The backend health URL is **http://localhost:8000/api/v1/health** (with `uvicorn` running on 8000). The app’s API client should use `NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1` so the **browser** calls the backend directly.

### "Cannot find module 'next' or its corresponding type declarations"

Run `npm install` in the `frontend` directory. If the error persists in your editor, restart the TypeScript server (`Cmd/Ctrl+Shift+P` → "TypeScript: Restart TS Server").

### "'React' refers to a UMD global, but the current file is a module"

Ensure files that use JSX include:

```ts
import React from 'react';
```

Modules with JSX need an explicit React import instead of relying on the global.
