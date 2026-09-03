from pydantic import BaseModel, Field

from app.models.order import PaymentMethod
from app.schemas.commerce import CatalogProductOut, CatalogResponse, OrderItemIn, OrderOut


class TelegramMiniAppVerifyRequest(BaseModel):
    init_data: str = Field(min_length=1)


class MiniAppAuthenticatedRequest(BaseModel):
    init_data: str = Field(min_length=1)


class TelegramMiniAppIdentityOut(BaseModel):
    channel: str = "telegram"
    external_customer_id: str
    user_id: int
    username: str | None = None
    first_name: str | None = None
    last_name: str | None = None
    auth_date: int


class MiniAppCatalogResponse(CatalogResponse):
    customer: TelegramMiniAppIdentityOut


class MiniAppProductResponse(BaseModel):
    customer: TelegramMiniAppIdentityOut
    product: CatalogProductOut


class MiniAppCheckoutRequest(MiniAppAuthenticatedRequest):
    customer_name: str = Field(min_length=1, max_length=255)
    phone: str = Field(min_length=1, max_length=50)
    delivery_address_text: str = Field(min_length=1, max_length=1000)
    delivery_zone_id: int | None = None
    payment_method: PaymentMethod = PaymentMethod.cod
    items: list[OrderItemIn] = Field(min_length=1)


class MiniAppCheckoutResponse(BaseModel):
    customer: TelegramMiniAppIdentityOut
    order: OrderOut
