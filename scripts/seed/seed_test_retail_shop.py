"""Seed a product_retail test shop with products, variants, and delivery zones.

Run:
    python scripts/seed/seed_test_retail_shop.py
"""
import sys
from decimal import Decimal
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from app.db.session import SessionLocal
from app.models.business import AssistantTone, Business, BusinessStatus, BusinessType
from app.models.delivery_zone import DeliveryZone
from app.models.product import Product, ProductVariant
from app.services.ai_profile import ensure_ai_profile

BUSINESS_NAME = "Hong Test Shop"

PRODUCTS = [
    {
        "name_en": "Classic T-shirt",
        "name_km": "អាវយឺត Classic",
        "description_en": "Soft everyday cotton T-shirt.",
        "category": "Apparel",
        "base_price": Decimal("8.00"),
        "photo_urls": ["https://images.unsplash.com/photo-1521572163474-6864f9cf17ab"],
        "variants": [
            ("Red / S", None, 5, "TS-RED-S"),
            ("Red / M", None, 0, "TS-RED-M"),
            ("Blue / M", None, 5, "TS-BLU-M"),
        ],
    },
    {
        "name_en": "Canvas Tote Bag",
        "name_km": "កាបូប Canvas",
        "description_en": "Reusable canvas tote for daily shopping.",
        "category": "Bags",
        "base_price": Decimal("6.50"),
        "photo_urls": ["https://images.unsplash.com/photo-1590874103328-eac38a683ce7"],
        "variants": [
            ("Natural", None, 8, "TOTE-NAT"),
            ("Black", Decimal("7.00"), 3, "TOTE-BLK"),
        ],
    },
    {
        "name_en": "Insulated Water Bottle",
        "name_km": "ដបទឹករក្សាកំដៅ",
        "description_en": "Stainless steel bottle that keeps drinks cold or warm.",
        "category": "Accessories",
        "base_price": Decimal("12.00"),
        "photo_urls": ["https://images.unsplash.com/photo-1602143407151-7111542de6e8"],
        "variants": [
            ("White / 500ml", None, 4, "BOT-WHI-500"),
            ("Green / 500ml", None, 2, "BOT-GRN-500"),
            ("Black / 750ml", Decimal("15.00"), 1, "BOT-BLK-750"),
        ],
    },
]

ZONES = [
    ("Phnom Penh", "ភ្នំពេញ", Decimal("1.50"), "1 day"),
    ("Kandal", "កណ្តាល", Decimal("2.50"), "1-2 days"),
    ("Siem Reap", "សៀមរាប", Decimal("4.00"), "2-3 days"),
]


def main() -> None:
    db = SessionLocal()
    try:
        existing = db.query(Business).filter(Business.name == BUSINESS_NAME).first()
        if existing:
            print(f"Retail test shop already exists (id={existing.id}). Skipping.")
            return

        business = Business(
            name=BUSINESS_NAME,
            business_type=BusinessType.product_retail,
            default_language="both",
            status=BusinessStatus.active,
            onboarding_completed=True,
            assistant_display_name="Hong Sales Assistant",
            tone=AssistantTone.friendly,
            handoff_on_unsure=True,
        )
        db.add(business)
        db.flush()
        ensure_ai_profile(db, business)

        for sort_order, row in enumerate(PRODUCTS, start=1):
            product_fields = {key: value for key, value in row.items() if key != "variants"}
            product = Product(business_id=business.id, sort_order=sort_order, is_active=True, **product_fields)
            db.add(product)
            db.flush()
            for label, price_override, stock, sku in row["variants"]:
                db.add(
                    ProductVariant(
                        product_id=product.id,
                        variant_label=label,
                        price_override=price_override,
                        stock_quantity=stock,
                        sku=sku,
                        is_active=True,
                    )
                )

        for sort_order, (name_en, name_km, fee, eta) in enumerate(ZONES, start=1):
            db.add(
                DeliveryZone(
                    business_id=business.id,
                    zone_name_en=name_en,
                    zone_name_km=name_km,
                    fee=fee,
                    estimated_days=eta,
                    sort_order=sort_order,
                )
            )

        db.commit()
        print(f"Created retail test shop '{BUSINESS_NAME}' (id={business.id}).")
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    main()
