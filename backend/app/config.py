from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "Hulma API"
    app_env: str = "production"
    debug: bool = False
    database_url: str = "postgresql+psycopg://hulmauser:change_me_now@localhost:5432/hulma"
    db_pool_size: int = 20
    db_max_overflow: int = 30
    db_pool_timeout: int = 30
    db_pool_recycle: int = 1800
    secret_key: str = "replace-me-with-a-strong-secret"
    cors_origins: str = "https://hulma.vercel.app,http://localhost:5173"
    cors_origin_regex: str | None = None
    clerk_issuer: str = ""
    clerk_jwks_url: str = ""
    clerk_audience: str = ""
    supabase_url: str = ""
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
