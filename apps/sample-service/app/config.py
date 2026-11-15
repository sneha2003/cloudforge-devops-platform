from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="WORKBOARD_", case_sensitive=False)

    environment: str = "local"
    version: str = "dev"
    commit_sha: str = "unknown"
    database_path: str = "/data/workboard.db"
    force_not_ready: bool = False


@lru_cache
def get_settings() -> Settings:
    return Settings()

