"""demo business flag

Revision ID: ad0d993308e8
Revises: a2f85c034419
Create Date: 2026-07-12 11:40:41.912338

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'ad0d993308e8'
down_revision: Union[str, None] = 'a2f85c034419'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "businesses",
        sa.Column("is_demo", sa.Boolean(), nullable=False, server_default=sa.text("false")),
    )
    op.create_index("ix_businesses_is_demo", "businesses", ["is_demo"])


def downgrade() -> None:
    op.drop_index("ix_businesses_is_demo", table_name="businesses")
    op.drop_column("businesses", "is_demo")
