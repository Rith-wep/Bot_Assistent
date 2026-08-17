"""enable RLS on application tables

Revision ID: c4a92e7f105b
Revises: b8f31d4c27aa

The browser never accesses application tables directly. Enabling RLS without
public policies makes Supabase Data API access deny-by-default for anon and
authenticated roles, while the backend PostgreSQL connection remains the only
application data path.
"""

from typing import Sequence, Union

from alembic import op


revision: str = "c4a92e7f105b"
down_revision: Union[str, None] = "b8f31d4c27aa"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


APPLICATION_TABLES = (
    "businesses",
    "users",
    "bot_configs",
    "knowledge_items",
    "conversations",
    "messages",
    "leads",
    "admins",
    "admin_invites",
    "unanswered_questions",
    "question_clusters",
)


def upgrade() -> None:
    for table in APPLICATION_TABLES:
        op.execute(f'ALTER TABLE public."{table}" ENABLE ROW LEVEL SECURITY')


def downgrade() -> None:
    for table in APPLICATION_TABLES:
        op.execute(f'ALTER TABLE public."{table}" DISABLE ROW LEVEL SECURITY')
