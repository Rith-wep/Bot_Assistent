import pytest

from app.models.business import BusinessType
from app.services.ai import _template_extraction_hint
from app.services.knowledge_templates import get_templates


TEMPLATE_TYPES = [item.value for item in BusinessType]


def test_all_business_types_have_complete_templates():
    assert TEMPLATE_TYPES == [
        "service_appointment",
        "product_retail",
        "food_beverage",
        "property_real_estate",
        "education",
        "professional_other",
    ]
    for business_type in TEMPLATE_TYPES:
        template = get_templates(business_type)
        assert 4 <= len(template["starter_items"]) <= 6
        assert 2 <= len(template["faqs"]) <= 5
        assert template["tone"]
        assert template["extractor_hint"]
        assert all(item["category"] and item["title"] for item in template["starter_items"])
        assert all(faq["title"] and faq["content_en"] and faq["content_km"] for faq in template["faqs"])


def test_unknown_business_type_uses_generic_fallback():
    assert get_templates("unmatched") == get_templates("professional_other")


def test_extraction_guidance_is_type_specific():
    food_hint = _template_extraction_hint("food_beverage")
    property_hint = _template_extraction_hint("property_real_estate")
    assert "menu-style" in food_hint
    assert "listings" in property_hint
    assert food_hint != property_hint
