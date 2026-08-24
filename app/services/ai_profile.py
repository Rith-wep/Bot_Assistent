from sqlalchemy.orm import Session

from app.models.ai_profile import AIProfile, Personality
from app.models.business_rule import BusinessRule
from app.services.knowledge_templates import get_templates

## ensure ai profile for a business, creating one if it doesn't exist
def ensure_ai_profile(db: Session, business) -> AIProfile:
    profile = db.query(AIProfile).filter(AIProfile.business_id == business.id).first()
    if profile:
        return profile

    ## get the appropriate template for the business type
    template = get_templates(business.business_type.value)

    ## create a new AIProfile and associated BusinessRules
    profile = AIProfile(
        business_id=business.id,
        assistant_name=business.assistant_display_name or "Assistant",
        assistant_role=template["assistant_role"],
        personality=Personality(template["default_personality"]),
        language_mode="mirror",
        response_length="short",
        greeting_message_en=business.welcome_message_en,
        greeting_message_km=business.welcome_message_km,
    )

    ## Add the new profile and business rules to the database
    db.add(profile)
    for index, text in enumerate(template["default_rules"]):
        db.add(BusinessRule(business_id=business.id, rule_text=text, sort_order=index))
    db.flush()
    return profile
