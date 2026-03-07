# 📄 API Contracts

This folder contains all cross-lane API contracts for NoteBud.

**Every shared feature between frontend and backend must have an approved contract in this folder before anyone starts coding it.**

---

## What is an API Contract?

An API contract is a simple document that both frontend and backend agree on before building. It defines exactly what a request looks like and what the response will be — so frontend can build mock responses while backend builds the real thing, without blocking each other.

---

## Rules

- **Write the contract first** — no shared feature gets coded without one
- **Both frontend and backend must approve** — comment on the file's PR or give a thumbs up in chat
- **If the contract needs to change** — notify all affected lanes and update this folder before changing any code
- **One file per feature area** — keep them focused and easy to find

---

## Approval Process

1. Backend or Frontend writes the contract and opens a PR into `develop`
2. Tag both lanes for review in the PR description
3. Both sides leave a comment: `✅ approved` or flag any issues
4. Merge only after both lanes approve
5. Coding can begin after merge

---

## Contract Template

Every contract file must include these sections:

```
# [Feature Name] API Contract

## Endpoint
METHOD /api/path

## Authentication
Bearer JWT token / None

## Request
Headers, query params, body schema

## Success Response
Status code + response body

## Error Responses
List of error codes and what they mean

## Example
Sample request + sample response
```

---

## Contracts Index

| File | Feature | Status | Approved By |
|---|---|---|---|
| [AUTH.md](./AUTH.md) | Register, Login, Logout | ✅ Approved | FE + BE |
| [NOTEBOOK.md](./NOTEBOOK.md) | Create notebook, list notebooks, upload file | ✅ Approved | FE + BE |

> Add a new row every time a new contract is merged.

---

## File Naming

Use all caps, one word per feature area:

- `AUTH.md`
- `NOTEBOOK.md`
- `CHAT.md`
- `PLANNER.md`
- `RAG.md`
