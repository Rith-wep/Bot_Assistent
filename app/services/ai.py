"""Groq API calls and prompt assembly — the only AI-provider-aware module.

Ported from v1_legacy/bot/ai.py: same two-call design (generate the
customer-facing reply, then silently classify the exchange for lead/
handoff signals) and the same personality rules — now assembled from
this business's knowledge_items in the DB instead of business_info.md.

Each customer message triggers two Groq calls, kept deliberately
separate:
1. _generate_reply — plain text generation (no tools), so it always
   reliably returns something to show the customer.
2. _classify — a silent, structured-output call that reads the
   conversation (including the reply from step 1) and decides whether
   a lead was just completed or a human handoff is needed. Its output
   is never shown to the customer.
"""
import asyncio
import json
import logging
import time
from pathlib import Path
from typing import Optional

from groq import AsyncGroq
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.business import Business
from app.models.ai_profile import AIProfile
from app.models.business_rule import BusinessRule
from app.models.conversation import Conversation
from app.services import conversation_state, gaps
from app.services.knowledge import build_business_info_text

logger = logging.getLogger(__name__)

_client = AsyncGroq(api_key=settings.groq_api_key)

_SYSTEM_PROMPT_PATH = Path(__file__).resolve().parent.parent.parent / "prompts" / "system_prompt.md"
_RULES_TEXT = _SYSTEM_PROMPT_PATH.read_text(encoding="utf-8")
_prompt_context_cache: dict[int, tuple[float, str, bool]] = {}
_PROMPT_CONTEXT_TTL_SECONDS = 60


def clear_prompt_context_cache(business_id: int) -> None:
    _prompt_context_cache.pop(business_id, None)


def _get_cached_business_info(db: Session, business_id: int) -> str:
    now = time.monotonic()
    cached = _prompt_context_cache.get(business_id)
    if cached and now - cached[0] < _PROMPT_CONTEXT_TTL_SECONDS:
        return cached[1]
    info = build_business_info_text(conversation_state.get_knowledge_items(db, business_id))
    _prompt_context_cache[business_id] = (now, info, False)
    return info

RETRY_DELAY_SECONDS = 2
MAX_EXCHANGES = conversation_state.MAX_EXCHANGES

_HANDOFF_ALREADY_ACTIVE_NOTE = (
    "\n\nNote: this customer's issue has already been escalated to a human staff "
    "member. Keep answering simple questions normally, but do not try to resolve "
    "their original unresolved issue yourself — if it comes up again, just remind "
    "them that staff will handle it."
)

FALLBACK_REPLY = (
    "សូមទោស! ឥឡូវនេះមានបញ្ហាបច្ចេកទេសបន្តិច។ សូមសាកល្បងម្តងទៀតក្នុងពេលបន្តិចទៀត។"
)

_GROQ_ROLE = {"customer": "user", "bot": "assistant"}

FALLBACK_REPLY = (
    "Sorry, I'm having a small technical issue right now. Please try again in a moment."
)

_TONE_INSTRUCTIONS = {
    "friendly": "",
    "professional": (
        "\n\nUse a more formal, professional register in every reply, while remaining "
        "polite and warm."
    ),
    "short": (
        "\n\nKeep replies as brief as possible — prefer a single short sentence "
        "whenever it fully answers the question."
    ),
}

_PERSONALITY_INSTRUCTIONS = {
    "professional": "formal, precise, and reassuring",
    "friendly": "warm, approachable, and helpful",
    "casual": "relaxed, conversational, and concise",
    "luxury": "polished, attentive, and premium",
    "sales": "energetic, helpful, and gently conversion-focused",
}

_ENGLISH_ONLY_REPLY_NOTE = (
    "\n\n## Temporary language override\n"
    "For now, reply to customers in English only. This overrides any instruction "
    "to reply in Khmer, mirror the customer's language, or use bilingual replies. "
    "If the customer writes in Khmer or another language, understand their message "
    "as best you can, but answer in clear, natural English."
)

_CLASSIFIER_INSTRUCTION = (
    "You are an internal classifier for a customer support conversation. You are "
    "given the conversation so far, ending with the assistant's latest reply. Do "
    "NOT write a reply yourself — only output JSON matching the schema.\n\n"
    "Set lead to a non-null object ONLY if, across the whole conversation, the "
    "customer has now given BOTH their name and phone number and wants to book, "
    "order, or proceed with a service — include their name, phone, and a short "
    "description of what they want. Otherwise set lead to null.\n\n"
    "Set could_not_answer=true if the assistant's latest reply was not able to "
    "fully answer the customer's question using the business information. Set "
    "requested_human_or_upset=true if the customer's latest message explicitly "
    "asked for a human/staff member, or sounded upset, frustrated, or angry. Give "
    "a short reason phrase for internal staff use."
)

