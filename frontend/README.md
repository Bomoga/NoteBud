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
docker run -p 3000:3000 -v $(pwd):/app -v /app/node_modules notebud-frontend:dev
```

The dev image sets `NEXT_PUBLIC_API_URL` to `http://localhost:8000/api/v1` by default. Override if needed: `-e NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1` (the browser on your machine calls this host, not the container).

The second `-v /app/node_modules` keeps the container's `node_modules` so the host doesn't overwrite it. Edit files in `src/` and the app will hot reload.

---

## Troubleshooting

### "Cannot find module 'next' or its corresponding type declarations"

Run `npm install` in the `frontend` directory. If the error persists in your editor, restart the TypeScript server (`Cmd/Ctrl+Shift+P` → "TypeScript: Restart TS Server").

### "'React' refers to a UMD global, but the current file is a module"

Ensure files that use JSX include:

```ts
import React from 'react';
```

Modules with JSX need an explicit React import instead of relying on the global.
