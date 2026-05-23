from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    anthropic_api_key: str
    log_level: str = "INFO"
    default_model: str = "claude-sonnet-4-6"
    max_tokens: int = 2048
    env: str = "development"  # development | production — switches log format
    # Comma-separated allowed origins, e.g. https://your-app.vercel.app,http://localhost:3000
    allowed_origins: str = "http://localhost:3000"
    # SQLite database file path (relative to backend/ or absolute)
    data_dir: str = "./data"
    # Rate limiting (per-IP per-minute) on POST endpoints. Set to 0 to disable.
    rate_limit_per_minute: int = 20
    # JWT auth
    jwt_secret: str = "change-me-in-production-this-is-not-secure"
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 60 * 24 * 7  # 7 days
    # Sentry — leave blank to disable error reporting
    sentry_dsn: str = ""
    sentry_traces_sample_rate: float = 0.1
    # Email — currently supports Resend ("resend") or "console" (logs only, dev default)
    email_provider: str = "console"
    email_from: str = "PropertyState AI <no-reply@example.com>"
    resend_api_key: str = ""
    # Frontend base URL (used to build links in emails). No trailing slash.
    frontend_url: str = "http://localhost:3000"
    # Stripe — leave blank to disable billing flow
    stripe_secret_key: str = ""
    stripe_publishable_key: str = ""
    stripe_webhook_secret: str = ""
    # OAuth (Google)
    google_oauth_client_id: str = ""
    google_oauth_client_secret: str = ""

    @property
    def cors_origins(self) -> list[str]:
        return [o.strip() for o in self.allowed_origins.split(",") if o.strip()]

    @property
    def db_path(self) -> str:
        from pathlib import Path
        return str(Path(self.data_dir) / "propertystate.db")

    model_config = {"env_file": ".env", "extra": "ignore"}


settings = Settings()
