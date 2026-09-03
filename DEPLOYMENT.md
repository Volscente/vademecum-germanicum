# Deployment

Vademecum Germanicum runs on a $0 stack: **Vercel** (frontend), **Render** (backend), **Neon** (Postgres). This is a one-time setup — once configured, pushing to `main` redeploys automatically on both Vercel and Render.

## 1. Database — Neon

1. Create a free account at [neon.tech](https://neon.tech) and create a new project.
2. Copy the connection string it gives you (the pooled one, `postgresql://...`) — you'll paste it into Render as `DATABASE_URL` below.

## 2. Backend — Render

1. Create a free account at [render.com](https://render.com), then **New → Web Service** from this GitHub repo.
2. Runtime: **Docker**, Dockerfile path: `backend/Dockerfile`, Docker build context: repo root (`.`).
3. Instance type: **Free**.
4. Environment variables:
   - `DATABASE_URL` — the Neon connection string from step 1.
   - `JWT_SECRET` — a long random string (generate with `openssl rand -hex 32`).
   - `ALLOWED_USERNAMES` — comma-separated usernames allowed to register (e.g. `simone`).
   - `CORS_ALLOWED_ORIGINS` — `http://localhost:3000,https://<your-vercel-domain>.vercel.app` (fill in the real Vercel domain after step 3, then redeploy).
   - `GEMINI_API_KEY`, `LLM_MODEL` — same values as your local `.env` (word-enrichment feature).
5. Deploy. Note the service's public URL (e.g. `https://vademecum-backend.onrender.com`).
6. **Free-tier tradeoff**: this service spins down after 15 minutes of no traffic. The first request after that takes up to ~1 minute to wake back up — expected, not a bug.

## 3. Frontend — Vercel

1. Create a free account at [vercel.com](https://vercel.com), then **New Project** from this repo.
2. Root Directory: `frontend`. Framework preset: Next.js (auto-detected).
3. Environment variable: `NEXT_PUBLIC_API_URL` = the Render URL from step 2.5.
4. Deploy. Note the project's production URL, and go back to Render to fill in `CORS_ALLOWED_ORIGINS` with it (step 2.4), then redeploy the backend.

## 4. First login

1. Visit the Vercel URL, click "Register", and create the account for a username on the `ALLOWED_USERNAMES` list.
2. You're now logged in with an empty Vocabulary/Resources — this is expected, Neon starts empty.

## 5. Move your existing local data over

1. On your local `just dev` instance, use **Export** (top-right) to download your current words + resources as JSON.
2. On the deployed app (now logged in), use **Import** and select that JSON file. Both Vocabulary and Resources import in one pass; the summary shows added/skipped/failed counts.

## Local development

No changes to your workflow: `just dev` still works exactly as before. Your local `.env` now also needs three more variables (see `.env.example`) for the backend to boot at all — `auth.py` fails fast on startup if they're missing, the same way `database.py` already does for `DATABASE_URL`:

```
JWT_SECRET=<any long random string, e.g. `openssl rand -hex 32`>
ALLOWED_USERNAMES=<your own username, comma-separated if more than one>
```

`CORS_ALLOWED_ORIGINS` defaults to `http://localhost:3000` if unset, so it's optional locally.

After pulling this change, your existing local Postgres container has `words`/`resources`/`topics` rows with no owner. The simplest path: export that data first (once you can log in — see below), then wipe the local volume and start fresh:

```bash
docker-compose down -v
just run_backend_stack_recreate
```

Register a local account, then re-import the data you exported. (`backend/tests/fixtures/database_management.py`'s test fixture handles this migration automatically for the *test* database — this note is only about your everyday local dev container.)
