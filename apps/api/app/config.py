from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="CLOUDFORGE_", case_sensitive=False)

    environment: str = "local"
    version: str = "dev"
    commit_sha: str = "unknown"
    database_path: str = "/data/cloudforge.db"
    operator_token: str = "local-development-only"
    prometheus_url: str = "http://prometheus:9090"
    sample_service_url: str = "http://sample-service:8100"
    cors_origins: str = "http://localhost:3000,http://localhost:5173"
    force_not_ready: bool = False

    @property
    def allowed_origins(self) -> list[str]:
        return [item.strip() for item in self.cors_origins.split(",") if item.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()

