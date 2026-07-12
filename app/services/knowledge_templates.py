"""Suggested knowledge_items per business_type, shown as prefilled prompts
in onboarding step 2. Hours and location are always required regardless of
type, so they aren't templated here — only the type-varying suggestions are.
"""

KNOWLEDGE_TEMPLATES: dict[str, dict[str, list[str]]] = {
    "clinic": {
        "services": ["Consultation", "Check-up", "Follow-up visit"],
        "faqs": [
            "Do you accept walk-ins?",
            "Do you accept health insurance?",
            "What payment methods do you accept?",
        ],
    },
    "shop": {
        "services": ["Best-selling item", "Popular item", "New arrival"],
        "faqs": [
            "Do you offer delivery?",
            "Can I return or exchange an item?",
            "What payment methods do you accept?",
        ],
    },
    "real_estate": {
        "services": ["Studio unit", "1-bedroom unit", "2-bedroom unit"],
        "faqs": [
            "Is a deposit required?",
            "Are utilities included in the price?",
            "Do you allow pets?",
        ],
    },
    "other": {
        "services": ["Main service", "Second service"],
        "faqs": [
            "What are your opening hours?",
            "Where are you located?",
        ],
    },
}


def get_templates(business_type: str) -> dict[str, list[str]]:
    return KNOWLEDGE_TEMPLATES.get(business_type, KNOWLEDGE_TEMPLATES["other"])
