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
NEXT_PUBLIC_API_URL=http://localhost:8000
```

The frontend uses this URL to call the FastAPI backend. Default is `http://localhost:8000`.

---

## Docker

### Build

```bash
cd frontend
docker build -t notebud-frontend .
```

To point at a different backend (e.g., when using Docker Compose):

```bash
docker build --build-arg NEXT_PUBLIC_API_URL=http://localhost:8000 -t notebud-frontend .
```

`NEXT_PUBLIC_*` values are fixed at build time. Rebuild the image if you change the API URL.

### Run

```bash
docker run -p 3000:3000 notebud-frontend
```

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
