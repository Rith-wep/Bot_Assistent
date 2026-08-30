from decimal import Decimal

from sqlalchemy import ForeignKey, Index, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base

class DeliveryZone(Base):
    __tablename__ = "delivery_zones"
    __table_args__ = (Index("ix_delivery_zones_business_sort", "business_id", "sort_order"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    business_id: Mapped[int] = mapped_column(
        ForeignKey("businesses.id"), nullable=False, index=True
    )
    zone_name_en: Mapped[str] = mapped_column(String(255), nullable=False)
    zone_name_km: Mapped[str | None] = mapped_column(String(255), nullable=True)
    fee: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    estimated_days: Mapped[str | None] = mapped_column(String(120), nullable=True)
    sort_order: Mapped[int] = mapped_column(default=0)
