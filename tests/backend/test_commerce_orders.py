from decimal import Decimal
from types import SimpleNamespace

import pytest

from app.models.conversation import Conversation
from app.models.conversation_cart import ConversationCart
from app.models.delivery_zone import DeliveryZone
from app.models.order import Order
from app.models.product import Product, ProductVariant
from app.services.commerce import (
    cart_ready_for_order,
    create_order_from_cart,
    create_validated_order,
    merge_cart_patch,
    order_to_dict,
)
from app.services.exceptions import NotFoundError, OutOfStockError


class FakeQuery:
    def __init__(self, db, model):
        self.db = db
        self.model = model
        self.filters = []

    def filter(self, *conditions):
        self.filters.extend(conditions)
        return self

    def order_by(self, *args):
        return self

    def with_for_update(self):
        self.db.locked_models.append(self.model)
        return self

    def first(self):
        if self.model is Conversation:
            return self._find_conversation()
        if self.model is DeliveryZone:
            return self._find_delivery_zone()
        if self.model is Product:
            return self._find_product()
        if self.model is ProductVariant:
            return self._find_variant()
        if self.model is Order:
            return self._find_order()
        if self.model is ConversationCart:
            return self._find_cart()
        return None

    def _condition_values(self):
        values = {}
        for condition in self.filters:
            left = getattr(condition, "left", None)
            right = getattr(condition, "right", None)
            column = getattr(left, "name", None)
            value = getattr(right, "value", None)
            if column:
                values.setdefault(column, []).append(value)
        return values

    def _find_conversation(self):
        values = self._condition_values()
        return self.db.conversations.get((values["id"][0], values["business_id"][0]))

    def _find_delivery_zone(self):
        values = self._condition_values()
        return self.db.delivery_zones.get((values["id"][0], values["business_id"][0]))

    def _find_product(self):
        values = self._condition_values()
        product = self.db.products.get((values["id"][0], values["business_id"][0]))
        if product and not product.is_active:
            return None
        return product

    def _find_variant(self):
        values = self._condition_values()
        variant = self.db.variants.get((values["id"][0], values["product_id"][0]))
        if variant and not variant.is_active:
            return None
        return variant

    def _find_order(self):
        values = self._condition_values()
        conversation_id = values.get("conversation_id", [None])[0]
        for order in self.db.orders:
            if order.business_id == self.db.business_id and order.conversation_id == conversation_id:
                return order
        return None

    def _find_cart(self):
        values = self._condition_values()
        conversation_id = values.get("conversation_id", [None])[0]
        return self.db.carts.get((conversation_id, self.db.business_id))


class FakeSession:
    def __init__(self, business_id=1):
        self.business_id = business_id
        self.conversations = {}
        self.products = {}
        self.variants = {}
        self.delivery_zones = {}
        self.orders = []
        self.carts = {}
        self.locked_models = []

    def query(self, model):
        return FakeQuery(self, model)

    def add(self, obj):
        if isinstance(obj, Order):
            obj.id = len(self.orders) + 1
            obj.business_id = self.business_id
            self.orders.append(obj)
        if isinstance(obj, ConversationCart):
            obj.id = len(self.carts) + 1
            obj.business_id = self.business_id
            self.carts[(obj.conversation_id, obj.business_id)] = obj

    def flush(self):
        pass


def make_session():
    db = FakeSession(business_id=1)
    db.conversations[(10, 1)] = SimpleNamespace(id=10, business_id=1)
    db.conversations[(20, 2)] = SimpleNamespace(id=20, business_id=2)
    db.delivery_zones[(1, 1)] = SimpleNamespace(id=1, business_id=1, fee=Decimal("1.50"))
    db.products[(1, 1)] = SimpleNamespace(
        id=1,
        business_id=1,
        name_en="Classic T-shirt",
        base_price=Decimal("8.00"),
        is_active=True,
    )
    db.products[(2, 1)] = SimpleNamespace(
        id=2,
        business_id=1,
        name_en="Inactive Product",
        base_price=Decimal("5.00"),
        is_active=False,
    )
    db.variants[(1, 1)] = SimpleNamespace(
        id=1,
        product_id=1,
        variant_label="Blue / M",
        price_override=None,
        stock_quantity=5,
        is_active=True,
    )
    db.variants[(2, 1)] = SimpleNamespace(
        id=2,
        product_id=1,
        variant_label="Red / M",
        price_override=Decimal("9.00"),
        stock_quantity=0,
        is_active=True,
    )
    db.variants[(3, 1)] = SimpleNamespace(
        id=3,
        product_id=1,
        variant_label="Black / L",
        price_override=None,
        stock_quantity=5,
        is_active=False,
    )
    return db


def item(product_id=1, variant_id=1, qty=2):
    return SimpleNamespace(product_id=product_id, variant_id=variant_id, qty=qty)


