"""Public Telegram Mini App API boundary.

These routes are not protected by dashboard auth. They trust customer identity
only after verifying Telegram's signed initData against the business bot token.
"""

import logging

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from telegram import Bot

from app.core.security import decrypt_secret
from app.db.session import get_db
from app.models.business import Business
from app.models.order import CustomerChannel
from app.repositories.bot_config import BotConfigRepository
from app.schemas.commerce import OrderOut
from app.schemas.mini_app import (
    MiniAppAuthenticatedRequest,
    MiniAppCatalogResponse,
    MiniAppCheckoutRequest,
    MiniAppCheckoutResponse,
    MiniAppProductResponse,
    TelegramMiniAppIdentityOut,
    TelegramMiniAppVerifyRequest,
)
from app.services import conversation_state
from app.services.commerce import catalog_categories, create_validated_order, list_catalog_products, notify_order, order_to_dict
from app.services.exceptions import BusinessRuleError
from app.services.telegram_mini_app import verify_init_data

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/mini", tags=["mini-app"])


def _verified_telegram_identity(
    business_id: int,
    init_data: str,
    db: Session,
):
    business = db.get(Business, business_id)
    if business is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Business not found")

    bot_config = BotConfigRepository(db, business_id).get_for_business()
    if bot_config is None or not bot_config.is_active:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Telegram Mini App is not available for this business",
        )

    try:
        bot_token = decrypt_secret(bot_config.telegram_bot_token_encrypted)
        return verify_init_data(init_data, bot_token)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(exc),
        ) from exc


def _identity_out(identity) -> TelegramMiniAppIdentityOut:
    return TelegramMiniAppIdentityOut(
        external_customer_id=identity.external_customer_id,
        user_id=identity.user_id,
        username=identity.username,
        first_name=identity.first_name,
        last_name=identity.last_name,
        auth_date=identity.auth_date,
    )


def _customer_order_message(order) -> str:
    return (
        f"Order received: {order.order_number}\n"
        f"Total: ${order.grand_total}\n"
        "We will contact you to confirm delivery."
    )


@router.post("/telegram/verify/{business_id}", response_model=TelegramMiniAppIdentityOut)
def verify_telegram_mini_app(
    business_id: int,
    payload: TelegramMiniAppVerifyRequest,
    db: Session = Depends(get_db),
) -> TelegramMiniAppIdentityOut:
    """Verify Telegram Mini App launch data for a business bot."""
    identity = _verified_telegram_identity(business_id, payload.init_data, db)
    return _identity_out(identity)


@router.post("/catalog/{business_id}", response_model=MiniAppCatalogResponse)
def mini_app_catalog(
    business_id: int,
    payload: MiniAppAuthenticatedRequest,
    db: Session = Depends(get_db),
) -> MiniAppCatalogResponse:
    """Return active catalog products for a verified Telegram Mini App customer."""
    identity = _verified_telegram_identity(business_id, payload.init_data, db)
    products = list_catalog_products(db, business_id, active_only=True)
    return MiniAppCatalogResponse(
        customer=_identity_out(identity),
        products=products,
        categories=catalog_categories(products),
    )


@router.post("/catalog/{business_id}/products/{product_id}", response_model=MiniAppProductResponse)
def mini_app_product_detail(
    business_id: int,
    product_id: int,
    payload: MiniAppAuthenticatedRequest,
    db: Session = Depends(get_db),
) -> MiniAppProductResponse:
    """Return one active product for a verified Telegram Mini App customer."""
    identity = _verified_telegram_identity(business_id, payload.init_data, db)
    products = list_catalog_products(db, business_id, active_only=True)
    product = next((item for item in products if item["id"] == product_id), None)
    if product is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")
    return MiniAppProductResponse(customer=_identity_out(identity), product=product)


@router.post("/checkout/{business_id}", response_model=MiniAppCheckoutResponse, status_code=status.HTTP_201_CREATED)
async def mini_app_checkout(
    business_id: int,
    payload: MiniAppCheckoutRequest,
    db: Session = Depends(get_db),
) -> MiniAppCheckoutResponse:
    """Create an order from a verified Mini App cart after server-side validation."""
    identity = _verified_telegram_identity(business_id, payload.init_data, db)
    bot_config = BotConfigRepository(db, business_id).get_for_business()
    conversation = conversation_state.get_active_conversation(db, business_id, identity.user_id)
    conversation.customer_name = payload.customer_name

    try:
        order = create_validated_order(
            db,
            business_id,
            conversation_id=conversation.id,
            channel=CustomerChannel.telegram,
            external_customer_id=identity.external_customer_id,
            customer_name=payload.customer_name,
            phone=payload.phone,
            items=payload.items,
            delivery_zone_id=payload.delivery_zone_id,
            delivery_address_text=payload.delivery_address_text,
            payment_method=payload.payment_method,
            dedupe_by_conversation=False,
        )
    except BusinessRuleError as exc:
        db.rollback()
        raise HTTPException(status_code=exc.status_code, detail=exc.detail) from exc

    db.commit()
    db.refresh(order)
    if bot_config is not None:
        try:
            bot = Bot(token=decrypt_secret(bot_config.telegram_bot_token_encrypted))
            await bot.send_message(chat_id=identity.user_id, text=_customer_order_message(order))
            await notify_order(db, business_id, bot, bot_config.owner_chat_id, order)
        except Exception:
            logger.exception(
                "mini_app_order_notification_failed business_id=%s order_id=%s",
                business_id,
                order.id,
            )
    return MiniAppCheckoutResponse(
        customer=_identity_out(identity),
        order=OrderOut.model_validate(order_to_dict(db, business_id, order)),
    )
