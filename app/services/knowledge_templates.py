"""Backend-owned onboarding and extraction guidance for each industry type."""

KNOWLEDGE_TEMPLATES = {
    "service_appointment": {
        "label": "Service or appointments", "tone": "reassuring and professional",
        "default_personality": "professional", "assistant_role": "A caring appointment and customer service receptionist",
        "default_rules": ["Never make medical diagnoses", "Never invent prices or availability", "Always ask for a phone number when booking"],
        "extractor_hint": "expect appointment-based services, durations, providers, and prices",
        "starter_items": [
            {"category": "service", "title": "Main appointment", "price": "e.g. $25 or $20 - $40"},
            {"category": "service", "title": "Follow-up appointment", "price": "e.g. $15"},
            {"category": "service", "title": "Popular service", "price": "e.g. $30"},
            {"category": "policy", "title": "Cancellation policy", "price": ""},
            {"category": "other", "title": "Appointment duration", "price": "e.g. 60 minutes"},
        ],
        "faqs": [
            {"title": "Do I need an appointment?", "content_en": "Appointments are recommended. Please contact us to book a time.", "content_km": "សូមកក់ពេលជាមុន ដើម្បីធានាបានពេលវេលាសម្រាប់អ្នក។"},
            {"title": "How do I reschedule?", "content_en": "Please contact us as soon as possible to reschedule.", "content_km": "សូមទាក់ទងមកយើងខ្ញុំឱ្យបានឆាប់ ដើម្បីប្តូរពេលវេលា។"},
            {"title": "What payment methods do you accept?", "content_en": "Please ask our team about available payment methods.", "content_km": "សូមសួរក្រុមការងារអំពីវិធីបង់ប្រាក់ដែលមាន។"},
        ],
    },
    "product_retail": {
        "label": "Product retail", "tone": "warm and practical", "default_personality": "sales", "assistant_role": "A helpful retail sales assistant", "default_rules": ["Never invent product stock or prices", "Ask which size or variant the customer wants", "Offer delivery information when relevant"], "extractor_hint": "expect product names, variants, stock, delivery, and prices",
        "starter_items": [{"category": "service", "title": "Best-selling product", "price": "e.g. $12"}, {"category": "service", "title": "New arrival", "price": "e.g. $25"}, {"category": "service", "title": "Product variant or size", "price": "e.g. $8 - $15"}, {"category": "policy", "title": "Return or exchange policy", "price": ""}, {"category": "policy", "title": "Delivery fee", "price": "e.g. $2"}],
        "faqs": [{"title": "Do you offer delivery?", "content_en": "Please contact us to confirm delivery options and fees.", "content_km": "សូមទាក់ទងមកយើងខ្ញុំ ដើម្បីសួរអំពីការដឹកជញ្ជូន និងតម្លៃ។"}, {"title": "Can I return or exchange an item?", "content_en": "Please ask our team about our return and exchange policy.", "content_km": "សូមសួរក្រុមការងារអំពីគោលការណ៍ប្តូរ ឬប្រគល់ទំនិញ។"}, {"title": "What payment methods do you accept?", "content_en": "Please ask us about available payment methods.", "content_km": "សូមសួរអំពីវិធីបង់ប្រាក់ដែលមាន។"}],
    },
    "food_beverage": {
        "label": "Food and beverage", "tone": "warm and casual", "default_personality": "casual", "assistant_role": "A warm restaurant host and ordering assistant", "default_rules": ["Never invent menu items or prices", "Confirm size and add-ons when ordering", "Ask for delivery location before promising delivery"], "extractor_hint": "expect menu-style items with prices, sizes, add-ons, and meal categories",
        "starter_items": [{"category": "service", "title": "Signature dish or drink", "price": "e.g. $4.50"}, {"category": "service", "title": "Breakfast item", "price": "e.g. $3"}, {"category": "service", "title": "Family or combo set", "price": "e.g. $12 - $20"}, {"category": "policy", "title": "Delivery area and fee", "price": "e.g. $1.50"}, {"category": "other", "title": "Dietary options", "price": ""}],
        "faqs": [{"title": "Do you offer delivery?", "content_en": "Please contact us to confirm delivery areas and fees.", "content_km": "សូមទាក់ទងមកយើងខ្ញុំ ដើម្បីសួរអំពីតំបន់ និងតម្លៃដឹកជញ្ជូន។"}, {"title": "Do you have vegetarian options?", "content_en": "Please ask our team about today's vegetarian options.", "content_km": "សូមសួរក្រុមការងារអំពីមុខម្ហូបបួសដែលមានថ្ងៃនេះ។"}, {"title": "Can I order for pickup?", "content_en": "Please contact us to place a pickup order.", "content_km": "អ្នកអាចទាក់ទងមកយើងខ្ញុំ ដើម្បីកុម្ម៉ង់យកទៅបាន។"}],
    },
    "property_real_estate": {
        "label": "Property and real estate", "tone": "clear and trustworthy", "default_personality": "professional", "assistant_role": "A clear and trustworthy property advisor", "default_rules": ["Never invent listing availability or prices", "Always mention that viewing times must be confirmed", "Ask for a phone number when the customer wants a viewing"], "extractor_hint": "expect listings with price, location, size, bedrooms, availability, and deposits",
        "starter_items": [{"category": "service", "title": "Available listing", "price": "e.g. $350/month"}, {"category": "service", "title": "Studio or one-bedroom", "price": "e.g. $250/month"}, {"category": "service", "title": "Property sale listing", "price": "e.g. $85,000"}, {"category": "policy", "title": "Deposit and lease terms", "price": "e.g. 2 months"}, {"category": "other", "title": "Property location and size", "price": "e.g. 65 m²"}],
        "faqs": [{"title": "Is a deposit required?", "content_en": "Please contact us for the deposit and lease terms for each listing.", "content_km": "សូមទាក់ទងមកយើងខ្ញុំ ដើម្បីសួរអំពីប្រាក់កក់ និងលក្ខខណ្ឌជួល។"}, {"title": "Are utilities included?", "content_en": "Utility arrangements depend on the listing. Please ask about a specific property.", "content_km": "ការរួមបញ្ចូលថ្លៃទឹកភ្លើងអាស្រ័យលើអចលនទ្រព្យនីមួយៗ។"}, {"title": "Can I schedule a viewing?", "content_en": "Please contact us to arrange a property viewing.", "content_km": "សូមទាក់ទងមកយើងខ្ញុំ ដើម្បីកំណត់ពេលមើលអចលនទ្រព្យ។"}],
    },
    "education": {
        "label": "Education", "tone": "formal and parent-facing", "default_personality": "professional", "assistant_role": "A respectful, parent-facing school admissions assistant", "default_rules": ["Never promise admission without staff confirmation", "Never invent class schedules or fees", "Ask for a phone number when arranging enrollment"], "extractor_hint": "expect courses, grade levels, schedules, enrollment, fees, and learning outcomes",
        "starter_items": [{"category": "service", "title": "Main course or class", "price": "e.g. $40/month"}, {"category": "service", "title": "Beginner or foundation course", "price": "e.g. $30/month"}, {"category": "service", "title": "Private tutoring session", "price": "e.g. $15/hour"}, {"category": "other", "title": "Class schedule and age range", "price": ""}, {"category": "policy", "title": "Enrollment and absence policy", "price": ""}],
        "faqs": [{"title": "How do I enroll?", "content_en": "Please contact the school to confirm availability and enrollment steps.", "content_km": "សូមទាក់ទងសាលា ដើម្បីសួរអំពីកន្លែងទំនេរ និងជំហានចុះឈ្មោះ។"}, {"title": "What ages or grades do you accept?", "content_en": "Please ask us about the age and grade levels for each class.", "content_km": "សូមសួរអំពីអាយុ និងកម្រិតថ្នាក់សម្រាប់មុខវិជ្ជានីមួយៗ។"}, {"title": "What are the class fees?", "content_en": "Please contact us for the fee for your selected class.", "content_km": "សូមទាក់ទងមកយើងខ្ញុំ ដើម្បីសួរអំពីថ្លៃសិក្សា។"}],
    },
    "professional_other": {
        "label": "Professional or other", "tone": "clear and helpful", "default_personality": "friendly", "assistant_role": "A clear and helpful business assistant", "default_rules": ["Never invent prices or policies", "Ask for a phone number when the customer wants to proceed"], "extractor_hint": "expect the business's own services, prices, policies, and contact details",
        "starter_items": [{"category": "service", "title": "Main service", "price": "e.g. $25"}, {"category": "service", "title": "Popular service", "price": "e.g. $50"}, {"category": "policy", "title": "Payment or cancellation policy", "price": ""}, {"category": "other", "title": "What customers should know", "price": ""}],
        "faqs": [{"title": "What services do you offer?", "content_en": "Please tell us what you need and our team will guide you.", "content_km": "សូមប្រាប់យើងខ្ញុំអំពីតម្រូវការរបស់អ្នក ហើយក្រុមការងារនឹងណែនាំ។"}, {"title": "How can I contact you?", "content_en": "Please use the contact details provided by the business.", "content_km": "សូមប្រើព័ត៌មានទំនាក់ទំនងដែលអាជីវកម្មបានផ្តល់។"}],
    },
}


def get_templates(business_type: str) -> dict:
    return KNOWLEDGE_TEMPLATES.get(business_type, KNOWLEDGE_TEMPLATES["professional_other"])
