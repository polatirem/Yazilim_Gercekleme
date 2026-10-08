# API

- `POST /auth/register`, `POST /auth/login` issue user bearer tokens.
- `GET /me` returns the current user and tenant context.
- `GET/POST /projects` manage tenant-scoped projects.
- `GET/POST /projects/{id}/environments` manage environments.
- `POST /environments/{id}/api-keys` creates a runtime key and returns its secret once.
- `POST /v1/traces` ingests and analyzes a trace using a runtime key. `Idempotency-Key` is supported.
- `POST /v1/generate` calls a configured server-side provider, then ingests and analyzes the generation using the same runtime key.
- `GET /requests` and `GET /requests/{id}` serve the dashboard and inspector.
- Policy endpoints create immutable versions and attach executions to traces.
- Review and dataset endpoints turn reviewer decisions into tenant-scoped labelled examples.
- `POST /requests/{id}/repair` performs at most two provider attempts and preserves the original response.
- `POST /v1/agent-runs` validates tool allowlists, arguments, failures, and confirmations.
- Replay endpoints enqueue and compare alternative provider/model candidates.
- `GET /health` reports process/database readiness.

Errors use `{ "error": { "code", "message", "request_id" } }`.
