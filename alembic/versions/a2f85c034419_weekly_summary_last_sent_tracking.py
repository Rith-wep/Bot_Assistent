"""weekly summary last sent tracking

Revision ID: a2f85c034419
Revises: eac144142af5
Create Date: 2026-07-12 10:22:41.006888

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a2f85c034419'
down_revision: Union[str, None] = 'eac144142af5'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "businesses", sa.Column("last_summary_sent", sa.DateTime(), nullable=True)
    )


def downgrade() -> None:
    op.drop_column("businesses", "last_summary_sent")
