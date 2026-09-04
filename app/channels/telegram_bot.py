"""Wires Telegram updates to the DB-backed engine for one business's bot.

Ported from v1_legacy/main.py + bot/handlers.py. Running many of these
from one process (multi-bot) is a later build step — this builds and
runs a single Application for one business.
"""
import logging

from fastapi import HTTPException
from telegram import InlineKeyboardButton, InlineKeyboardMarkup, Update, WebAppInfo
from telegram.ext import Application, CommandHandler, ContextTypes, MessageHandler, filters

from app.core.config import settings
from app.core.time import utcnow
from app.db.session import SessionLocal
from app.models.bot_config import BotConfig
from app.models.business import Business
from app.models.product import Product
from app.repositories.admin import AdminInviteRepository, AdminRepository
from app.services import conversation_state, handoff, leads
from app.services.commerce import (
    cart_confirmation_summary,
    cart_missing_order_fields,
    cart_ready_for_order,
    create_order_from_cart,
    merge_cart_patch,
    notify_order,
)
from app.services.exceptions import BusinessRuleError
from app.services.ai import FALLBACK_REPLY, get_ai_reply

logger = logging.getLogger(__name__)

_DEFAULT_GREETING = "Hi! Send me a message and I'll do my best to help."
_PHOTO_REQUEST_WORDS = ("photo", "picture", "image", "see", "show", "មើល", "រូប")


# ---------------------------------------------------------------------------
# Product photo helpers
# ---------------------------------------------------------------------------


def _looks_like_photo_request(text: str) -> bool:
    """Detect simple customer phrasing that should trigger product photos."""
    lowered = text.lower()
    return any(word in lowered for word in _PHOTO_REQUEST_WORDS)


def _product_ids_for_photo_reply(db, business_id: int, message: str, commerce: dict | None) -> list[int]:
    """Choose which product photos to send after the AI describes products."""
    commerce_payload = commerce if isinstance(commerce, dict) else {}
    ids = list(dict.fromkeys(commerce_payload.get("mentioned_product_ids") or []))
    if ids:
        return ids[:3]
    if not _looks_like_photo_request(message):
        return []

    products = (
        db.query(Product)
        .filter(Product.business_id == business_id, Product.is_active.is_(True))
        .order_by(Product.sort_order, Product.id)
        .limit(3)
        .all()
    )
    return [product.id for product in products]


def _mini_app_keyboard(business_id: int) -> InlineKeyboardMarkup | None:
    """Return a Telegram Mini App button when a public frontend URL is configured."""
    frontend_url = settings.frontend_url.split(",")[0].strip().rstrip("/")
    if not frontend_url or "localhost" in frontend_url:
        return None

    return InlineKeyboardMarkup(
        [
            [
                InlineKeyboardButton(
                    "Open shop",
                    web_app=WebAppInfo(url=f"{frontend_url}/mini/shop/{business_id}"),
                )
            ]
        ]
    )

# ---------------------------------------------------------------------------
# Customer message handler
# ---------------------------------------------------------------------------


