"""Commerce service layer for product-retail businesses.

This module owns the core order flow rules used by both HTTP APIs and
Telegram bot side effects. Routers translate service exceptions into HTTP
responses; this file stays focused on tenant-safe business behavior.
"""

from decimal import Decimal
from datetime import timedelta
import logging
from types import SimpleNamespace

from sqlalchemy.orm import Session
from telegram import Bot

from app.models.business import Business
from app.models.conversation import Conversation
from app.models.delivery_zone import DeliveryZone
from app.models.order import CustomerChannel, Order, OrderItem, OrderStatus
from app.models.product import Product, ProductVariant
from app.models.conversation_cart import ConversationCart
from app.core.time import utcnow
from app.repositories.conversation_cart import ConversationCartRepository
from app.repositories.order import OrderRepository
from app.services.exceptions import NotFoundError, OutOfStockError
from app.services.notifications import notify_recipients

logger = logging.getLogger(__name__)

CART_TTL_HOURS = 24


# ---------------------------------------------------------------------------
# Formatting and scoped query helpers
# ---------------------------------------------------------------------------


def _money(value: Decimal) -> str:
    """Format Decimal prices for AI prompts and owner notifications."""
    return f"${value.quantize(Decimal('0.01'))}"


def _variant_query(db: Session, product_id: int, variant_id: int, lock_stock: bool):
    """Build the active variant lookup, optionally locking the stock row."""
    query = db.query(ProductVariant).filter(
        ProductVariant.id == variant_id,
        ProductVariant.product_id == product_id,
        ProductVariant.is_active.is_(True),
    )
    return query.with_for_update() if lock_stock else query


def _next_order_number(db: Session, business_id: int) -> str:
    today = utcnow().strftime("%Y%m%d")
    prefix = f"ORD-{today}-"
    count = (
        db.query(Order)
        .filter(Order.business_id == business_id, Order.order_number.like(f"{prefix}%"))
        .count()
    )
    return f"{prefix}{count + 1:04d}"


# ---------------------------------------------------------------------------
# Read helpers used by responses and AI context
# ---------------------------------------------------------------------------


def delivery_zone_name(db: Session, business_id: int, zone_id: int | None) -> str | None:
    """Return the tenant-scoped delivery zone display name for an order."""
    if zone_id is None:
        return None
    zone = (
        db.query(DeliveryZone)
        .filter(DeliveryZone.id == zone_id, DeliveryZone.business_id == business_id)
        .first()
    )
    if zone is None:
        return None
    return zone.zone_name_en or zone.zone_name_km


def build_retail_prompt_context(db: Session, business_id: int) -> str:
    """Build the live catalog, stock, photo, and delivery context for the AI."""
    products = (
        db.query(Product)
        .filter(Product.business_id == business_id, Product.is_active.is_(True))
        .order_by(Product.sort_order, Product.id)
        .all()
    )
    product_ids = [product.id for product in products]
    variants = (
        db.query(ProductVariant)
        .filter(ProductVariant.product_id.in_(product_ids), ProductVariant.is_active.is_(True))
        .order_by(ProductVariant.id)
        .all()
        if product_ids
        else []
    )
    by_product: dict[int, list[ProductVariant]] = {}
    for variant in variants:
        by_product.setdefault(variant.product_id, []).append(variant)

    zones = (
        db.query(DeliveryZone)
        .filter(DeliveryZone.business_id == business_id)
        .order_by(DeliveryZone.sort_order, DeliveryZone.id)
        .all()
    )

    lines = ["## Retail catalog"]
    for product in products:
        lines.append(
            f"- Product #{product.id}: {product.name_en}"
            f"{' / ' + product.name_km if product.name_km else ''}; "
            f"base price {_money(product.base_price)}; category {product.category or 'general'}; "
            f"photos {'available' if product.photo_urls else 'not uploaded'}."
        )
        if product.description_en:
            lines.append(f"  Description EN: {product.description_en}")
        if product.description_km:
            lines.append(f"  Description KM: {product.description_km}")
        in_stock = [v for v in by_product.get(product.id, []) if v.stock_quantity > 0]
        out_of_stock = [v for v in by_product.get(product.id, []) if v.stock_quantity <= 0]
        if in_stock:
            lines.append("  In-stock variants:")
            for variant in in_stock:
                price = variant.price_override if variant.price_override is not None else product.base_price
                lines.append(
                    f"  - Variant #{variant.id}: {variant.variant_label}; "
                    f"price {_money(price)}; stock {variant.stock_quantity}."
                )
        if out_of_stock:
            labels = ", ".join(v.variant_label for v in out_of_stock)
            lines.append(f"  Unavailable variants: {labels}.")

    lines.append("\n## Delivery zones")
    for zone in zones:
        lines.append(
            f"- Zone #{zone.id}: {zone.zone_name_en}"
            f"{' / ' + zone.zone_name_km if zone.zone_name_km else ''}; "
            f"fee {_money(zone.fee)}; ETA {zone.estimated_days or 'not specified'}."
        )
    return "\n".join(lines)


