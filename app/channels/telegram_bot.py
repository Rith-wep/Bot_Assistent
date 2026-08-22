"""Wires Telegram updates to the DB-backed engine for one business's bot.

Ported from v1_legacy/main.py + bot/handlers.py. Running many of these
from one process (multi-bot) is a later build step — this builds and
runs a single Application for one business.
"""
import logging

from telegram import Update
from telegram.ext import Application, CommandHandler, ContextTypes, MessageHandler, filters

from app.core.time import utcnow
from app.db.session import SessionLocal
from app.models.bot_config import BotConfig
from app.models.business import Business
from app.repositories.admin import AdminInviteRepository, AdminRepository
from app.services import conversation_state, handoff, leads
from app.services.ai import FALLBACK_REPLY, get_ai_reply

logger = logging.getLogger(__name__)

_DEFAULT_GREETING = "Hi! Send me a message and I'll do my best to help."

#====> main entry point for the bot's message handling
async def handle_message(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Reply to the customer using the AI brain, with memory, lead capture, and handoff."""
    business_id = context.application.bot_data["business_id"]
    owner_chat_id = context.application.bot_data["owner_chat_id"]
    chat_id = update.effective_chat.id
    customer_message = update.message.text

    #====> get the AI's reply, and handle any lead or handoff
    db = SessionLocal()
    try:
        reply, lead, handoff_reason, conversation = await get_ai_reply(
            db, business_id, chat_id, customer_message
        )
        await update.message.reply_text(reply)

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

        #====> if the AI decided to hand off to a human, notify the owner/admins
        if handoff_reason:
            await handoff.notify_owner(
                db, business_id, context.bot, owner_chat_id, conversation, handoff_reason
            )

        db.commit()
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


#====> /reset command: clear the conversation history and streak for this chat
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
    return

    db = SessionLocal()
    try:
        conversation_state.start_new_conversation(db, business_id, chat_id)
        conversation_state.clear_streak(business_id, chat_id)
        db.commit()
    finally:
        db.close()

    await update.message.reply_text("ការសន្ទនាត្រូវបានលុបចោល។ ចាប់ផ្តើមថ្មីបានហើយ!")

#====> /start command: claim ownership or welcome the user
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


#====> /start command: claim an admin invite if the user has a valid token
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

#====> /start command: get the business's configured welcome message
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


#====> /start command: handle the three cases (admin invite, claim owner, or welcome)
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
    app = Application.builder().token(token).build()
    app.bot_data["business_id"] = business_id
    app.bot_data["owner_chat_id"] = owner_chat_id
    app.add_handler(CommandHandler("start", start))
    app.add_handler(CommandHandler("reset", reset))
    app.add_handler(CommandHandler("myid", myid))
    app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, handle_message))
    app.add_error_handler(on_error)
    return app
