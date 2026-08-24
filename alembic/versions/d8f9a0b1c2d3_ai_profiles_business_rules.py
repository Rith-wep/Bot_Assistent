"""Add normalized AI profiles and ordered business rules."""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "d8f9a0b1c2d3"
down_revision: Union[str, None] = "c7e8f9a0b1c2"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("""
        DO $$
        BEGIN
            CREATE TYPE ai_personality AS ENUM ('professional', 'friendly', 'casual', 'luxury', 'sales');
        EXCEPTION
            WHEN duplicate_object THEN NULL;
        END $$;
    """)
    # Use raw PostgreSQL DDL here so SQLAlchemy cannot issue a second CREATE
    # TYPE while creating the table after a previously interrupted migration.
    op.execute("""
        CREATE TABLE ai_profiles (
          id SERIAL PRIMARY KEY,
          business_id INTEGER NOT NULL UNIQUE REFERENCES businesses(id) ON DELETE CASCADE,
          assistant_name VARCHAR(255) NOT NULL,
          assistant_role VARCHAR(500) NOT NULL,
          personality ai_personality NOT NULL,
          language_mode VARCHAR(20) NOT NULL DEFAULT 'mirror',
          response_length VARCHAR(20) NOT NULL DEFAULT 'short',
          greeting_message_en TEXT,
          greeting_message_km TEXT,
          fallback_message_en TEXT,
          fallback_message_km TEXT
        )
    """)
    op.create_index("ix_ai_profiles_business_id", "ai_profiles", ["business_id"], unique=True)
    op.create_table(
        "business_rules",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("business_id", sa.Integer(), sa.ForeignKey("businesses.id", ondelete="CASCADE"), nullable=False),
        sa.Column("rule_text", sa.String(500), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("sort_order", sa.Integer(), nullable=False, server_default="0"),
    )
    op.create_index("ix_business_rules_business_id", "business_rules", ["business_id"])


def downgrade() -> None:
    op.drop_index("ix_business_rules_business_id", table_name="business_rules")
    op.drop_table("business_rules")
    op.drop_index("ix_ai_profiles_business_id", table_name="ai_profiles")
    op.drop_table("ai_profiles")
    sa.Enum(name="ai_personality").drop(op.get_bind())