def create_order(db, **overrides):
    payload = {
        "conversation_id": 10,
        "customer_name": "Hong",
        "phone": "012345678",
        "items": [item()],
        "delivery_zone_id": 1,
        "delivery_address_text": "Street 2004, Phnom Penh",
        "payment_method": "cod",
    }
    payload.update(overrides)
    return create_validated_order(db, 1, **payload)


def test_order_creation_validates_conversation_ownership():
    db = make_session()

    with pytest.raises(NotFoundError) as exc:
        create_order(db, conversation_id=20)

    assert exc.value.detail == "Conversation not found"
    assert db.orders == []


def test_order_creation_validates_tenant_scope_for_products_and_zones():
    db = make_session()

    with pytest.raises(NotFoundError) as exc:
        create_order(db, delivery_zone_id=999)

    assert exc.value.detail == "Delivery zone not found"

    with pytest.raises(NotFoundError) as exc:
        create_order(db, items=[item(product_id=999, variant_id=None)])

    assert exc.value.detail == "Product not found"


def test_price_and_total_calculation_uses_product_and_delivery_zone_prices():
    db = make_session()

    order = create_order(db)

    assert order.items_total == Decimal("16.00")
    assert order.delivery_fee == Decimal("1.50")
    assert order.grand_total == Decimal("17.50")
    assert order.items == [
        {
            "product_id": 1,
            "product_name": "Classic T-shirt",
            "variant_id": 1,
            "variant_label": "Blue / M",
            "qty": 2,
            "unit_price": "8.00",
            "line_total": "16.00",
        }
    ]


def test_price_calculation_uses_variant_price_override_when_present():
    db = make_session()
    db.variants[(2, 1)].stock_quantity = 3

    order = create_order(db, items=[item(variant_id=2, qty=2)])

    assert order.items_total == Decimal("18.00")
    assert order.grand_total == Decimal("19.50")
    assert order.items[0]["unit_price"] == "9.00"


def test_successful_order_deducts_variant_stock():
    db = make_session()

    create_order(db, items=[item(variant_id=1, qty=2)])

    assert db.variants[(1, 1)].stock_quantity == 3
    assert ProductVariant in db.locked_models


def test_rejects_out_of_stock_variant():
    db = make_session()

    with pytest.raises(OutOfStockError) as exc:
        create_order(db, items=[item(variant_id=2, qty=1)])

    assert exc.value.status_code == 409
    assert exc.value.detail == "Red / M has only 0 in stock."
    assert db.orders == []


def test_rejects_inactive_product_or_variant():
    db = make_session()

    with pytest.raises(NotFoundError) as exc:
        create_order(db, items=[item(product_id=2, variant_id=None)])

    assert exc.value.detail == "Product not found"

    with pytest.raises(NotFoundError) as exc:
        create_order(db, items=[item(variant_id=3)])

    assert exc.value.detail == "Variant not found"


def test_prevents_duplicate_order_for_same_conversation_context():
    db = make_session()

    first = create_order(db)
    stock_after_first = db.variants[(1, 1)].stock_quantity
    second = create_order(db)

    assert second is first
    assert len(db.orders) == 1
    assert db.variants[(1, 1)].stock_quantity == stock_after_first


def test_order_response_includes_delivery_zone_name():
    db = make_session()
    db.delivery_zones[(1, 1)].zone_name_en = "Phnom Penh"
    db.delivery_zones[(1, 1)].zone_name_km = "ភ្នំពេញ"

    order = create_order(db)

    assert order_to_dict(db, 1, order)["delivery_zone_name"] == "Phnom Penh"


def test_cart_patch_merges_incremental_customer_choices():
    db = make_session()
    cart = merge_cart_patch(
        db,
        1,
        10,
        {"items": [{"product_id": 1, "variant_id": 1, "qty": 1}]},
    )

    cart = merge_cart_patch(
        db,
        1,
        10,
            {
                "items": [{"product_id": 1, "variant_id": 1, "qty": 3}],
                "customer_name": "Dara",
                "phone": "012345678",
                "delivery_address_text": "Street 2004, Phnom Penh",
                "delivery_zone_id": 1,
                "payment_method": "cod",
            },
        )

    assert cart.state["items"] == [{"product_id": 1, "variant_id": 1, "qty": 3}]
    assert cart.state["customer_name"] == "Dara"
    assert cart.state["phone"] == "012345678"
    assert cart.state["delivery_address_text"] == "Street 2004, Phnom Penh"
    assert cart_ready_for_order(cart)


def test_order_can_be_created_from_ready_cart_state():
    db = make_session()
    cart = merge_cart_patch(
        db,
        1,
        10,
        {
            "items": [{"product_id": 1, "variant_id": 1, "qty": 2}],
            "customer_name": "Hong",
            "phone": "012345678",
            "delivery_address_text": "Street 2004, Phnom Penh",
            "delivery_zone_id": 1,
            "payment_method": "cod",
        },
    )

    order = create_order_from_cart(db, 1, 10, cart)

    assert order.customer_name == "Hong"
    assert order.grand_total == Decimal("17.50")