def list_catalog_products(db: Session, business_id: int, *, active_only: bool = True) -> list[dict]:
    """Return tenant-scoped catalog products with active variants grouped for clients."""
    products = (
        db.query(Product)
        .filter(Product.business_id == business_id)
        .order_by(Product.sort_order, Product.id)
    )
    if active_only:
        products = products.filter(Product.is_active.is_(True))
    product_rows = products.all()
    product_ids = [product.id for product in product_rows]
    variant_query = db.query(ProductVariant).filter(
        ProductVariant.business_id == business_id,
        ProductVariant.product_id.in_(product_ids),
    )
    if active_only:
        variant_query = variant_query.filter(ProductVariant.is_active.is_(True))
    variants = variant_query.order_by(ProductVariant.product_id, ProductVariant.id).all() if product_ids else []
    variants_by_product: dict[int, list[ProductVariant]] = {}
    for variant in variants:
        variants_by_product.setdefault(variant.product_id, []).append(variant)

    catalog = []
    for product in product_rows:
        product_variants = variants_by_product.get(product.id, [])
        variant_payload = []
        in_stock = False
        for variant in product_variants:
            price = variant.price_override if variant.price_override is not None else product.base_price
            in_stock = in_stock or variant.stock_quantity > 0
            variant_payload.append(
                {
                    "id": variant.id,
                    "label": variant.variant_label,
                    "price": price,
                    "stock_quantity": variant.stock_quantity,
                    "sku": variant.sku,
                }
            )
        catalog.append(
            {
                "id": product.id,
                "name_en": product.name_en,
                "name_km": product.name_km,
                "description_en": product.description_en,
                "description_km": product.description_km,
                "category": product.category,
                "price": product.base_price,
                "photo_urls": product.photo_urls or [],
                "in_stock": in_stock if product_variants else True,
                "variants": variant_payload,
            }
        )
    return catalog


def catalog_categories(products: list[dict]) -> list[str]:
    """Return stable sorted categories for a catalog payload."""
    return sorted({product["category"] for product in products if product.get("category")})


# ---------------------------------------------------------------------------
# Order validation, pricing, stock locking, and creation
# ---------------------------------------------------------------------------


