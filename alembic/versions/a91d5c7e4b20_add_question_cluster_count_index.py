"""add question cluster count index

Revision ID: a91d5c7e4b20
Revises: f1837a2b9c6d
Create Date: 2026-08-22 00:10:00.000000

"""
from typing import Sequence, Union

from alembic import op


revision: str = "a91d5c7e4b20"
down_revision: Union[str, None] = "f1837a2b9c6d"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_index(
        "ix_question_clusters_business_status_count",
        "question_clusters",
        ["business_id", "status", "question_count"],
    )


def downgrade() -> None:
    op.drop_index("ix_question_clusters_business_status_count", table_name="question_clusters")
