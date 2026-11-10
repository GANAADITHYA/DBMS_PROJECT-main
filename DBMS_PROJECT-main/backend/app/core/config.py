from functools import lru_cache

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Runtime settings loaded from environment variables."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=False,
    )

    app_name: str = "CAMPUS MEMORY API"
    app_env: str = "local"
    api_v1_prefix: str = "/api/v1"

    database_url: str | None = None
    db_pool_min_size: int = Field(default=1, ge=1, le=10)
    db_pool_max_size: int = Field(default=5, ge=1, le=20)
    db_connect_timeout_seconds: float = 8.0
    db_statement_timeout_ms: int = 15000

    supabase_url: str | None = None
    supabase_publishable_key: str | None = None
    auth_provider: str | None = None
    auth_timeout_seconds: float = 5.0

    cors_origins: str = "http://localhost:5173,http://127.0.0.1:5173"

    @field_validator("database_url", "supabase_url", "supabase_publishable_key", "auth_provider")
    @classmethod
    def empty_as_none(cls, value: str | None) -> str | None:
        if value is None:
            return None
        stripped = value.strip()
        return stripped or None

    @property
    def cors_origin_list(self) -> list[str]:
        return [item.strip() for item in self.cors_origins.split(",") if item.strip()]

    @property
    def auth_is_configured(self) -> bool:
        provider = (self.auth_provider or "").strip().lower()
        return (
            provider == "supabase"
            and bool(self.supabase_url)
            and bool(self.supabase_publishable_key)
        )

    @property
    def database_is_configured(self) -> bool:
        return bool(self.database_url)

    def normalized_database_url(self) -> str | None:
        if not self.database_url:
            return None
        url = self.database_url
        if url.startswith("postgresql+psycopg://"):
            url = "postgresql://" + url[len("postgresql+psycopg://") :]
        if "sslmode=" not in url.lower():
            separator = "&" if "?" in url else "?"
            url = f"{url}{separator}sslmode=require"
        return url


@lru_cache
def get_settings() -> Settings:
    return Settings()
