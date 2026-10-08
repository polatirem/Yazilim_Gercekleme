# Phase 0–3 validation

Validated on 2026-10-06:

- Python source compilation: passed.
- Backend detector and API integration tests: 4 passed.
- Alembic upgrade: passed on SQLite; Docker is configured for PostgreSQL.
- Live HTTP smoke test: health OK, demo trace persisted as `flagged`, reliability 55, one risk span, and the authenticated request list returned the row.
- TypeScript typecheck: passed.
- JavaScript SDK build: passed.
- Docker Compose configuration: valid.

Later phase validation adds the complete migration chain through `0005`, live Gemini connectivity, policy/evidence/review/dataset/agent/replay integration coverage, tenant isolation, audit events, JavaScript SDK compilation, frontend type checking, and Compose validation. The suite currently passes 13 tests.

A direct live call to `gemini-3.8-flash` succeeded and returned usage metadata. Subsequent end-to-end gateway calls encountered Gemini's temporary high-demand response; the provider now retries bounded 429/5xx failures and returns a normalized error when capacity remains unavailable.

The Next.js production build reached the compile stage but this managed Windows execution environment denied its child-process spawn with `EPERM`. Run `npm run build` or `docker compose up --build` in a normal terminal to close that environment-level gap.
