"""Add commerce order item snapshots and production order metadata."""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "9c1a7e2f4b6d"
down_revision: Union[str, None] = "f4b2c1d9e8a7"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("""
        DO $$
        BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_status') THEN
                CREATE TYPE payment_status AS ENUM ('unpaid', 'paid', 'refunded');
            END IF;
        END
        $$;
    """)
    op.execute("""
        DO $$
        BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'customer_channel') THEN
                CREATE TYPE customer_channel AS ENUM ('telegram', 'website', 'facebook', 'whatsapp');
            END IF;
        END
        $$;
    """)
    payment_status = postgresql.ENUM("unpaid", "paid", "refunded", name="payment_status", create_type=False)
    customer_channel = postgresql.ENUM(
        "telegram", "website", "facebook", "whatsapp", name="customer_channel", create_type=False
    )

    op.add_column("products", sa.Column("created_at", sa.DateTime(), nullable=True))
    op.add_column("products", sa.Column("updated_at", sa.DateTime(), nullable=True))
    op.execute("UPDATE products SET created_at = NOW(), updated_at = NOW()")
    op.alter_column("products", "created_at", nullable=False)
    op.alter_column("products", "updated_at", nullable=False)

    op.add_column("product_variants", sa.Column("business_id", sa.Integer(), nullable=True))
    op.execute("""
        UPDATE product_variants
        SET business_id = products.business_id
        FROM products
        WHERE product_variants.product_id = products.id
    """)
    op.alter_column("product_variants", "business_id", nullable=False)
    op.add_column("product_variants", sa.Column("created_at", sa.DateTime(), nullable=True))
    op.add_column("product_variants", sa.Column("updated_at", sa.DateTime(), nullable=True))
    op.execute("UPDATE product_variants SET created_at = NOW(), updated_at = NOW()")
    op.alter_column("product_variants", "created_at", nullable=False)
    op.alter_column("product_variants", "updated_at", nullable=False)
    op.create_foreign_key(
        "fk_product_variants_business_id_businesses",
        "product_variants",
        "businesses",
        ["business_id"],
        ["id"],
    )
    op.create_index("ix_product_variants_business_id", "product_variants", ["business_id"])

    op.add_column("orders", sa.Column("order_number", sa.String(length=40), nullable=True))
    op.add_column("orders", sa.Column("channel", customer_channel, nullable=True))
    op.add_column("orders", sa.Column("external_customer_id", sa.String(length=120), nullable=True))
    op.add_column("orders", sa.Column("payment_status", payment_status, nullable=True))
    op.add_column("orders", sa.Column("updated_at", sa.DateTime(), nullable=True))
    op.add_column("orders", sa.Column("cancelled_at", sa.DateTime(), nullable=True))
    op.add_column("orders", sa.Column("cancellation_reason", sa.Text(), nullable=True))
    op.execute("""
        UPDATE orders
        SET
            order_number = 'ORD-' || to_char(orders.created_at, 'YYYYMMDD') || '-' || lpad(orders.id::text, 4, '0'),
            channel = 'telegram',
            external_customer_id = conversations.customer_chat_id::text,
            payment_status = 'unpaid',
            updated_at = orders.created_at,
            cancelled_at = CASE WHEN orders.status = 'cancelled' THEN orders.created_at ELSE NULL END
        FROM conversations
        WHERE orders.conversation_id = conversations.id
    """)
    op.alter_column("orders", "order_number", nullable=False)
    op.alter_column("orders", "channel", nullable=False)
    op.alter_column("orders", "payment_status", nullable=False)
    op.alter_column("orders", "updated_at", nullable=False)
    op.create_index("ix_orders_order_number", "orders", ["order_number"], unique=True)
    op.create_index("ix_orders_external_customer_id", "orders", ["external_customer_id"])
    op.create_index("ix_orders_channel", "orders", ["channel"])
    op.create_index("ix_orders_payment_status", "orders", ["payment_status"])

    op.create_table(
        "order_items",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("business_id", sa.Integer(), nullable=False),
        sa.Column("order_id", sa.Integer(), nullable=False),
        sa.Column("product_id", sa.Integer(), nullable=False),
        sa.Column("variant_id", sa.Integer(), nullable=True),
        sa.Column("product_name_snapshot", sa.String(length=255), nullable=False),
        sa.Column("variant_name_snapshot", sa.String(length=255), nullable=True),
        sa.Column("unit_price_snapshot", sa.Numeric(12, 2), nullable=False),
        sa.Column("quantity", sa.Integer(), nullable=False),
        sa.Column("line_total", sa.Numeric(12, 2), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["business_id"], ["businesses.id"]),
        sa.ForeignKeyConstraint(["order_id"], ["orders.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["product_id"], ["products.id"]),
        sa.ForeignKeyConstraint(["variant_id"], ["product_variants.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_order_items_business_id", "order_items", ["business_id"])
    op.create_index("ix_order_items_order_id", "order_items", ["order_id"])
    op.create_index("ix_order_items_product_id", "order_items", ["product_id"])
    op.create_index("ix_order_items_variant_id", "order_items", ["variant_id"])
    op.create_index("ix_order_items_business_order", "order_items", ["business_id", "order_id"])
    op.execute('ALTER TABLE public."order_items" ENABLE ROW LEVEL SECURITY')


def downgrade() -> None:
    op.execute('ALTER TABLE public."order_items" DISABLE ROW LEVEL SECURITY')
    op.drop_index("ix_order_items_business_order", table_name="order_items")
    op.drop_index("ix_order_items_variant_id", table_name="order_items")
    op.drop_index("ix_order_items_product_id", table_name="order_items")
    op.drop_index("ix_order_items_order_id", table_name="order_items")
    op.drop_index("ix_order_items_business_id", table_name="order_items")
    op.drop_table("order_items")
    op.drop_index("ix_orders_payment_status", table_name="orders")
    op.drop_index("ix_orders_channel", table_name="orders")
    op.drop_index("ix_orders_external_customer_id", table_name="orders")
    op.drop_index("ix_orders_order_number", table_name="orders")
    op.drop_column("orders", "cancellation_reason")
    op.drop_column("orders", "cancelled_at")
    op.drop_column("orders", "updated_at")
    op.drop_column("orders", "payment_status")
    op.drop_column("orders", "external_customer_id")
    op.drop_column("orders", "channel")
    op.drop_column("orders", "order_number")
    op.drop_index("ix_product_variants_business_id", table_name="product_variants")
    op.drop_constraint("fk_product_variants_business_id_businesses", "product_variants", type_="foreignkey")
    op.drop_column("product_variants", "updated_at")
    op.drop_column("product_variants", "created_at")
    op.drop_column("product_variants", "business_id")
    op.drop_column("products", "updated_at")
    op.drop_column("products", "created_at")
    postgresql.ENUM(name="customer_channel").drop(op.get_bind(), checkfirst=True)
    postgresql.ENUM(name="payment_status").drop(op.get_bind(), checkfirst=True)
