from __future__ import annotations

import os
from logging.config import fileConfig

from sqlalchemy import pool, create_engine
from sqlalchemy.engine import URL
from alembic import context

config = context.config

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Import all models so autogenerate detects schema changes
from app.models.database import Base                       # noqa: E402
from app.models.rules import CountryRules                  # noqa: E402, F401
from app.models.jobs import UploadedFiles, ProcessingJobs  # noqa: E402, F401
from app.models.logs import ValidationLogs                 # noqa: E402, F401
from app.models.ai import AIReports                        # noqa: E402, F401

target_metadata = Base.metadata

# Build URL from components — password passed as a plain string, no encoding issues
DB_URL: URL = URL.create(
    drivername="postgresql+psycopg2",
    username=os.environ.get("DB_USER", "postgres"),
    password=os.environ.get("DB_PASSWORD", "Dev@11976"),
    host=os.environ.get("DB_HOST", "db"),
    port=int(os.environ.get("DB_PORT", "5432")),
    database=os.environ.get("DB_NAME", "xeno"),
)


def run_migrations_offline() -> None:
    context.configure(
        url=DB_URL,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    # Add connect_timeout to fail fast on connection issues instead of hanging indefinitely
    connectable = create_engine(
        DB_URL,
        poolclass=pool.NullPool,
        connect_args={"connect_timeout": 10}  # Fail fast if DB is unreachable
    )
    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            compare_type=True,
        )
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
