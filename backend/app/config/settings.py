import os
from dataclasses import dataclass, field
from functools import lru_cache
from sqlalchemy.engine import URL


@dataclass(frozen=True)
class Settings:
    # General
    env: str = field(default_factory=lambda: os.getenv("ENV", "development"))
    debug: bool = field(default_factory=lambda: os.getenv("DEBUG", "false").lower() == "true")
    secret_key: str = field(default_factory=lambda: os.getenv("SECRET_KEY", ""))

    # Database — individual components (avoids @ in password breaking URL parsing)
    # No hardcoded defaults for credentials; must be supplied via environment
    db_user: str = field(default_factory=lambda: os.getenv("DB_USER", "postgre"))
    db_password: str = field(default_factory=lambda: os.getenv("DB_PASSWORD", ""))
    db_host: str = field(default_factory=lambda: os.getenv("DB_HOST", "localhost"))
    db_port: int = field(default_factory=lambda: int(os.getenv("DB_PORT", "5432")))
    db_name: str = field(default_factory=lambda: os.getenv("DB_NAME", "stratos_8tb8"))

    # SQLAlchemy pool tuning
    db_echo: bool = field(default_factory=lambda: os.getenv("DB_ECHO", "false").lower() == "true")
    db_pool_size: int = field(default_factory=lambda: int(os.getenv("DB_POOL_SIZE", "5")))
    db_max_overflow: int = field(default_factory=lambda: int(os.getenv("DB_MAX_OVERFLOW", "10")))
    db_pool_timeout: int = field(default_factory=lambda: int(os.getenv("DB_POOL_TIMEOUT", "30")))

    # Queue
    redis_url: str = field(default_factory=lambda: os.getenv("REDIS_URL", "redis://localhost:6379/0"))

    # AI — Groq
    groq_api_key: str = field(default_factory=lambda: os.getenv("GROQ_API_KEY", ""))

    # Supabase Storage
    supabase_url: str = field(default_factory=lambda: os.getenv("SUPABASE_URL", ""))
    supabase_service_key: str = field(default_factory=lambda: os.getenv("SUPABASE_SERVICE_KEY", ""))
    supabase_bucket_name: str = field(default_factory=lambda: os.getenv("SUPABASE_BUCKET_NAME", "stratos-uploads"))

    # Storage (local temp directories)
    upload_dir: str = field(default_factory=lambda: os.getenv("UPLOAD_DIR", "./uploads"))
    output_dir: str = field(default_factory=lambda: os.getenv("OUTPUT_DIR", "./outputs"))

    # Upload limits (default 50 MB)
    max_upload_bytes: int = field(
        default_factory=lambda: int(os.getenv("MAX_UPLOAD_BYTES", str(50 * 1024 * 1024)))
    )

    @property
    def database_url(self) -> str:
        return URL.create(
            "postgresql+asyncpg",
            username=self.db_user,
            password=self.db_password,
            host=self.db_host,
            port=self.db_port,
            database=self.db_name,
        ).render_as_string(hide_password=False)

    @property
    def database_sync_url(self) -> str:
        return URL.create(
            "postgresql+psycopg2",
            username=self.db_user,
            password=self.db_password,
            host=self.db_host,
            port=self.db_port,
            database=self.db_name,
        ).render_as_string(hide_password=False)

    # Uppercase aliases for backwards compat
    @property
    def ENV(self) -> str: return self.env  # noqa: N802

    @property
    def DEBUG(self) -> bool: return self.debug  # noqa: N802

    @property
    def SECRET_KEY(self) -> str: return self.secret_key  # noqa: N802

    @property
    def DATABASE_URL(self) -> str: return self.database_url  # noqa: N802

    @property
    def DATABASE_SYNC_URL(self) -> str: return self.database_sync_url  # noqa: N802

    @property
    def REDIS_URL(self) -> str: return self.redis_url  # noqa: N802

    @property
    def GROQ_API_KEY(self) -> str: return self.groq_api_key  # noqa: N802

    @property
    def SUPABASE_URL(self) -> str: return self.supabase_url  # noqa: N802

    @property
    def SUPABASE_SERVICE_KEY(self) -> str: return self.supabase_service_key  # noqa: N802

    @property
    def SUPABASE_BUCKET_NAME(self) -> str: return self.supabase_bucket_name  # noqa: N802

    @property
    def UPLOAD_DIR(self) -> str: return self.upload_dir  # noqa: N802

    @property
    def OUTPUT_DIR(self) -> str: return self.output_dir  # noqa: N802

    @property
    def MAX_UPLOAD_BYTES(self) -> int: return self.max_upload_bytes  # noqa: N802


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
