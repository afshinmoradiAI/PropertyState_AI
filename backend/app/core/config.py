from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    anthropic_api_key: str
    log_level: str = "INFO"
    default_model: str = "claude-sonnet-4-6"
    max_tokens: int = 2048
    # Comma-separated allowed origins, e.g. https://your-app.vercel.app,http://localhost:3000
    allowed_origins: str = "http://localhost:3000"

    @property
    def cors_origins(self) -> list[str]:
        return [o.strip() for o in self.allowed_origins.split(",") if o.strip()]

    model_config = {"env_file": ".env", "extra": "ignore"}


settings = Settings()