async def handle_message(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Reply to the customer using the AI brain, with memory, lead capture, and handoff."""
    business_id = context.application.bot_data["business_id"]
    owner_chat_id = context.application.bot_data["owner_chat_id"]
    chat_id = update.effective_chat.id
    customer_message = update.message.text

    db = SessionLocal()
    try:
        reply, lead, handoff_reason, conversation, commerce = await get_ai_reply(
            db, business_id, chat_id, customer_message
        )
        await update.message.reply_text(reply)

        product_ids = _product_ids_for_photo_reply(db, business_id, customer_message, commerce)
        if product_ids:
            mini_app_keyboard = _mini_app_keyboard(business_id)
            if mini_app_keyboard is not None:
                await update.message.reply_text(
                    "Browse products and order in the shop:",
                    reply_markup=mini_app_keyboard,
                )

            products = (
                db.query(Product)
                .filter(
                    Product.business_id == business_id,
                    Product.id.in_(product_ids),
                    Product.is_active.is_(True),
                )
                .all()
            )
            for product in products:
                photo_urls = (product.photo_urls or [])[:2]
                if not photo_urls:
                    await update.message.reply_text(
                        f"No photo is saved yet for {product.name_en}, but I can describe it or help you choose a variant."
                    )
                for photo_url in photo_urls:
                    try:
                        await update.message.reply_photo(photo=photo_url)
                    except Exception:
                        logger.warning("Could not send product photo url=%s", photo_url, exc_info=True)

        if lead:
            await leads.process_lead(
                db,
                business_id,
                context.bot,
                owner_chat_id,
                conversation,
                name=lead.get("name", ""),
                phone=lead.get("phone", ""),
                interest=lead.get("interest", ""),
            )

        db.commit()

        if isinstance(commerce, dict) and (
            commerce.get("cart_patch") or commerce.get("order") or commerce.get("confirmed_order")
        ):
            cart_patch = commerce.get("cart_patch") or commerce.get("order")
            confirmed_order = bool(commerce.get("confirmed_order"))
            try:
                cart = merge_cart_patch(db, business_id, conversation.id, cart_patch)
                state = dict(cart.state or {})
                missing_fields = cart_missing_order_fields(cart)
                awaiting_confirmation = bool(state.get("awaiting_order_confirmation"))
                if confirmed_order and cart_ready_for_order(cart) and awaiting_confirmation:
                    order = create_order_from_cart(db, business_id, conversation.id, cart)
                    cart.state = {"items": []}
                    await notify_order(db, business_id, context.bot, owner_chat_id, order)
                elif cart_ready_for_order(cart) and not awaiting_confirmation:
                    state["awaiting_order_confirmation"] = True
                    cart.state = state
                    await update.message.reply_text(cart_confirmation_summary(db, business_id, cart))
                elif confirmed_order and missing_fields:
                    logger.info(
                        "retail_order_confirmation_blocked business_id=%s conversation_id=%s missing_fields=%s",
                        business_id,
                        conversation.id,
                        missing_fields,
                    )
                db.commit()
            except (BusinessRuleError, HTTPException) as exc:
                detail = getattr(exc, "detail", str(exc))
                logger.warning(
                    "Could not create retail order business_id=%s conversation_id=%s detail=%s",
                    business_id,
                    conversation.id,
                    detail,
                    exc_info=True,
                )
                db.rollback()
            except Exception:
                logger.exception(
                    "Retail cart/order side effect failed business_id=%s conversation_id=%s",
                    business_id,
                    conversation.id,
                )
                db.rollback()

        try:
            if handoff_reason:
                await handoff.notify_owner(
                    db, business_id, context.bot, owner_chat_id, conversation, handoff_reason
                )
            db.commit()
        except Exception:
            db.rollback()
            logger.exception(
                "Handoff notification failed business_id=%s conversation_id=%s",
                business_id,
                conversation.id,
            )

    except Exception:
        db.rollback()
        logger.exception(
            "Telegram message side effect failed business_id=%s chat_id=%s after reply handling",
            business_id,
            chat_id,
        )
    finally:
        db.close()


# ---------------------------------------------------------------------------
# Maintenance commands
# ---------------------------------------------------------------------------


async def reset(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Clear this chat's conversation history and state (/reset command)."""
    business_id = context.application.bot_data["business_id"]
    chat_id = update.effective_chat.id

    db = SessionLocal()
    try:
        conversation_state.start_new_conversation(db, business_id, chat_id)
        conversation_state.clear_streak(business_id, chat_id)
        db.commit()
    finally:
        db.close()

    await update.message.reply_text("Conversation reset. You can start again now.")
    # return

    # db = SessionLocal()
    # try:
    #     conversation_state.start_new_conversation(db, business_id, chat_id)
    #     conversation_state.clear_streak(business_id, chat_id)
    #     db.commit()
    # finally:
    #     db.close()

    # await update.message.reply_text("ការសន្ទនាត្រូវបានលុបចោល។ ចាប់ផ្តើមថ្មីបានហើយ!")

# ---------------------------------------------------------------------------
# Owner/admin onboarding helpers
# ---------------------------------------------------------------------------


def _claim_owner_if_needed(business_id: int, chat_id: int) -> bool:
    """Onboarding step 3: the first person to message a freshly-connected bot
    (whose owner_chat_id is still unset) becomes its owner. Returns True if
    this call just claimed it.
    """
    db = SessionLocal()
    try:
        bot_config = db.query(BotConfig).filter(BotConfig.business_id == business_id).first()
        if bot_config is not None and bot_config.owner_chat_id is None:
            bot_config.owner_chat_id = chat_id
            db.commit()
            return True
        return False
    finally:
        db.close()


def _claim_admin_invite(business_id: int, chat_id: int, token: str, name: str | None) -> bool:
    """Deep-link admin invite (t.me/{bot}?start=admin_{token}): consumes a
    one-time token to add a new admin who'll receive owner-style notifications.
    """
    db = SessionLocal()
    try:
        invite = AdminInviteRepository(db, business_id).get_valid_by_token(token)
        if invite is None:
            return False
        invite.used_at = utcnow()
        AdminRepository(db, business_id).create(chat_id=chat_id, name=name)
        db.commit()
        return True
    finally:
        db.close()


def _welcome_message_for(business_id: int) -> str:
    """The business's configured English welcome message, falling back to
    whichever one is set, then a generic greeting.
    """
    db = SessionLocal()
    try:
        business = db.get(Business, business_id)
        if business is None:
            return _DEFAULT_GREETING

        if business.welcome_message_en:
            return business.welcome_message_en

        return business.welcome_message_en or business.welcome_message_km or _DEFAULT_GREETING
    finally:
        db.close()



async def start(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """/start — Telegram's own "Start" button sends this. Three cases:
    an admin deep-link payload, claiming ownership if nobody has linked this
    bot yet, or the business's configured welcome message.
    """
    business_id = context.application.bot_data["business_id"]
    chat_id = update.effective_chat.id

    if context.args and context.args[0].startswith("admin_"):
        token = context.args[0][len("admin_") :]
        name = update.effective_user.first_name if update.effective_user else None
        if _claim_admin_invite(business_id, chat_id, token, name):
            await update.message.reply_text(
                "You're now connected as an admin for this assistant! You'll receive "
                "notifications for new leads and conversations that need attention."
            )
        else:
            await update.message.reply_text(
                "This invite link is invalid or has expired. Ask the business owner for a new one."
            )
        return

    if _claim_owner_if_needed(business_id, chat_id):
        context.application.bot_data["owner_chat_id"] = chat_id
        await update.message.reply_text(
            "You're now linked as the owner of this assistant! Go back to the "
            "setup wizard to continue — send /myid anytime to see this ID again."
        )
    else:
        await update.message.reply_text(_welcome_message_for(business_id))


async def myid(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Reply with the sender's numeric Telegram chat ID (/myid command).
    Also claims ownership if nobody has linked this bot yet (see /start).
    """
    business_id = context.application.bot_data["business_id"]
    chat_id = update.effective_chat.id
    if _claim_owner_if_needed(business_id, chat_id):
        context.application.bot_data["owner_chat_id"] = chat_id
        await update.message.reply_text(
            f"{chat_id}\n\nYou're now linked as the owner of this assistant! "
            "Go back to the setup wizard to continue."
        )
    else:
        await update.message.reply_text(str(chat_id))


# ---------------------------------------------------------------------------
# Runtime error handling and application wiring
# ---------------------------------------------------------------------------


async def on_error(update: object, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Safety net: log any unexpected exception and apologize instead of crashing."""
    business_id = context.application.bot_data.get("business_id")
    logger.error(
        "business_id=%s: unhandled exception while processing an update",
        business_id,
        exc_info=context.error,
    )
    if isinstance(update, Update) and update.effective_message:
        try:
            await update.effective_message.reply_text(FALLBACK_REPLY)
        except Exception:
            logger.exception("business_id=%s: failed to send the fallback apology", business_id)


def build_application(token: str, business_id: int, owner_chat_id: int | None) -> Application:
    """Build one python-telegram-bot Application bound to a single business."""
    app = Application.builder().token(token).build()
    app.bot_data["business_id"] = business_id
    app.bot_data["owner_chat_id"] = owner_chat_id
    app.add_handler(CommandHandler("start", start))
    app.add_handler(CommandHandler("reset", reset))
    app.add_handler(CommandHandler("myid", myid))
    app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, handle_message))
    app.add_error_handler(on_error)
    return app