_CLUSTER_INSTRUCTION = (
    "Return one valid JSON object with a clusters array. You are grouping "
    "customer support questions that a business's AI assistant "
    "could not answer, so the owner can see what knowledge is missing. You are "
    "given a list of existing open topic clusters (each with a label and sample "
    "questions) and a list of new unclustered questions (mixed English/Khmer, "
    "including Latin-letter Khmer).\n\n"
    "Group by SUBJECT — the specific thing, product, service, or procedure the "
    "question is about (e.g. 'braces', 'dental implants', 'delivery to Siem "
    "Reap') — NOT by which aspect of it is being asked. Price, availability, "
    "how it works, and other angles on the SAME subject all belong in ONE "
    "cluster. For example 'how much are braces', 'do you guys do braces', and "
    "'what's the price for teeth braces treatment' are three phrasings of the "
    "SAME subject (braces) and must be ONE cluster, even though one asks about "
    "price and another about availability. Only start a new cluster when the "
    "underlying subject itself is different — braces and dental implants are "
    "different subjects (different procedures) even though both are dental "
    "work, so those must NOT be merged.\n\n"
    "For EACH new question, decide: does it belong to one of the existing "
    "clusters (same subject), or does it start a new subject? Each output "
    "cluster must either match exactly one existing cluster (set "
    "existing_cluster_index to that cluster's index) or be a brand new subject "
    "(set existing_cluster_index to null). Every new question index must appear "
    "in exactly one output cluster, and each index must be used only once.\n\n"
    "For a NEW cluster, write a short (1-4 word) label naming the SUBJECT "
    "itself, not the aspect being asked about, in both English and Khmer (e.g. "
    "label_en='Braces', label_km='ពត់ធ្មេញ' — not 'Braces pricing' or 'Braces "
    "availability'). For a cluster matched to an EXISTING cluster, repeat that "
    "existing cluster's label_en/label_km unchanged."
)

## ========== cluster unanswered questions ==========
async def cluster_questions(
    existing_clusters: list[dict], new_questions: list[dict]
) -> Optional[list[dict]]:
    """Group one business's new unanswered questions into topics, matching
    against its existing open clusters where the topic is the same.

    existing_clusters: [{"index": int, "label_en": str, "label_km": str, "sample_questions": [str]}]
    new_questions: [{"index": int, "text": str}]

    Returns the raw "clusters" list from the model, or None on failure — the
    caller should treat that business as unclustered this run and retry next time.
    """

    ## Build the prompt for Groq
    prompt = json.dumps(
        {"existing_clusters": existing_clusters, "new_questions": new_questions},
        ensure_ascii=False,
    )

    
    try:
        response = await _client.chat.completions.create(
            model=settings.ai_model,
            messages=[
                {"role": "system", "content": _CLUSTER_INSTRUCTION},
                {"role": "user", "content": prompt},
            ],
            response_format={"type": "json_object"},
        )
        return json.loads(response.choices[0].message.content or "{}")["clusters"]
    except Exception:
        logger.warning("Groq clustering call failed", exc_info=True)
        return None


_KNOWLEDGE_CATEGORIES = ["service", "faq", "hours", "location", "policy", "other"]

MAX_EXTRACT_ITEMS = 40

_EXTRACT_INSTRUCTION = (
    "Return one valid JSON object with an items array. You are helping a small "
    "business in Cambodia turn raw notes (a price list, "
    "Facebook About text, a menu, or rough notes) into structured knowledge items "
    "for their customer-support AI assistant. The source text may be English, "
    "Khmer, or a mix, and may use Latin-letter transliterated Khmer.\n\n"
    "For each distinct fact in the text (a service with its price, an FAQ, "
    "opening hours, the location, a policy, or another standalone fact), output "
    "one item with: category (one of service/faq/hours/location/policy/other), "
    "a short title, price if one is present for that item (normalize to a plain "
    "format like '$15' or '$20 - $40' — omit currency symbols only if none is "
    "implied), content_en, and content_km.\n\n"
    "CRITICAL — never invent: only output facts that are actually present in the "
    "source text. Never invent, guess, or add a service, price, opening hours, or "
    "location that is not stated. If the text has no hours or no location "
    "mentioned anywhere, do NOT output an hours or location item at all.\n\n"
    "Bilingual content: if the source text already gives you a language's wording "
    "for that item, use it (lightly cleaned up, not rewritten) and set that "
    "language's ai_generated flag to false. If the source only covers ONE "
    "language for an item, naturally draft the OTHER language yourself — polite, "
    "warm, and natural, in the same register a helpful shop assistant would use, "
    "with correct Khmer honorifics when writing Khmer — and set that language's "
    "ai_generated flag to true. Never leave both content_en and content_km empty.\n\n"
    f"Output at most {MAX_EXTRACT_ITEMS} items. If the text contains no usable "
    "business information, output an empty items list."
)

