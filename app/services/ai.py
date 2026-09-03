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
import re
import time
from pathlib import Path
from typing import Optional

from groq import AsyncGroq
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.business import Business, BusinessType
from app.models.ai_profile import AIProfile
from app.models.business_rule import BusinessRule
from app.models.conversation import Conversation
from app.schemas.ai_actions import RetailAIAction
from app.services import conversation_state, gaps
from app.services.commerce import build_retail_prompt_context
from app.services.knowledge import build_business_info_text

logger = logging.getLogger(__name__)

_client = AsyncGroq(api_key=settings.groq_api_key)

_SYSTEM_PROMPT_PATH = Path(__file__).resolve().parent.parent.parent / "prompts" / "system_prompt.md"
_RULES_TEXT = _SYSTEM_PROMPT_PATH.read_text(encoding="utf-8")
_prompt_context_cache: dict[int, tuple[float, str, bool]] = {}
_PROMPT_CONTEXT_TTL_SECONDS = 60


# ---------------------------------------------------------------------------
# Prompt context cache
# ---------------------------------------------------------------------------


def clear_prompt_context_cache(business_id: int) -> None:
    """Clear cached business context after owner-facing knowledge changes."""
    _prompt_context_cache.pop(business_id, None)


def _get_cached_business_info(db: Session, business_id: int) -> str:
    """Return short-lived business facts used in the system prompt."""
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

_LANGUAGE_MODE_INSTRUCTIONS = {
    "mirror": (
        "\n\n## Language behavior\n"
        "Understand customer messages in any language, including Khmer, English, "
        "mixed Khmer-English, and Khmer written with Latin letters. Reply in the "
        "same language the customer mainly used. If the customer mixes languages, "
        "reply naturally in the same mixed style. Keep internal reasoning and any "
        "structured action fields language-neutral; never fail just because the "
        "customer used another language."
    ),
    "khmer_default": (
        "\n\n## Language behavior\n"
        "Understand customer messages in any language, including Khmer, English, "
        "mixed Khmer-English, and Khmer written with Latin letters. Reply in Khmer "
        "by default. If the customer clearly asks for English, reply in English for "
        "that turn. Keep Khmer polite, natural, and easy for Cambodian customers."
    ),
    "english": (
        "\n\n## Language behavior\n"
        "Understand customer messages in any language, including Khmer, English, "
        "mixed Khmer-English, and Khmer written with Latin letters. Reply in clear, "
        "natural English unless the business later changes this language setting."
    ),
    "both": (
        "\n\n## Language behavior\n"
        "Understand customer messages in any language, including Khmer, English, "
        "mixed Khmer-English, and Khmer written with Latin letters. Reply bilingually: "
        "first a concise Khmer answer, then a concise English answer with the same facts."
    ),
}

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


# ---------------------------------------------------------------------------
# Unanswered question clustering
# ---------------------------------------------------------------------------


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
MAX_EXTRACT_PRODUCTS = 30

_EXTRACT_INSTRUCTION = (
    "Return one valid JSON object with an items array. You are helping a small "
    "business in Cambodia turn raw notes (a price list, "
    "Facebook About text, a menu, or rough notes) into structured knowledge items "
    "for their customer-support AI assistant. The source text may be English, "
    "Khmer, or a mix, and may use Latin-letter transliterated Khmer.\n\n"
    "For each distinct labeled section or fact in the text (a service with its price, an FAQ, "
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
    "Do not stop after location and opening hours. Include delivery, payment, "
    "return policy, product/service notes, and every FAQ when they are present.\n\n"
    f"Output at most {MAX_EXTRACT_ITEMS} items. If the text contains no usable "
    "business information, output an empty items list."
)

_FAKE_IMAGE_MARKDOWN_RE = re.compile(r"!\[[^\]]*\]\([^)]*\)", re.IGNORECASE)

