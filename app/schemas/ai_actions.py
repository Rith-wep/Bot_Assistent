from pydantic import BaseModel, Field, field_validator

class RetailCartActionItem(BaseModel):
    product_id: int
    variant_id: int | None = None
    qty: int = Field(default=1, ge=1, le=100)


class RetailCartPatch(BaseModel):
    items: list[RetailCartActionItem] = Field(default_factory=list)
    delivery_zone_id: int | None = None
    delivery_address_text: str | None = None
    customer_name: str | None = None
    phone: str | None = None
    payment_method: str | None = None

    @field_validator("payment_method")
    @classmethod
    def clean_payment_method(cls, value: str | None) -> str | None:
        if value in (None, ""):
            return None
        lowered = value.strip().lower()
        return lowered if lowered in {"cod", "prepaid"} else None


class RetailAIAction(BaseModel):
    mentioned_product_ids: list[int] = Field(default_factory=list)
    cart_patch: RetailCartPatch | None = None
    confirmed_order: bool = False
    confidence: float = Field(default=0, ge=0, le=1)
    missing_fields: list[str] = Field(default_factory=list)
    customer_language: str | None = None

    @field_validator("mentioned_product_ids")
    @classmethod
    def unique_mentioned_product_ids(cls, product_ids: list[int]) -> list[int]:
        return list(dict.fromkeys(product_ids))[:5]

    def to_legacy_dict(self) -> dict:
        payload = self.model_dump(exclude_none=True)
        if payload.get("cart_patch") == {"items": []}:
            payload.pop("cart_patch")
        return payload
