FROM python:3.12-slim
WORKDIR /app
COPY pyproject.toml alembic.ini ./
COPY axiom_api ./axiom_api
COPY migrations ./migrations
RUN pip install --no-cache-dir .
CMD ["sh", "-c", "alembic upgrade head && uvicorn axiom_api.main:app --host 0.0.0.0 --port 8000"]

