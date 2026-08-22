from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str
    migration_database_url: str | None = None
    supabase_url: str | None = None
    supabase_publishable_key: str | None = None
    secret_key: str = "dev-secret-key-change-me"
    encryption_key: str
    groq_api_key: str | None = None
    ai_model: str = "openai/gpt-oss-20b"
    app_env: str = "development"
    frontend_url: str = "http://localhost:5173"
    # Comma-separated emails allowed onto the internal admin page (just you —
    # see CLAUDE.md's "Internal admin page"). Not a role/schema change since
    # that page isn't fully built yet; this is the minimum needed to gate it.
    admin_emails: str = ""

    @property
    def supabase_issuer(self) -> str:
        if not self.supabase_url:
            raise RuntimeError("SUPABASE_URL is not configured")
        return f"{self.supabase_url.rstrip('/')}/auth/v1"


settings = Settings()