## ========= extract knowledge items from raw text ==========
def _template_extraction_hint(business_type: str) -> str:
    from app.services.knowledge_templates import get_templates
    return f"\n\nIndustry-specific extraction guidance: {get_templates(business_type)['extractor_hint']}."

## ======== extract knowledge items from raw text ==========
async def extract_knowledge_items(text: str, business_type: str = "professional_other") -> Optional[list[dict]]:
    """Quick-add with AI: turn pasted raw text into draft knowledge items for
    the owner to review — nothing is persisted here, this only returns drafts.

    Returns None on failure (caller should surface a "could not analyze" error);
    returns a possibly-empty list on success, capped at MAX_EXTRACT_ITEMS.
    """
    try:
        response = await _client.chat.completions.create(
            model=settings.ai_model,
            messages=[
                {"role": "system", "content": _EXTRACT_INSTRUCTION + _template_extraction_hint(business_type)},
                {"role": "user", "content": text},
            ],
            response_format={"type": "json_object"},
        )
        items = json.loads(response.choices[0].message.content or "{}")["items"]
    except Exception:
        logger.warning("Groq knowledge extraction call failed", exc_info=True)
        return None

    cleaned = []
    for item in items[:MAX_EXTRACT_ITEMS]:
        if item.get("category") not in _KNOWLEDGE_CATEGORIES:
            item["category"] = "other"
        if not (item.get("content_en") or "").strip() and not (item.get("content_km") or "").strip():
            continue
        cleaned.append(item)
    return cleaned


## ======== system prompt assembly for a business's AI assistant ==========
def _build_system_instruction(business: Business, db: Session, handoff_active: bool) -> str:
    """Build and log the exact per-business system prompt sent to the model."""
    business_info = _get_cached_business_info(db, business.id)
    profile = db.query(AIProfile).filter(AIProfile.business_id == business.id).first()
    rules = db.query(BusinessRule).filter(
        BusinessRule.business_id == business.id, BusinessRule.is_active.is_(True)
    ).order_by(BusinessRule.sort_order, BusinessRule.id).all()

    instruction = _RULES_TEXT
    if profile:
        instruction += (
            f"\n\n## AI Profile\nYou are '{profile.assistant_name}', {profile.assistant_role}.\n"
            f"Your personality is {_PERSONALITY_INSTRUCTIONS.get(profile.personality.value, profile.personality.value)}.\n"
            f"Keep responses {profile.response_length} and use {profile.language_mode} language behavior."
        )
    elif business.assistant_display_name:
        instruction += f"\n\nYou are '{business.assistant_display_name}', the customer assistant for this business."
    instruction += _ENGLISH_ONLY_REPLY_NOTE
    from app.services.knowledge_templates import get_templates
    template = get_templates(business.business_type.value)
    instruction += f"\n\n## Industry guidance\nUse a {template['tone']} tone appropriate for this business type."
    if rules:
        instruction += "\n\n## Business Rules\n" + "\n".join(f"- {rule.rule_text}" for rule in rules)
    instruction += _TONE_INSTRUCTIONS.get(business.tone.value, "")
    instruction += (
        "\n\n## Business Information (your ONLY source of facts — never use anything else)\n\n"
        f"{business_info}"
    )
    if handoff_active:
        instruction += _HANDOFF_ALREADY_ACTIVE_NOTE
    logger.debug("assembled_system_prompt business_id=%s prompt=%s", business.id, instruction)
    return instruction


## ======== conversation history -> Groq message format ==========
def _to_contents(messages) -> list[dict[str, str]]:
    return [
        {"role": _GROQ_ROLE[m.direction.value], "content": m.text}
        for m in messages
    ]

## ======== generate reply the customer sees, then classify for lead/handoff ==========
async def _generate_reply(contents: list[dict[str, str]], system_instruction: str) -> str:
    """Generate the customer-facing reply. Retries once after a short delay on failure."""
    messages = [{"role": "system", "content": system_instruction}, *contents]
    try:
        response = await _client.chat.completions.create(
            model=settings.ai_model, messages=messages
        )
    except Exception:
        logger.warning("Groq reply call failed, retrying once...", exc_info=True)
        await asyncio.sleep(RETRY_DELAY_SECONDS)
        response = await _client.chat.completions.create(
            model=settings.ai_model, messages=messages
        )
    return (response.choices[0].message.content or "").strip() or FALLBACK_REPLY