_PRODUCT_EXTRACT_INSTRUCTION = (
    "Return one valid JSON object with a products array. Extract ecommerce "
    "products from raw shop notes in English, Khmer, or mixed text. For each "
    "product output: name_en, name_km, description_en, description_km, category, "
    "base_price, photo_urls, is_active, sort_order, and variants. Each variant "
    "must include variant_label, price_override, stock_quantity, sku, and "
    "is_active. Expand clear combinations such as colors red/blue and sizes S-XL "
    "into concrete variants like 'Red / S'. If stock is stated as '5 each', apply "
    "that to each variant. Never invent products, prices, variants, images, or "
    "stock. If stock is missing, use 0. Use numeric prices only."
)


# ---------------------------------------------------------------------------
# AI quick-add extraction
# ---------------------------------------------------------------------------


def _clean_numeric_price(value) -> float:
    """Accept common AI/user price formats while returning a schema-safe number."""
    if value in (None, ""):
        return 0
    if isinstance(value, (int, float)):
        return max(0, float(value))
    text = str(value).strip()
    match = re.search(r"\d+(?:\.\d+)?", text.replace(",", ""))
    return max(0, float(match.group(0))) if match else 0


def _clean_optional_numeric_price(value) -> float | None:
    if value in (None, ""):
        return None
    return _clean_numeric_price(value)


def _clean_int(value, default: int = 0) -> int:
    if value in (None, ""):
        return default
    if isinstance(value, int):
        return value
    match = re.search(r"-?\d+", str(value))
    return int(match.group(0)) if match else default


_SECTION_CATEGORY_BY_TITLE = {
    "location": "location",
    "business location": "location",
    "shop address": "location",
    "address": "location",
    "opening hours": "hours",
    "hours": "hours",
    "delivery": "policy",
    "payment": "policy",
    "return policy": "policy",
    "return or exchange policy": "policy",
    "exchange policy": "policy",
    "best-selling product": "service",
    "best selling product": "service",
    "new arrival": "service",
    "product variant or size": "service",
}


def _title_from_label(label: str) -> str:
    return re.sub(r"\s+", " ", label.strip()).title()


def _fallback_extract_labeled_knowledge(text: str) -> list[dict]:
    """Parse simple labeled notes when the model under-extracts JSON output."""
    sections = re.split(r"(?m)^\s*([A-Za-z][A-Za-z\s/-]{1,60}|FAQ)\s*:\s*$", text)
    drafts = []
    index = 0
    while index + 2 < len(sections):
        label = sections[index + 1].strip()
        body = sections[index + 2].strip()
        index += 2
        if not body:
            continue

        label_key = label.lower()
        if label_key == "faq":
            question_match = re.search(r"(?im)^\s*Q(?:uestion)?\s*:\s*(.+)$", body)
            answer_match = re.search(r"(?ims)^\s*A(?:nswer)?\s*:\s*(.+)$", body)
            title = question_match.group(1).strip() if question_match else "FAQ"
            content_en = answer_match.group(1).strip() if answer_match else body
            category = "faq"
        else:
            title = _title_from_label(label)
            content_en = body
            category = _SECTION_CATEGORY_BY_TITLE.get(label_key, "other")

        drafts.append(
            {
                "category": category,
                "title": title[:255],
                "price": None,
                "content_en": content_en,
                "content_km": None,
                "content_en_ai_generated": False,
                "content_km_ai_generated": False,
            }
        )
    return drafts[:MAX_EXTRACT_ITEMS]


def _template_extraction_hint(business_type: str) -> str:
    """Return industry-specific guidance appended to the knowledge extractor."""
    from app.services.knowledge_templates import get_templates
    return f"\n\nIndustry-specific extraction guidance: {get_templates(business_type)['extractor_hint']}."


