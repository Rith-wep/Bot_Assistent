from decimal import Decimal
from typing import Any

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.models.order import CustomerChannel, OrderStatus, PaymentMethod, PaymentStatus
from app.schemas.common import UtcDatetime


class ProductVariantIn(BaseModel):
    id: int | None = None
    variant_label: str = Field(min_length=1, max_length=255)
    price_override: Decimal | None = Field(default=None, ge=0)
    stock_quantity: int = Field(default=0, ge=0)
    sku: str | None = Field(default=None, max_length=120)
    is_active: bool = True


class ProductVariantOut(ProductVariantIn):
    model_config = ConfigDict(from_attributes=True)
    id: int
    product_id: int


class ProductBase(BaseModel):
    name_en: str = Field(min_length=1, max_length=255)
    name_km: str | None = Field(default=None, max_length=255)
    description_en: str | None = None
    description_km: str | None = None
    category: str | None = Field(default=None, max_length=120)
    base_price: Decimal = Field(ge=0)
    photo_urls: list[str] = Field(default_factory=list)
    is_active: bool = True
    sort_order: int = 0

    @field_validator("photo_urls")
    @classmethod
    def clean_photo_urls(cls, urls: list[str]) -> list[str]:
        return [url.strip() for url in urls if url and url.strip()][:8]


class ProductCreate(ProductBase):
    variants: list[ProductVariantIn] = Field(default_factory=list)


class ProductUpdate(ProductBase):
    variants: list[ProductVariantIn] = Field(default_factory=list)


class ProductOut(ProductBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    variants: list[ProductVariantOut] = []


class CatalogVariantOut(BaseModel):
    id: int
    label: str
    price: Decimal
    stock_quantity: int
    sku: str | None = None


class CatalogProductOut(BaseModel):
    id: int
    name_en: str
    name_km: str | None = None
    description_en: str | None = None
    description_km: str | None = None
    category: str | None = None
    price: Decimal
    photo_urls: list[str] = []
    in_stock: bool
    variants: list[CatalogVariantOut] = []


class CatalogResponse(BaseModel):
    products: list[CatalogProductOut]
    categories: list[str]


class ProductDraft(ProductCreate):
    pass


class ProductExtractRequest(BaseModel):
    text: str = Field(min_length=1, max_length=8000)


class ProductExtractResponse(BaseModel):
    products: list[ProductDraft]


class DeliveryZoneBase(BaseModel):
    zone_name_en: str = Field(min_length=1, max_length=255)
    zone_name_km: str | None = Field(default=None, max_length=255)
    fee: Decimal = Field(ge=0)
    estimated_days: str | None = Field(default=None, max_length=120)
    sort_order: int = 0


class DeliveryZoneCreate(DeliveryZoneBase):
    pass


class DeliveryZoneUpdate(DeliveryZoneBase):
    pass


class DeliveryZoneOut(DeliveryZoneBase):
    model_config = ConfigDict(from_attributes=True)
    id: int


class OrderItemIn(BaseModel):
    product_id: int
    variant_id: int | None = None
    qty: int = Field(ge=1, le=100)


class OrderCreate(BaseModel):
    conversation_id: int
    channel: CustomerChannel = CustomerChannel.telegram
    external_customer_id: str | None = Field(default=None, max_length=120)
    customer_name: str | None = Field(default=None, max_length=255)
    phone: str | None = Field(default=None, max_length=50)
    items: list[OrderItemIn] = Field(min_length=1)
    delivery_zone_id: int | None = None
    delivery_address_text: str = Field(min_length=1)
    payment_method: PaymentMethod = PaymentMethod.cod


class OrderStatusUpdate(BaseModel):
    status: OrderStatus
    cancellation_reason: str | None = Field(default=None, max_length=1000)


class OrderItemOut(BaseModel):
    id: int | None = None
    product_id: int
    variant_id: int | None = None
    product_name: str
    variant_label: str | None = None
    unit_price: Decimal
    qty: int
    line_total: Decimal


class OrderOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    order_number: str
    conversation_id: int
    channel: CustomerChannel
    external_customer_id: str | None
    customer_name: str | None
    phone: str | None
    items: list[OrderItemOut | dict[str, Any]]
    delivery_zone_id: int | None
    delivery_zone_name: str | None = None
    delivery_address_text: str
    delivery_fee: Decimal
    items_total: Decimal
    grand_total: Decimal
    payment_method: PaymentMethod
    payment_status: PaymentStatus
    status: OrderStatus
    created_at: UtcDatetime
    updated_at: UtcDatetime
    cancelled_at: UtcDatetime | None = None
    cancellation_reason: str | None = None


class OrderPage(BaseModel):
    items: list[OrderOut]
    total: int
    page: int
    page_size: int
