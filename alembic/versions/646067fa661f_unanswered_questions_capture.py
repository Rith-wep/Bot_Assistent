"""unanswered questions capture

Revision ID: 646067fa661f
Revises: a3130a8c48ee
Create Date: 2026-07-11 07:26:31.211279

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '646067fa661f'
down_revision: Union[str, None] = 'a3130a8c48ee'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # op.create_table auto-creates the enum type for a brand-new table (unlike
    # op.add_column on an existing table, which needs it created explicitly first).
    status = sa.Enum("open", "resolved", "dismissed", name="unanswered_question_status")

    op.create_table(
        "unanswered_questions",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("business_id", sa.Integer(), nullable=False),
        sa.Column("conversation_id", sa.Integer(), nullable=False),
        sa.Column("question_text", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("now()")),
        sa.Column("status", status, nullable=False, server_default="open"),
        # No FK yet: question_clusters is created by the nightly-clustering-job migration.
        sa.Column("cluster_id", sa.Integer(), nullable=True),
        sa.ForeignKeyConstraint(
            ["business_id"], ["businesses.id"], name="fk_unanswered_questions_business_id_businesses"
        ),
        sa.ForeignKeyConstraint(
            ["conversation_id"],
            ["conversations.id"],
            name="fk_unanswered_questions_conversation_id_conversations",
        ),
        sa.PrimaryKeyConstraint("id", name="pk_unanswered_questions"),
    )
    op.create_index(
        "ix_unanswered_questions_business_created",
        "unanswered_questions",
        ["business_id", "created_at"],
    )
    op.create_index(
        "ix_unanswered_questions_business_id", "unanswered_questions", ["business_id"]
    )
    op.create_index(
        "ix_unanswered_questions_conversation_id", "unanswered_questions", ["conversation_id"]
    )
    op.create_index(
        "ix_unanswered_questions_cluster_id", "unanswered_questions", ["cluster_id"]
    )


def downgrade() -> None:
    op.drop_table("unanswered_questions")

    bind = op.get_bind()
    sa.Enum(name="unanswered_question_status").drop(bind, checkfirst=True)