async def _json_extraction_call(system_instruction: str, text: str, required_key: str) -> dict | None:
    """Ask the model for strict JSON, retrying once with a smaller repair prompt."""
    messages = [
        {"role": "system", "content": system_instruction},
        {"role": "user", "content": text},
    ]
    try:
        response = await _client.chat.completions.create(
            model=settings.ai_model,
            messages=messages,
            response_format={"type": "json_object"},
        )
    except Exception:
        logger.warning("Groq JSON extraction call failed, retrying once", exc_info=True)
        repair_instruction = (
            f"Return ONLY one valid JSON object with a top-level `{required_key}` array. "
            "Do not include markdown, explanation, comments, trailing commas, or text outside JSON. "
            "If unsure, return an empty array."
        )
        try:
            response = await _client.chat.completions.create(
                model=settings.ai_model,
                messages=[
                    {"role": "system", "content": repair_instruction},
                    {"role": "user", "content": text},
                ],
                response_format={"type": "json_object"},
            )
        except Exception:
            logger.warning("Groq JSON extraction retry failed", exc_info=True)
            return None

    try:
        payload = json.loads(response.choices[0].message.content or "{}")
    except Exception:
        logger.warning("Groq JSON extraction returned unparsable content", exc_info=True)
        return None
    return payload if isinstance(payload, dict) else None


async def extract_knowledge_items(text: str, business_type: str = "professional_other") -> Optional[list[dict]]:
    """Quick-add with AI: turn pasted raw text into draft knowledge items for
    the owner to review — nothing is persisted here, this only returns drafts.

    Returns None on failure (caller should surface a "could not analyze" error);
    returns a possibly-empty list on success, capped at MAX_EXTRACT_ITEMS.
    """
    payload = await _json_extraction_call(
        _EXTRACT_INSTRUCTION + _template_extraction_hint(business_type),
        text,
        "items",
    )
    if payload is None:
        return None
    items = payload.get("items", [])
    if not isinstance(items, list):
        logger.warning("Groq knowledge extraction returned non-list items: %s", type(items).__name__)
        return []

    cleaned = []
    for item in items[:MAX_EXTRACT_ITEMS]:
        if not isinstance(item, dict):
            logger.warning("Skipping invalid extracted knowledge item type=%s value=%r", type(item).__name__, item)
            continue
        if item.get("category") not in _KNOWLEDGE_CATEGORIES:
            item["category"] = "other"
        if not (item.get("content_en") or "").strip() and not (item.get("content_km") or "").strip():
            continue
        cleaned.append(item)

    fallback_items = _fallback_extract_labeled_knowledge(text)
    existing_titles = {str(item.get("title", "")).strip().lower() for item in cleaned}
    for item in fallback_items:
        title_key = item["title"].strip().lower()
        if title_key not in existing_titles and len(cleaned) < MAX_EXTRACT_ITEMS:
            cleaned.append(item)
            existing_titles.add(title_key)
    return cleaned


async def extract_products(text: str) -> Optional[list[dict]]:
    """Quick-add with AI for retail catalogs; returns reviewed drafts only."""
    payload = await _json_extraction_call(_PRODUCT_EXTRACT_INSTRUCTION, text, "products")
    if payload is None:
        return None
    products = payload.get("products", [])

    if not isinstance(products, list):
        logger.warning("Groq product extraction returned non-list products: %s", type(products).__name__)
        return []

    cleaned = []
    for index, product in enumerate(products[:MAX_EXTRACT_PRODUCTS]):
        if not isinstance(product, dict):
            logger.warning("Skipping invalid extracted product type=%s value=%r", type(product).__name__, product)
            continue
        if not (product.get("name_en") or "").strip():
            continue
        product["base_price"] = _clean_numeric_price(product.get("base_price"))
        raw_photo_urls = product.get("photo_urls") or []
        if isinstance(raw_photo_urls, str):
            raw_photo_urls = [raw_photo_urls]
        if not isinstance(raw_photo_urls, list):
            raw_photo_urls = []
        product["photo_urls"] = [url.strip() for url in raw_photo_urls if url and str(url).strip()][:8]
        product["is_active"] = bool(product.get("is_active", True))
        product["sort_order"] = _clean_int(product.get("sort_order"), index)
        variants = []
        for variant in product.get("variants", []):
            if not isinstance(variant, dict):
                logger.warning("Skipping invalid extracted variant type=%s value=%r", type(variant).__name__, variant)
                continue
            if not (variant.get("variant_label") or "").strip():
                continue
            variants.append(
                {
                    "variant_label": variant["variant_label"],
                    "price_override": _clean_optional_numeric_price(variant.get("price_override")),
                    "stock_quantity": max(0, _clean_int(variant.get("stock_quantity"), 0)),
                    "sku": variant.get("sku"),
                    "is_active": bool(variant.get("is_active", True)),
                }
            )
        product["variants"] = variants
        cleaned.append(product)
    return cleaned


