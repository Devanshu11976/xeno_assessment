"""merge heads

Revision ID: 94391cd3ad69
Revises: a3f1c88d92bb, b2e4f89c1234
Create Date: 2026-06-18 09:33:52.803735

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '94391cd3ad69'
down_revision: Union[str, Sequence[str], None] = ('a3f1c88d92bb', 'b2e4f89c1234')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