def create_validated_order(
    db: Session,
    business_id: int,
    *,
    conversation_id: int,
    customer_name: str | None,
    phone: str | None,
    items: list,
    delivery_zone_id: int | None,
    delivery_address_text: str,
    payment_method,
    channel=CustomerChannel.telegram,
    external_customer_id: str | None = None,
    lock_stock: bool = True,
    dedupe_by_conversation: bool = True,
) -> Order:
    """Create one tenant-scoped order after validating stock, prices, and delivery."""
    conversation = (
        db.query(Conversation)
        .filter(Conversation.id == conversation_id, Conversation.business_id == business_id)
        .first()
    )
    if conversation is None:
        logger.warning(
            "commerce_order_rejected reason=conversation_not_found business_id=%s conversation_id=%s",
            business_id,
            conversation_id,
        )
        raise NotFoundError("Conversation not found")
    if dedupe_by_conversation:
        existing_order = OrderRepository(db, business_id).find_for_conversation(conversation_id)
        if existing_order:
            logger.info(
                "commerce_order_duplicate business_id=%s conversation_id=%s order_id=%s",
                business_id,
                conversation_id,
                existing_order.id,
            )
            return existing_order

    zone = None
    delivery_fee = Decimal("0")
    if delivery_zone_id is not None:
        zone = (
            db.query(DeliveryZone)
            .filter(DeliveryZone.id == delivery_zone_id, DeliveryZone.business_id == business_id)
            .first()
        )
        if zone is None:
            logger.warning(
                "commerce_order_rejected reason=delivery_zone_not_found business_id=%s conversation_id=%s zone_id=%s",
                business_id,
                conversation_id,
                delivery_zone_id,
            )
            raise NotFoundError("Delivery zone not found")
        delivery_fee = zone.fee

    normalized_items = []
    order_item_snapshots = []
    items_total = Decimal("0")
    for item in items:
        product = (
            db.query(Product)
            .filter(
                Product.id == item.product_id,
                Product.business_id == business_id,
                Product.is_active.is_(True),
            )
            .first()
        )
        if product is None:
            logger.warning(
                "commerce_order_rejected reason=product_not_found business_id=%s conversation_id=%s product_id=%s",
                business_id,
                conversation_id,
                item.product_id,
            )
            raise NotFoundError("Product not found")

        variant = None
        unit_price = product.base_price
        if item.variant_id is not None:
            variant = _variant_query(db, product.id, item.variant_id, lock_stock).first()
            if variant is None:
                logger.warning(
                    "commerce_order_rejected reason=variant_not_found business_id=%s conversation_id=%s product_id=%s variant_id=%s",
                    business_id,
                    conversation_id,
                    product.id,
                    item.variant_id,
                )
                raise NotFoundError("Variant not found")
            if variant.stock_quantity < item.qty:
                logger.warning(
                    "commerce_order_rejected reason=out_of_stock business_id=%s conversation_id=%s product_id=%s variant_id=%s requested_qty=%s stock_quantity=%s",
                    business_id,
                    conversation_id,
                    product.id,
                    variant.id,
                    item.qty,
                    variant.stock_quantity,
                )
                raise OutOfStockError(
                    f"{variant.variant_label} has only {variant.stock_quantity} in stock."
                )
            variant.stock_quantity -= item.qty
            unit_price = variant.price_override if variant.price_override is not None else product.base_price

        line_total = unit_price * item.qty
        items_total += line_total
        normalized_items.append(
            {
                "product_id": product.id,
                "product_name": product.name_en,
                "variant_id": variant.id if variant else None,
                "variant_label": variant.variant_label if variant else None,
                "qty": item.qty,
                "unit_price": str(unit_price),
                "line_total": str(line_total),
            }
        )
        order_item_snapshots.append(
            {
                "business_id": business_id,
                "product_id": product.id,
                "variant_id": variant.id if variant else None,
                "product_name_snapshot": product.name_en,
                "variant_name_snapshot": variant.variant_label if variant else None,
                "unit_price_snapshot": unit_price,
                "quantity": item.qty,
                "line_total": line_total,
            }
        )

    order = OrderRepository(db, business_id).create(
        order_number=_next_order_number(db, business_id),
        conversation_id=conversation_id,
        channel=channel,
        external_customer_id=external_customer_id or str(conversation.customer_chat_id),
        customer_name=customer_name,
        phone=phone,
        items=normalized_items,
        delivery_zone_id=zone.id if zone else None,
        delivery_address_text=delivery_address_text,
        delivery_fee=delivery_fee,
        items_total=items_total,
        grand_total=items_total + delivery_fee,
        payment_method=payment_method,
    )
    db.flush()
    for snapshot in order_item_snapshots:
        db.add(OrderItem(order_id=order.id, **snapshot))
    logger.info(
        "commerce_order_created business_id=%s conversation_id=%s order_id=%s items_total=%s delivery_fee=%s grand_total=%s",
        business_id,
        conversation_id,
        order.id,
        items_total,
        delivery_fee,
        items_total + delivery_fee,
    )
    return order


# ---------------------------------------------------------------------------
# API serialization helpers
# ---------------------------------------------------------------------------