# ---------------------------------------------------------------------------
# System prompt assembly
# ---------------------------------------------------------------------------


def _build_system_instruction(business: Business, db: Session, handoff_active: bool) -> str:
    """Build and log the exact per-business system prompt sent to the model."""
    business_info = _get_cached_business_info(db, business.id)
    profile = db.query(AIProfile).filter(AIProfile.business_id == business.id).first()
    rules = db.query(BusinessRule).filter(
        BusinessRule.business_id == business.id, BusinessRule.is_active.is_(True)
    ).order_by(BusinessRule.sort_order, BusinessRule.id).all()

    instruction = _RULES_TEXT
    language_mode = profile.language_mode if profile else (
        "both" if business.default_language == "both" else "khmer_default" if business.default_language == "km" else "english"
    )
    if profile:
        instruction += (
            f"\n\n## AI Profile\nYou are '{profile.assistant_name}', {profile.assistant_role}.\n"
            f"Your personality is {_PERSONALITY_INSTRUCTIONS.get(profile.personality.value, profile.personality.value)}.\n"
            f"Keep responses {profile.response_length} and use {profile.language_mode} language behavior."
        )
    elif business.assistant_display_name:
        instruction += f"\n\nYou are '{business.assistant_display_name}', the customer assistant for this business."
    instruction += _LANGUAGE_MODE_INSTRUCTIONS.get(language_mode, _LANGUAGE_MODE_INSTRUCTIONS["mirror"])
    from app.services.knowledge_templates import get_templates
    template = get_templates(business.business_type.value)
    instruction += f"\n\n## Industry guidance\nUse a {template['tone']} tone appropriate for this business type."
    if business.business_type == BusinessType.product_retail:
        instruction += (
            "\n\n## Product retail order rules\n"
            "Act as a sales assistant. Help customers browse products, describe "
            "items, mention only variants with stock above 0 as available, ask "
            "for quantity, delivery address, delivery zone, and payment method. "
            "Suggest COD by default. Never promise a variant that has stock 0. "
            "If product, variant, stock, address, or delivery zone matching is "
            "ambiguous, ask a short confirmation question instead of guessing. "
            "During ordering, ask only for the missing information. Do not repeat "
            "details the customer already gave. When the customer gives address, "
            "quantity, name, phone, or payment, acknowledge briefly and ask for the "
            "next missing field only. Keep order collection friendly, short, and not repetitive. "
            "Do not tell the customer an order is created until all details are "
            "confirmed. Product photos can be sent by this Telegram channel when "
            "the catalog says photos are available, so never say you cannot send "
            "photos for those products. If the customer asks to see products or "
            "photos, briefly introduce the matching product(s) and say you will "
            "show the available photo(s). If photos are not uploaded for a product, "
            "say that no photo is saved yet and give a short description instead. "
            "Do not write placeholders like '(image)', '[photo]', or fake image links; "
            "do not use Markdown image syntax like ![name](attachment://file.jpg) "
            "or ![name](https://example.com/file.jpg); "
            "the channel sends real photo attachments separately."
            f"\n\n{build_retail_prompt_context(db, business.id)}"
        )
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


# ---------------------------------------------------------------------------
# Provider message conversion and generation
# ---------------------------------------------------------------------------


def _to_contents(messages) -> list[dict[str, str]]:
    """Convert persisted messages into the role/content shape expected by Groq."""
    return [
        {"role": _GROQ_ROLE[m.direction.value], "content": m.text}
        for m in messages
    ]


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
    reply = (response.choices[0].message.content or "").strip() or FALLBACK_REPLY
    return _FAKE_IMAGE_MARKDOWN_RE.sub("", reply).strip() or FALLBACK_REPLY


# ---------------------------------------------------------------------------
# Silent classifiers
# ---------------------------------------------------------------------------


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


