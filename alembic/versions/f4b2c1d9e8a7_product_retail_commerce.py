"""Add product retail commerce tables."""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "f4b2c1d9e8a7"
down_revision: Union[str, None] = "d8f9a0b1c2d3"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("""
        DO $$
        BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_method') THEN
                CREATE TYPE payment_method AS ENUM ('cod', 'prepaid');
            END IF;
        END
        $$;
    """)
    op.execute("""
        DO $$
        BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'order_status') THEN
                CREATE TYPE order_status AS ENUM ('pending', 'confirmed', 'shipped', 'cancelled');
            END IF;
        END
        $$;
    """)
    payment_method = postgresql.ENUM("cod", "prepaid", name="payment_method", create_type=False)
    order_status = postgresql.ENUM(
        "pending", "confirmed", "shipped", "cancelled", name="order_status", create_type=False
    )

    op.create_table(
        "products",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("business_id", sa.Integer(), nullable=False),
        sa.Column("name_en", sa.String(length=255), nullable=False),
        sa.Column("name_km", sa.String(length=255), nullable=True),
        sa.Column("description_en", sa.Text(), nullable=True),
        sa.Column("description_km", sa.Text(), nullable=True),
        sa.Column("category", sa.String(length=120), nullable=True),
        sa.Column("base_price", sa.Numeric(12, 2), nullable=False),
        sa.Column("photo_urls", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False),
        sa.Column("sort_order", sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(["business_id"], ["businesses.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_products_business_id", "products", ["business_id"])
    op.create_index("ix_products_business_sort", "products", ["business_id", "sort_order"])
    op.create_index("ix_products_category", "products", ["category"])
    op.create_index("ix_products_is_active", "products", ["is_active"])

    op.create_table(
        "product_variants",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("product_id", sa.Integer(), nullable=False),
        sa.Column("variant_label", sa.String(length=255), nullable=False),
        sa.Column("price_override", sa.Numeric(12, 2), nullable=True),
        sa.Column("stock_quantity", sa.Integer(), nullable=False),
        sa.Column("sku", sa.String(length=120), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False),
        sa.ForeignKeyConstraint(["product_id"], ["products.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_product_variants_is_active", "product_variants", ["is_active"])
    op.create_index("ix_product_variants_product_active", "product_variants", ["product_id", "is_active"])
    op.create_index("ix_product_variants_product_id", "product_variants", ["product_id"])

    op.create_table(
        "delivery_zones",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("business_id", sa.Integer(), nullable=False),
        sa.Column("zone_name_en", sa.String(length=255), nullable=False),
        sa.Column("zone_name_km", sa.String(length=255), nullable=True),
        sa.Column("fee", sa.Numeric(12, 2), nullable=False),
        sa.Column("estimated_days", sa.String(length=120), nullable=True),
        sa.Column("sort_order", sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(["business_id"], ["businesses.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_delivery_zones_business_id", "delivery_zones", ["business_id"])
    op.create_index("ix_delivery_zones_business_sort", "delivery_zones", ["business_id", "sort_order"])

    op.create_table(
        "orders",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("business_id", sa.Integer(), nullable=False),
        sa.Column("conversation_id", sa.Integer(), nullable=False),
        sa.Column("customer_name", sa.String(length=255), nullable=True),
        sa.Column("phone", sa.String(length=50), nullable=True),
        sa.Column("items", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("delivery_zone_id", sa.Integer(), nullable=True),
        sa.Column("delivery_address_text", sa.Text(), nullable=False),
        sa.Column("delivery_fee", sa.Numeric(12, 2), nullable=False),
        sa.Column("items_total", sa.Numeric(12, 2), nullable=False),
        sa.Column("grand_total", sa.Numeric(12, 2), nullable=False),
        sa.Column("payment_method", payment_method, nullable=False),
        sa.Column("status", order_status, nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["business_id"], ["businesses.id"]),
        sa.ForeignKeyConstraint(["conversation_id"], ["conversations.id"]),
        sa.ForeignKeyConstraint(["delivery_zone_id"], ["delivery_zones.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_orders_business_created", "orders", ["business_id", "created_at"])
    op.create_index("ix_orders_business_id", "orders", ["business_id"])
    op.create_index("ix_orders_conversation_id", "orders", ["conversation_id"])
    op.create_index("ix_orders_delivery_zone_id", "orders", ["delivery_zone_id"])
    op.create_index("ix_orders_status", "orders", ["status"])

    op.create_table(
        "conversation_carts",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("business_id", sa.Integer(), nullable=False),
        sa.Column("conversation_id", sa.Integer(), nullable=False),
        sa.Column("state", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.Column("expires_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(["business_id"], ["businesses.id"]),
        sa.ForeignKeyConstraint(["conversation_id"], ["conversations.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_conversation_carts_business_id", "conversation_carts", ["business_id"])
    op.create_index(
        "ix_conversation_carts_business_conversation",
        "conversation_carts",
        ["business_id", "conversation_id"],
        unique=True,
    )
    op.create_index("ix_conversation_carts_conversation_id", "conversation_carts", ["conversation_id"])
    op.create_index("ix_conversation_carts_expires", "conversation_carts", ["expires_at"])

    for table in ("products", "product_variants", "delivery_zones", "orders", "conversation_carts"):
        op.execute(f'ALTER TABLE public."{table}" ENABLE ROW LEVEL SECURITY')


def downgrade() -> None:
    for table in ("products", "product_variants", "delivery_zones", "orders", "conversation_carts"):
        op.execute(f'ALTER TABLE public."{table}" DISABLE ROW LEVEL SECURITY')
    op.drop_table("conversation_carts")
    op.drop_table("orders")
    op.drop_table("delivery_zones")
    op.drop_table("product_variants")
    op.drop_table("products")
    postgresql.ENUM(name="order_status").drop(op.get_bind(), checkfirst=True)
    postgresql.ENUM(name="payment_method").drop(op.get_bind(), checkfirst=True)
