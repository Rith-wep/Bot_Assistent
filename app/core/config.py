from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str
    secret_key: str = "dev-secret-key-change-me"
    encryption_key: str
    gemini_api_key: str | None = None
    ai_model: str = "gemini-2.5-flash"
    app_env: str = "development"
    frontend_url: str = "http://localhost:5173"
    # Comma-separated emails allowed onto the internal admin page (just you —
    # see CLAUDE.md's "Internal admin page"). Not a role/schema change since
    # that page isn't fully built yet; this is the minimum needed to gate it.
    admin_emails: str = ""


settings = Settings()
