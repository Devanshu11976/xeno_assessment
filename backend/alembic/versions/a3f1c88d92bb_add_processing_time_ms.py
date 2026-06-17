"""add_processing_time_ms

Revision ID: a3f1c88d92bb
Revises: 1dcf70ed71ee
Create Date: 2026-06-17 18:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = 'a3f1c88d92bb'
down_revision: Union[str, Sequence[str], None] = '1dcf70ed71ee'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('processing_jobs', sa.Column('processing_time_ms', sa.Integer(), nullable=True))


def downgrade() -> None:
    op.drop_column('processing_jobs', 'processing_time_ms')
