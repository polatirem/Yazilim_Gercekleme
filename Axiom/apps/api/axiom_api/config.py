from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict

ROOT_DIR = Path(__file__).resolve().parents[3]

class Settings(BaseSettings):
    # Absolute default so the API uses the same database no matter which directory it starts from.
    database_url: str = f"sqlite+aiosqlite:///{(ROOT_DIR / 'axiom.db').as_posix()}"
    jwt_secret: str = "local-only-change-this-secret-at-least-32-bytes"
    cors_origins: str = "http://localhost:3000"
    axiom_demo_api_key: str = "ax_demo_local"
    gemini_api_key: str = ""
    gemini_model: str = "gemini-3.8-flash"
    gemini_fallback_model: str = "gemini-flash-latest,gemini-3.1-flash-lite"  # comma-separated, tried in order
    gemini_timeout_seconds: float = 20
    gemini_total_timeout_seconds: float = 35  # whole fallback chain; keep below the web proxy timeout
    model_config = SettingsConfigDict(env_file=(ROOT_DIR / ".env", ROOT_DIR / ".env.local"), extra="ignore")

settings = Settings()
