"""question clusters table

Revision ID: eac144142af5
Revises: 646067fa661f
Create Date: 2026-07-11 07:35:06.988085

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'eac144142af5'
down_revision: Union[str, None] = '646067fa661f'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Reuses the unanswered_question_status enum type created by the previous
    # migration (open/resolved/dismissed applies to clusters too) — create_type
    # =False so op.create_table doesn't try to CREATE TYPE a second time.
    status = postgresql.ENUM(
        "open", "resolved", "dismissed", name="unanswered_question_status", create_type=False
    )

    op.create_table(
        "question_clusters",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("business_id", sa.Integer(), nullable=False),
        sa.Column("label_en", sa.String(length=255), nullable=False),
        sa.Column("label_km", sa.String(length=255), nullable=False),
        sa.Column("question_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column(
            "sample_questions",
            postgresql.JSONB(),
            nullable=False,
            server_default=sa.text("'[]'::jsonb"),
        ),
        sa.Column("first_seen", sa.DateTime(), nullable=False, server_default=sa.text("now()")),
        sa.Column("last_seen", sa.DateTime(), nullable=False, server_default=sa.text("now()")),
        sa.Column("status", status, nullable=False, server_default="open"),
        sa.ForeignKeyConstraint(
            ["business_id"], ["businesses.id"], name="fk_question_clusters_business_id_businesses"
        ),
        sa.PrimaryKeyConstraint("id", name="pk_question_clusters"),
    )
    op.create_index("ix_question_clusters_business_id", "question_clusters", ["business_id"])
    op.create_index(
        "ix_question_clusters_business_status", "question_clusters", ["business_id", "status"]
    )

    op.create_foreign_key(
        "fk_unanswered_questions_cluster_id_question_clusters",
        "unanswered_questions",
        "question_clusters",
        ["cluster_id"],
        ["id"],
    )


def downgrade() -> None:
    op.drop_constraint(
        "fk_unanswered_questions_cluster_id_question_clusters",
        "unanswered_questions",
        type_="foreignkey",
    )
    op.drop_table("question_clusters")