_RETAIL_CLASSIFIER_INSTRUCTION = (
    "You are an internal order classifier for a product retail chat. Output one "
    "valid JSON object matching exactly this shape: "
    "{mentioned_product_ids: number[], cart_patch: object|null, confirmed_order: boolean, "
    "confidence: number between 0 and 1, missing_fields: string[], customer_language: string|null}. "
    "cart_patch may contain only details the customer clearly provided or changed in this turn: "
    "items [{product_id, variant_id, qty}], delivery_zone_id, delivery_address_text, "
    "customer_name, phone, and payment_method cod/prepaid. Use cart_patch to update an existing "
    "cart; do not restart from scratch just because the customer changes size or quantity. "
    "Set confirmed_order=true only when the customer clearly confirms they want to place the "
    "order after product/variant/quantity/address/payment are known, including replies like yes, "
    "confirm, ok, or place order when they follow an order confirmation summary. Do not set "
    "confirmed_order=true for polite closing messages like thanks unless they clearly approve the "
    "order. Set missing_fields to any "
    "required order details still missing. Delivery zone is optional if none was discussed. "
    "Set confidence below 0.7 if the product, variant, "
    "quantity, address, payment, language, or customer intent is ambiguous. Never guess IDs; use "
    "null or omit fields if ambiguous. Include mentioned_product_ids as an array of product IDs "
    "the assistant discussed so the channel can send photos. If the customer asks to see products, "
    "see photos, browse, or asks what products are available, include the IDs of the relevant "
    "products the assistant described."
)


async def _classify_retail(contents: list[dict[str, str]], assistant_reply: str) -> Optional[dict]:
    """Classify product-retail chat state for photos, cart updates, and orders."""
    classifier_contents = contents + [{"role": "assistant", "content": assistant_reply}]
    try:
        response = await _client.chat.completions.create(
            model=settings.ai_model,
            messages=[
                {"role": "system", "content": _RETAIL_CLASSIFIER_INSTRUCTION},
                *classifier_contents,
            ],
            response_format={"type": "json_object"},
        )
        payload = json.loads(response.choices[0].message.content or "{}")
        action = RetailAIAction.model_validate(payload)
        if action.confidence < 0.7 and action.cart_patch is not None:
            logger.info(
                "retail_ai_action_low_confidence confidence=%s missing_fields=%s",
                action.confidence,
                action.missing_fields,
            )
            action.cart_patch = None
            action.confirmed_order = False
        if action.confirmed_order and action.missing_fields:
            logger.info("retail_ai_action_blocked_missing_fields fields=%s", action.missing_fields)
            action.confirmed_order = False
        return action.to_legacy_dict()
    except Exception:
        logger.warning("Groq retail classification call failed", exc_info=True)
        return None


# ---------------------------------------------------------------------------
# Conversation state updates
# ---------------------------------------------------------------------------


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


# ---------------------------------------------------------------------------
# Public AI service entry points
# ---------------------------------------------------------------------------


async def get_ai_reply(
    db: Session, business_id: int, chat_id: int, user_message: str
) -> tuple[str, Optional[dict], Optional[str], Conversation, Optional[dict]]:
    
    """Send the customer's message (with recent DB history) to Groq.

    Returns (reply_text, lead, handoff_reason, conversation, commerce):
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
        return FALLBACK_REPLY, None, None, conversation, None

    conversation_state.add_message(db, business_id, conversation.id, "customer", user_message)
    conversation_state.add_message(db, business_id, conversation.id, "bot", reply)

    commerce = None
    if business.business_type == BusinessType.product_retail:
        classification = await _classify_retail(contents, reply)
        lead = None
        commerce = classification if classification else None
    else:
        classification = await _classify(contents, reply)
        lead = classification.get("lead") if classification else None

    if classification and classification.get("could_not_answer"):
        gaps.record_unanswered_question(db, business_id, conversation.id, user_message)

    handoff_reason = _apply_conversation_flags(
        business_id, chat_id, conversation, classification, business.handoff_on_unsure
    )

    return reply, lead, handoff_reason, conversation, commerce


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
