"""add message conversation created index

Revision ID: f1837a2b9c6d
Revises: c4a92e7f105b
Create Date: 2026-08-22 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op


revision: str = "f1837a2b9c6d"
down_revision: Union[str, None] = "c4a92e7f105b"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_index(
        "ix_messages_business_conversation_created",
        "messages",
        ["business_id", "conversation_id", "created_at"],
    )


def downgrade() -> None:
    op.drop_index("ix_messages_business_conversation_created", table_name="messages")