## ======== classify for lead/handoff ==========
async def _classify(contents: list[dict[str, str]], assistant_reply: str) -> Optional[dict]:
    """Silently classify the exchange for lead/handoff signals (never shown to the customer)."""
    classifier_contents = contents + [
        {"role": "assistant", "content": assistant_reply}
    ]
    try:
        response = await _client.chat.completions.create(
            model=settings.ai_model,
            messages=[
                {"role": "system", "content": _CLASSIFIER_INSTRUCTION},
                *classifier_contents,
            ],
            response_format={"type": "json_object"},
        )
        return json.loads(response.choices[0].message.content or "{}")
    except Exception:
        logger.warning(
            "Groq classification call failed; skipping lead/handoff detection for this message",
            exc_info=True,
        )
        return None


## ======== apply conversation flags based on classification ==========
def _apply_conversation_flags(
    business_id: int,
    chat_id: int,
    conversation: Conversation,
    classification: Optional[dict],
    handoff_on_unsure: bool,
) -> Optional[str]:
    """Update handoff/streak state from the classifier output; return a handoff reason if needed."""
    if not classification:
        return None

    if classification.get("requested_human_or_upset"):
        conversation_state.reset_unanswered_streak(business_id, chat_id)
        conversation_state.set_handed_off(conversation, True)
        return classification.get("reason") or "Customer asked for a human or seems upset."

    if classification.get("could_not_answer"):
        if not handoff_on_unsure:
            return None
        streak = conversation_state.increment_unanswered_streak(business_id, chat_id)
        if streak >= 2:
            conversation_state.set_handed_off(conversation, True)
            conversation_state.reset_unanswered_streak(business_id, chat_id)
            return classification.get("reason") or (
                "Could not answer two questions in a row from the business information."
            )
        return None

    conversation_state.reset_unanswered_streak(business_id, chat_id)
    return None

## ======== get AI reply for a customer message ==========
async def get_ai_reply(
    db: Session, business_id: int, chat_id: int, user_message: str
) -> tuple[str, Optional[dict], Optional[str], Conversation]:
    
    """Send the customer's message (with recent DB history) to Groq.

    Returns (reply_text, lead, handoff_reason, conversation):
    - lead: a dict with name/phone/interest if a complete lead was just detected, else None.
    - handoff_reason: a short string if this turn should escalate to a human, else None.
    """
    business = db.get(Business, business_id)
    conversation = conversation_state.get_active_conversation(db, business_id, chat_id)
    history = conversation_state.get_recent_messages(db, business_id, conversation.id, MAX_EXCHANGES)
    contents = _to_contents(history)
    contents.append({"role": "user", "content": user_message})

    system_instruction = _build_system_instruction(business, db, conversation.handed_off)

    try:
        reply = await _generate_reply(contents, system_instruction)
    except Exception:
        logger.exception("business_id=%s chat_id=%s: get_ai_reply failed", business_id, chat_id)
        return FALLBACK_REPLY, None, None, conversation

    conversation_state.add_message(db, business_id, conversation.id, "customer", user_message)
    conversation_state.add_message(db, business_id, conversation.id, "bot", reply)

    classification = await _classify(contents, reply)
    lead = classification.get("lead") if classification else None

    if classification and classification.get("could_not_answer"):
        gaps.record_unanswered_question(db, business_id, conversation.id, user_message)

    handoff_reason = _apply_conversation_flags(
        business_id, chat_id, conversation, classification, business.handoff_on_unsure
    )

    return reply, lead, handoff_reason, conversation


## ======== preview reply for onboarding test-chat ==========
async def generate_preview_reply(
    db: Session, business_id: int, history: list[dict], user_message: str
) -> str:
    """Onboarding test-chat: same prompt + knowledge as a real customer would
    get, but nothing is persisted and there's no lead/handoff detection —
    it's a sandbox for the owner to try questions, not a real conversation.
    """
    business = db.get(Business, business_id)
    contents = [
        {"role": _GROQ_ROLE[h["role"]], "content": h["text"]}
        for h in history
    ]
    contents.append({"role": "user", "content": user_message})

    system_instruction = _build_system_instruction(business, db, handoff_active=False)
    return await _generate_reply(contents, system_instruction)