def order_to_dict(db: Session, business_id: int, order: Order) -> dict:
    """Serialize an Order with computed fields expected by frontend/API schemas."""
    return {
        "id": order.id,
        "order_number": order.order_number,
        "conversation_id": order.conversation_id,
        "channel": order.channel,
        "external_customer_id": order.external_customer_id,
        "customer_name": order.customer_name,
        "phone": order.phone,
        "items": [
            {
                "id": item.id,
                "product_id": item.product_id,
                "variant_id": item.variant_id,
                "product_name": item.product_name_snapshot,
                "variant_label": item.variant_name_snapshot,
                "unit_price": item.unit_price_snapshot,
                "qty": item.quantity,
                "line_total": item.line_total,
            }
            for item in OrderRepository(db, business_id).list_items(order.id)
        ]
        or order.items,
        "delivery_zone_id": order.delivery_zone_id,
        "delivery_zone_name": delivery_zone_name(db, business_id, order.delivery_zone_id),
        "delivery_address_text": order.delivery_address_text,
        "delivery_fee": order.delivery_fee,
        "items_total": order.items_total,
        "grand_total": order.grand_total,
        "payment_method": order.payment_method,
        "payment_status": order.payment_status,
        "status": order.status,
        "created_at": order.created_at,
        "updated_at": order.updated_at,
        "cancelled_at": order.cancelled_at,
        "cancellation_reason": order.cancellation_reason,
    }


# ---------------------------------------------------------------------------
# Stateful cart context helpers
# ---------------------------------------------------------------------------


def _normalize_cart_item(item: dict) -> dict | None:
    """Normalize one AI-extracted cart item before merging into cart state."""
    if not isinstance(item, dict):
        return None
    product_id = item.get("product_id")
    if not product_id:
        return None
    try:
        qty = int(item.get("qty") or 1)
        normalized_product_id = int(product_id)
        normalized_variant_id = int(item["variant_id"]) if item.get("variant_id") else None
    except (TypeError, ValueError):
        return None
    return {
        "product_id": normalized_product_id,
        "variant_id": normalized_variant_id,
        "qty": max(1, qty),
    }


def _merge_items(current_items: list[dict], patch_items: list[dict]) -> list[dict]:
    """Merge updated product/variant quantities into existing cart items."""
    merged = {
        (item.get("product_id"), item.get("variant_id")): dict(item)
        for item in current_items
        if isinstance(item, dict)
        if item.get("product_id")
    }
    for raw_item in patch_items:
        item = _normalize_cart_item(raw_item)
        if not item:
            continue
        key = (item["product_id"], item.get("variant_id"))
        merged[key] = item
    return list(merged.values())


def _validated_cart_items(db: Session, business_id: int, items: list[dict]) -> list[dict]:
    """Keep only active tenant-owned product/variant references from AI output."""
    validated = []
    for item in items:
        product = (
            db.query(Product)
            .filter(
                Product.id == item["product_id"],
                Product.business_id == business_id,
                Product.is_active.is_(True),
            )
            .first()
        )
        if product is None:
            logger.info(
                "ai_cart_item_rejected reason=invalid_product business_id=%s product_id=%s",
                business_id,
                item["product_id"],
            )
            continue

        if item.get("variant_id") is not None:
            variant = (
                db.query(ProductVariant)
                .filter(
                    ProductVariant.id == item["variant_id"],
                    ProductVariant.business_id == business_id,
                    ProductVariant.product_id == product.id,
                    ProductVariant.is_active.is_(True),
                )
                .first()
            )
            if variant is None:
                logger.info(
                    "ai_cart_item_rejected reason=invalid_variant business_id=%s product_id=%s variant_id=%s",
                    business_id,
                    product.id,
                    item["variant_id"],
                )
                continue
        validated.append(item)
    return validated


def merge_cart_patch(
    db: Session,
    business_id: int,
    conversation_id: int,
    patch: dict | None,
) -> ConversationCart:
    """Apply one AI-extracted customer update to the persistent cart context."""
    repo = ConversationCartRepository(db, business_id)
    cart = repo.get_for_conversation(conversation_id)
    if cart is None:
        cart = repo.create(
            conversation_id=conversation_id,
            state={"items": []},
            expires_at=utcnow() + timedelta(hours=CART_TTL_HOURS),
        )

    state = dict(cart.state or {})
    patch = patch if isinstance(patch, dict) else {}
    if "items" in patch and isinstance(patch["items"], list):
        merged_items = _merge_items(state.get("items") or [], patch["items"])
        state["items"] = _validated_cart_items(db, business_id, merged_items)
    for source, target in (
        ("customer_name", "customer_name"),
        ("phone", "phone"),
        ("delivery_address_text", "delivery_address_text"),
        ("address", "delivery_address_text"),
        ("payment_method", "payment_method"),
    ):
        value = patch.get(source)
        if value not in (None, "", []):
            state[target] = value
    if patch.get("delivery_zone_id") not in (None, "", []):
        try:
            delivery_zone_id = int(patch["delivery_zone_id"])
        except (TypeError, ValueError):
            delivery_zone_id = None
        zone = (
            db.query(DeliveryZone)
            .filter(DeliveryZone.id == delivery_zone_id, DeliveryZone.business_id == business_id)
            .first()
            if delivery_zone_id is not None
            else None
        )
        if zone is not None:
            state["delivery_zone_id"] = delivery_zone_id
        else:
            logger.info(
                "ai_cart_patch_rejected_field reason=invalid_delivery_zone business_id=%s delivery_zone_id=%s",
                business_id,
                patch.get("delivery_zone_id"),
            )

    cart.state = state
    cart.updated_at = utcnow()
    cart.expires_at = utcnow() + timedelta(hours=CART_TTL_HOURS)
    db.flush()
    return cart


