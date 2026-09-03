import enum
from datetime import datetime
from decimal import Decimal
from typing import Any

from sqlalchemy import Enum, ForeignKey, Index, Numeric, String, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.core.time import utcnow
from app.db.base import Base


class PaymentMethod(str, enum.Enum):
    cod = "cod"
    prepaid = "prepaid"


class PaymentStatus(str, enum.Enum):
    unpaid = "unpaid"
    paid = "paid"
    refunded = "refunded"


class OrderStatus(str, enum.Enum):
    pending = "pending"
    confirmed = "confirmed"
    shipped = "shipped"
    cancelled = "cancelled"


class CustomerChannel(str, enum.Enum):
    telegram = "telegram"
    website = "website"
    facebook = "facebook"
    whatsapp = "whatsapp"


class Order(Base):
    __tablename__ = "orders"
    __table_args__ = (Index("ix_orders_business_created", "business_id", "created_at"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    business_id: Mapped[int] = mapped_column(
        ForeignKey("businesses.id"), nullable=False, index=True
    )
    order_number: Mapped[str] = mapped_column(String(40), nullable=False, unique=True, index=True)
    conversation_id: Mapped[int] = mapped_column(
        ForeignKey("conversations.id"), nullable=False, index=True
    )
    channel: Mapped[CustomerChannel] = mapped_column(
        Enum(CustomerChannel, name="customer_channel"), default=CustomerChannel.telegram, index=True
    )
    external_customer_id: Mapped[str | None] = mapped_column(String(120), nullable=True, index=True)
    customer_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    phone: Mapped[str | None] = mapped_column(String(50), nullable=True)
    items: Mapped[list[dict[str, Any]]] = mapped_column(JSONB, nullable=False)
    delivery_zone_id: Mapped[int | None] = mapped_column(
        ForeignKey("delivery_zones.id"), nullable=True, index=True
    )
    delivery_address_text: Mapped[str] = mapped_column(Text, nullable=False)
    delivery_fee: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    items_total: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    grand_total: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    payment_method: Mapped[PaymentMethod] = mapped_column(
        Enum(PaymentMethod, name="payment_method"), nullable=False
    )
    payment_status: Mapped[PaymentStatus] = mapped_column(
        Enum(PaymentStatus, name="payment_status"), default=PaymentStatus.unpaid, index=True
    )
    status: Mapped[OrderStatus] = mapped_column(
        Enum(OrderStatus, name="order_status"), default=OrderStatus.pending, index=True
    )
    created_at: Mapped[datetime] = mapped_column(default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(default=utcnow, onupdate=utcnow)
    cancelled_at: Mapped[datetime | None] = mapped_column(nullable=True)
    cancellation_reason: Mapped[str | None] = mapped_column(Text, nullable=True)


class OrderItem(Base):
    __tablename__ = "order_items"
    __table_args__ = (Index("ix_order_items_business_order", "business_id", "order_id"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    business_id: Mapped[int] = mapped_column(
        ForeignKey("businesses.id"), nullable=False, index=True
    )
    order_id: Mapped[int] = mapped_column(
        ForeignKey("orders.id", ondelete="CASCADE"), nullable=False, index=True
    )
    product_id: Mapped[int] = mapped_column(ForeignKey("products.id"), nullable=False, index=True)
    variant_id: Mapped[int | None] = mapped_column(
        ForeignKey("product_variants.id"), nullable=True, index=True
    )
    product_name_snapshot: Mapped[str] = mapped_column(String(255), nullable=False)
    variant_name_snapshot: Mapped[str | None] = mapped_column(String(255), nullable=True)
    unit_price_snapshot: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    quantity: Mapped[int] = mapped_column(nullable=False)
    line_total: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    created_at: Mapped[datetime] = mapped_column(default=utcnow)
