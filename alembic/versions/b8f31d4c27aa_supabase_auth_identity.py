"""add Supabase Auth identity to users

Revision ID: b8f31d4c27aa
Revises: ad0d993308e8
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = "b8f31d4c27aa"
down_revision: Union[str, None] = "ad0d993308e8"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column("supabase_user_id", postgresql.UUID(as_uuid=True), nullable=True),
    )
    op.create_index(
        "ix_users_supabase_user_id",
        "users",
        ["supabase_user_id"],
        unique=True,
    )
    op.alter_column(
        "users",
        "password_hash",
        existing_type=sa.String(length=255),
        nullable=True,
    )


def downgrade() -> None:
    # A downgrade is intentionally blocked if Supabase-only users exist: they
    # have no local password hash and could not authenticate after rollback.
    connection = op.get_bind()
    missing_passwords = connection.execute(
        sa.text("SELECT count(*) FROM users WHERE password_hash IS NULL")
    ).scalar_one()
    if missing_passwords:
        raise RuntimeError(
            "Cannot downgrade while users without local password hashes exist"
        )

    op.alter_column(
        "users",
        "password_hash",
        existing_type=sa.String(length=255),
        nullable=False,
    )
    op.drop_index("ix_users_supabase_user_id", table_name="users")
    op.drop_column("users", "supabase_user_id")
