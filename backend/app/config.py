from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "Hulma API"
    app_env: str = "development"
    debug: bool = True
    database_url: str = "postgresql+psycopg://hulmauser:change_me_now@localhost:5432/hulma"
    secret_key: str = "replace-me-with-a-strong-secret"
    cors_origins: str = "http://localhost:5173"
    clerk_issuer: str = "https://your-clerk-domain.clerk.accounts.dev"
    clerk_jwks_url: str = "https://your-clerk-domain.clerk.accounts.dev/.well-known/jwks.json"
    clerk_audience: str = "https://hulma-api"
    supabase_url: str = "https://your-project.supabase.co"
    supabase_key: str = ""
    supabase_service_role_key: str | None = None
    supabase_bucket: str = "portfolio-images"
    max_image_size_mb: int = 7
    openai_api_key: str | None = None
    groq_api_key: str | None = None
    ai_model: str = "meta-llama/llama-4-scout-17b-16e-instruct"
    ai_provider: str = "groq"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


settings = Settings()