def cart_ready_for_order(cart: ConversationCart) -> bool:
    """Return True only when the cart contains every field required for an order."""
    return not cart_missing_order_fields(cart)


def cart_missing_order_fields(cart: ConversationCart) -> list[str]:
    """Return the order fields still missing from a conversation cart."""
    state = cart.state or {}
    missing = []
    if not state.get("items"):
        missing.append("items")
    if not state.get("customer_name"):
        missing.append("customer_name")
    if not state.get("phone"):
        missing.append("phone")
    if not state.get("delivery_address_text"):
        missing.append("delivery_address_text")
    if not state.get("payment_method"):
        missing.append("payment_method")
    return missing


def cart_confirmation_summary(db: Session, business_id: int, cart: ConversationCart) -> str:
    """Build a short confirmation prompt from validated cart state."""
    state = cart.state or {}
    lines = ["Please confirm this order:"]
    for item in state.get("items") or []:
        product = db.get(Product, item["product_id"])
        variant = db.get(ProductVariant, item["variant_id"]) if item.get("variant_id") else None
        if product is None or product.business_id != business_id:
            continue
        variant_text = f" ({variant.variant_label})" if variant else ""
        lines.append(f"- {product.name_en}{variant_text} x{item['qty']}")
    lines.extend(
        [
            f"Name: {state.get('customer_name')}",
            f"Phone: {state.get('phone')}",
            f"Address: {state.get('delivery_address_text')}",
            f"Payment: {str(state.get('payment_method')).upper()}",
            "Reply yes to place the order, or tell me what to change.",
        ]
    )
    return "\n".join(lines)


def create_order_from_cart(
    db: Session,
    business_id: int,
    conversation_id: int,
    cart: ConversationCart,
) -> Order:
    """Create an order from a previously accumulated conversation cart state."""
    state = cart.state or {}
    return create_validated_order(
        db,
        business_id,
        conversation_id=conversation_id,
        customer_name=state.get("customer_name"),
        phone=state.get("phone"),
        items=[SimpleNamespace(**item) for item in state.get("items", [])],
        delivery_zone_id=state.get("delivery_zone_id"),
        delivery_address_text=state["delivery_address_text"],
        payment_method=state["payment_method"],
    )


# ---------------------------------------------------------------------------
# Owner notification helpers
# ---------------------------------------------------------------------------


def order_summary(order: Order) -> str:
    """Build the human-readable order summary sent to owners/admins."""
    lines = [order.order_number, f"Customer: {order.customer_name or 'Unknown'}"]
    if order.phone:
        lines.append(f"Phone: {order.phone}")
    lines.append("Items:")
    for item in order.items:
        variant = f" ({item['variant_label']})" if item.get("variant_label") else ""
        lines.append(
            f"- {item['product_name']}{variant} x{item['qty']} = ${item['line_total']}"
        )
    lines += [
        f"Items total: {_money(order.items_total)}",
        f"Delivery: {_money(order.delivery_fee)}",
        f"Grand total: {_money(order.grand_total)}",
        f"Payment: {order.payment_method.value.upper()}",
        f"Address: {order.delivery_address_text}",
        f"Status: {order.status.value}",
    ]
    return "\n".join(lines)


async def notify_order(
    db: Session,
    business_id: int,
    bot: Bot,
    owner_chat_id: int | None,
    order: Order,
) -> None:
    """Notify the business owner/admins that a new order has been created."""
    business = db.get(Business, business_id)
    await notify_recipients(
        db,
        business_id,
        bot,
        owner_chat_id,
        "New order!\n" + order_summary(order),
        business.notify_on_lead if business else True,
    )
