# Local development

Docker Compose starts PostgreSQL, the API, and the web application. The API runs its migration and demo seed during container startup. For fast local tests, omit `DATABASE_URL` to use SQLite. Environment variables are documented in `.env.example`.

Run backend tests from the repository root with `python -m pytest apps/api/tests`. Run `npm run typecheck` and `npm run build` for the frontend. The deterministic demo requires no provider credentials.

