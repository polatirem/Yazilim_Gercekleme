# Axiom

The reliability control plane for production AI. The repository implements the runtime path from tenant-aware ingestion and Gemini generation through detectors, versioned policies, evidence, review, bounded repair, agent reliability, and replay comparison.

## Quick start

```bash
cp .env.example .env
docker compose up --build
```

Open `http://localhost:3000`. Demo credentials are `demo@example.com` / `demo-password` and the seeded runtime key is `ax_demo_local`.

Without Docker:

```bash
python -m venv .venv
.venv/Scripts/pip install -e "apps/api[dev]"
python -m uvicorn axiom_api.main:app --app-dir apps/api --reload

npm install
npm run dev
```

The root `npm run dev` command starts both the API on port 8000 and the web application on port 3000. The browser never calls port 8000 directly: Next.js proxies `/api/*` to the API (`API_INTERNAL_URL`, default `http://127.0.0.1:8000`), so the console also works when opened from another device on the LAN (e.g. `http://192.168.x.x:3000`). The API defaults to `sqlite+aiosqlite:///./axiom.db` when `DATABASE_URL` is absent. Docker uses PostgreSQL. Run migrations with `cd apps/api && alembic upgrade head`; for a disposable development database the API also creates missing tables at startup.

Put local Gemini credentials in the ignored `.env.local` file. Provider credentials are read only by the API and never returned to the browser.

## Verify the real reliability flow

```bash
curl -X POST http://localhost:8000/v1/traces \
  -H "Authorization: Bearer ax_demo_local" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: dosage-demo-1" \
  -d '{"provider":"local","model":"deterministic-rag","prompt":"What is the dosage?","response":"The recommended dosage is 50 mg twice daily.","sources":[{"id":"source-1","content":"The recommended dosage is 5 mg once daily."}]}'
```

The response contains detector results, a heuristic reliability score, and a precise risk span. Refresh the dashboard and open the trace to inspect it.

## Knowledge base (RAG)

Upload reference documents (PDF, Word `.docx`, TXT, Markdown, CSV, HTML) on the **Belgeler** page or via `POST /documents`. Each document is split into ~700-character overlapping passages. A console check with `source_mode: "documents"` retrieves the passages most relevant to the question and to every sentence of the answer (BM25 over Turkish-aware word stems) and verifies the answer against those passages only. When nothing relevant is found the answer is scored as not grounded in the documents. With Gemini configured, an optional meaning-level check (`deep_check`) asks the model to judge each claim using only the retrieved passages, which catches contradictions that contain no numbers.

## Commands

- `npm run dev` — web development server
- `npm run build` — web production build
- `npm run typecheck` — TypeScript check
- `python -m pytest apps/api/tests` — backend tests
- `cd apps/api && alembic upgrade head` — database migrations
- `python examples/rag-demo/demo.py` — submit the deterministic failure
- `python examples/agent-demo/demo.py` — submit an unsafe tool trajectory

## Repository structure

```text
apps/api       FastAPI control/data plane
apps/web       Next.js dashboard and inspector
packages/sdk-* Runtime SDK foundations
examples       Deterministic integration examples
infrastructure Database bootstrap material
docs           Architecture, API, security, and phase records
```

## Security and limitations

API key secrets are hashed and displayed only on creation. Tenant scope is derived from the authenticated user or runtime key, never accepted as authoritative browser input. The current auth implementation is an MVP bearer-token flow; production deployment still needs managed secrets, TLS termination, distributed rate limiting, retention jobs, a durable external job queue, hardened cookie/session handling, and webhook delivery. Grounding and contradiction checks are deliberately deterministic and lexical/numeric—not represented as semantic proof. Replay background tasks are process-local in this version.
