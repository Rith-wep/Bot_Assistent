"""add onboarding fields, make bot_configs.owner_chat_id nullable

Revision ID: 88e954de5061
Revises: d2c7e9e6fd5f
Create Date: 2026-07-08 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "88e954de5061"
down_revision: Union[str, None] = "d2c7e9e6fd5f"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Backfill existing businesses (created before onboarding existed) as
    # already-onboarded via server_default; new signups get the Python-side
    # model default instead (step 1, not completed) since it's passed
    # explicitly in the INSERT and overrides this server_default.
    op.add_column(
        "businesses",
        sa.Column("onboarding_step", sa.Integer(), nullable=False, server_default="5"),
    )
    op.add_column(
        "businesses",
        sa.Column(
            "onboarding_completed", sa.Boolean(), nullable=False, server_default=sa.text("true")
        ),
    )
    # Onboarding connects the Telegram bot before the owner_chat_id is known
    # (it's discovered later via /start or /myid), so it can no longer be
    # required at bot_configs creation time.
    op.alter_column(
        "bot_configs", "owner_chat_id", existing_type=sa.BigInteger(), nullable=True
    )


def downgrade() -> None:
    op.alter_column(
        "bot_configs", "owner_chat_id", existing_type=sa.BigInteger(), nullable=False
    )
    op.drop_column("businesses", "onboarding_completed")
    op.drop_column("businesses", "onboarding_step")
