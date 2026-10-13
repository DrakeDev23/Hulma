from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "Hulma API"
    app_env: str = "development"
    debug: bool = True
    database_url: str = "postgresql+psycopg://postgres:postgres@localhost:5432/hulma"
    secret_key: str = "replace-me-with-a-strong-secret"
    cors_origins: str = "http://localhost:5173"
    clerk_issuer: str = "https://your-clerk-domain.clerk.accounts.dev"
    clerk_jwks_url: str = "https://your-clerk-domain.clerk.accounts.dev/.well-known/jwks.json"
    clerk_audience: str = "https://hulma-api"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


settings = Settings()
