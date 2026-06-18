"""add valid_payment_modes to country_rules

Revision ID: b2e4f89c1234
Revises: 1dcf70ed71ee
Create Date: 2026-06-18
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB

revision = 'b2e4f89c1234'
down_revision = '1dcf70ed71ee'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        'country_rules',
        sa.Column('valid_payment_modes', JSONB, nullable=True)
    )


def downgrade() -> None:
    op.drop_column('country_rules', 'valid_payment_modes')
