"""One-time seed: creates the single fictional business behind the public
landing page's live demo (app/routers/demo.py). Idempotent — safe to run
more than once; skips if a demo business already exists.

Run:
    python scripts/seed_demo_business.py
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.db.session import SessionLocal
from app.models.business import AssistantTone, Business, BusinessStatus, BusinessType
from app.repositories.knowledge_item import KnowledgeItemRepository

BUSINESS_NAME = "Mekong Family Clinic"

KNOWLEDGE_ROWS = [
    {
        "category": "location",
        "title": "Location",
        "content_en": "House 88, Street 51, Boeung Keng Kang, Phnom Penh",
        "content_km": "ផ្ទះលេខ ៨៨ ផ្លូវ ៥១ សង្កាត់បឹងកេងកង រាជធានីភ្នំពេញ",
        "sort_order": 1,
    },
    {
        "category": "hours",
        "title": "Opening Hours",
        "content_en": "Monday–Saturday, 7:30 AM – 6:00 PM. Closed on Sunday.",
        "content_km": "ច័ន្ទ–សៅរ៍ ម៉ោង ៧:៣០ ព្រឹក ដល់ ៦:០០ល្ងាច។ បិទថ្ងៃអាទិត្យ។",
        "sort_order": 2,
    },
    {
        "category": "other",
        "title": "Phone Number",
        "content_en": "012 555 123 (call or Telegram)",
        "content_km": "012 555 123 (ទូរស័ព្ទ ឬ តេលេក្រាម)",
        "sort_order": 3,
    },
    {
        "category": "service",
        "title": "General consultation",
        "content_en": "General consultation with a family doctor",
        "content_km": "ពិគ្រោះជំងឺទូទៅជាមួយគ្រូពេទ្យគ្រួសារ",
        "price": "$15",
        "sort_order": 10,
    },
    {
        "category": "service",
        "title": "Child vaccination",
        "content_en": "Routine child vaccination (bring the vaccine booklet)",
        "content_km": "ចាក់វ៉ាក់សាំងកុមារតាមកាលវិភាគ (សូមនាំយកសៀវភៅចាក់ថ្នាំមកជាមួយ)",
        "price": "$8 - $25 depending on vaccine",
        "sort_order": 11,
    },
    {
        "category": "service",
        "title": "Blood test package",
        "content_en": "Basic blood test package (sugar, cholesterol, blood count)",
        "content_km": "កញ្ចប់ពិនិត្យឈាមមូលដ្ឋាន (ស្ករ កូឡេស្តេរ៉ុល ចំនួនកោសិកាឈាម)",
        "price": "$20",
        "sort_order": 12,
    },
    {
        "category": "service",
        "title": "Health check-up package",
        "content_en": "Full annual health check-up package",
        "content_km": "កញ្ចប់ពិនិត្យសុខភាពប្រចាំឆ្នាំពេញលេញ",
        "price": "$45",
        "sort_order": 13,
    },
    {
        "category": "faq",
        "title": "Do you accept walk-ins?",
        "content_en": "Yes, walk-ins are welcome, but booking ahead on Telegram means less waiting.",
        "content_km": "បាទ/ចាស អាចមកដោយផ្ទាល់បាន ប៉ុន្តែការកក់ទុកមុនតាមតេលេក្រាមនឹងកាត់បន្ថយពេលរង់ចាំ។",
        "sort_order": 20,
    },
    {
        "category": "faq",
        "title": "Do you accept health insurance?",
        "content_en": "We accept most local insurance providers — bring your insurance card when you visit.",
        "content_km": "យើងទទួលធានារ៉ាប់រងភាគច្រើននៅក្នុងស្រុក សូមនាំកាតធានារ៉ាប់រងមកជាមួយ។",
        "sort_order": 21,
    },
    {
        "category": "faq",
        "title": "What payment methods do you accept?",
        "content_en": "Cash, ABA Pay, and Wing are all accepted.",
        "content_km": "ទទួលបានទាំងសាច់ប្រាក់ ABA Pay និង Wing។",
        "sort_order": 22,
    },
]


def main() -> None:
    db = SessionLocal()
    try:
        existing = db.query(Business).filter(Business.is_demo.is_(True)).first()
        if existing:
            print(f"Demo business already exists (id={existing.id}, name={existing.name!r}). Skipping.")
            return

        business = Business(
            name=BUSINESS_NAME,
            business_type=BusinessType.clinic,
            default_language="both",
            status=BusinessStatus.active,
            is_demo=True,
            address="House 88, Street 51, Boeung Keng Kang, Phnom Penh",
            phone="012 555 123",
            assistant_display_name="Mekong Clinic Assistant",
            tone=AssistantTone.friendly,
            handoff_on_unsure=True,
        )
        db.add(business)
        db.flush()

        knowledge_repo = KnowledgeItemRepository(db, business.id)
        for row in KNOWLEDGE_ROWS:
            knowledge_repo.create(**row)

        db.commit()
        print(f"Created demo business '{BUSINESS_NAME}' (id={business.id}) with {len(KNOWLEDGE_ROWS)} knowledge_items.")
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    main()
