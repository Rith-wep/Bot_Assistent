"""settings: business profile, AI behavior, notification prefs, admins

Revision ID: a3130a8c48ee
Revises: 88e954de5061
Create Date: 2026-07-09 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "a3130a8c48ee"
down_revision: Union[str, None] = "88e954de5061"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Business profile
    op.add_column("businesses", sa.Column("address", sa.String(length=500), nullable=True))
    op.add_column("businesses", sa.Column("phone", sa.String(length=50), nullable=True))
    op.add_column(
        "businesses",
        sa.Column(
            "timezone", sa.String(length=50), nullable=False, server_default="Asia/Phnom_Penh"
        ),
    )
    op.add_column("businesses", sa.Column("business_hours", postgresql.JSONB(), nullable=True))
    op.add_column("businesses", sa.Column("logo_url", sa.String(length=1000), nullable=True))

    # AI assistant behavior
    op.add_column(
        "businesses", sa.Column("assistant_display_name", sa.String(length=255), nullable=True)
    )
    op.add_column("businesses", sa.Column("welcome_message_en", sa.Text(), nullable=True))
    op.add_column("businesses", sa.Column("welcome_message_km", sa.Text(), nullable=True))

    # op.add_column doesn't auto-create the enum type the way op.create_table
    # does (that only happens for brand-new tables) — create it explicitly first.
    assistant_tone = postgresql.ENUM(
        "friendly", "professional", "short", name="assistant_tone"
    )
    assistant_tone.create(op.get_bind(), checkfirst=True)
    op.add_column(
        "businesses",
        sa.Column("tone", assistant_tone, nullable=False, server_default="friendly"),
    )
    op.add_column(
        "businesses",
        sa.Column(
            "handoff_on_unsure", sa.Boolean(), nullable=False, server_default=sa.text("true")
        ),
    )

    # Notification preferences
    op.add_column(
        "businesses",
        sa.Column("notify_on_lead", sa.Boolean(), nullable=False, server_default=sa.text("true")),
    )
    op.add_column(
        "businesses",
        sa.Column(
            "notify_on_payment", sa.Boolean(), nullable=False, server_default=sa.text("true")
        ),
    )
    op.add_column(
        "businesses",
        sa.Column(
            "notify_on_handoff", sa.Boolean(), nullable=False, server_default=sa.text("true")
        ),
    )

    # Admins: additional Telegram accounts (besides the primary owner_chat_id) that
    # receive notifications, claimed via a one-time deep-link invite (see admin_invites).
    op.create_table(
        "admins",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("business_id", sa.Integer(), nullable=False),
        sa.Column("chat_id", sa.BigInteger(), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=True),
        sa.Column("connected_at", sa.DateTime(), nullable=False, server_default=sa.text("now()")),
        sa.ForeignKeyConstraint(
            ["business_id"], ["businesses.id"], name="fk_admins_business_id_businesses"
        ),
        sa.PrimaryKeyConstraint("id", name="pk_admins"),
    )
    op.create_index("ix_admins_business_id", "admins", ["business_id"])

    op.create_table(
        "admin_invites",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("business_id", sa.Integer(), nullable=False),
        sa.Column("token", sa.String(length=64), nullable=False),
        sa.Column("expires_at", sa.DateTime(), nullable=False),
        sa.Column("used_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(
            ["business_id"], ["businesses.id"], name="fk_admin_invites_business_id_businesses"
        ),
        sa.PrimaryKeyConstraint("id", name="pk_admin_invites"),
    )
    op.create_index("ix_admin_invites_business_id", "admin_invites", ["business_id"])
    op.create_index("ix_admin_invites_token", "admin_invites", ["token"], unique=True)


def downgrade() -> None:
    op.drop_table("admin_invites")
    op.drop_table("admins")

    op.drop_column("businesses", "notify_on_handoff")
    op.drop_column("businesses", "notify_on_payment")
    op.drop_column("businesses", "notify_on_lead")
    op.drop_column("businesses", "handoff_on_unsure")
    op.drop_column("businesses", "tone")
    op.drop_column("businesses", "welcome_message_km")
    op.drop_column("businesses", "welcome_message_en")
    op.drop_column("businesses", "assistant_display_name")
    op.drop_column("businesses", "logo_url")
    op.drop_column("businesses", "business_hours")
    op.drop_column("businesses", "timezone")
    op.drop_column("businesses", "phone")
    op.drop_column("businesses", "address")

    bind = op.get_bind()
    sa.Enum(name="assistant_tone").drop(bind, checkfirst=True)
