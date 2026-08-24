"""Replace legacy business types with onboarding industry templates."""
from typing import Sequence, Union
from alembic import op

revision: str = "c7e8f9a0b1c2"
down_revision: Union[str, None] = "a91d5c7e4b20"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("""
        CREATE TYPE business_type_new AS ENUM (
          'service_appointment', 'product_retail', 'food_beverage',
          'property_real_estate', 'education', 'professional_other'
        )
    """)
    op.execute("""
        ALTER TABLE businesses ALTER COLUMN business_type DROP DEFAULT;
        ALTER TABLE businesses ALTER COLUMN business_type TYPE business_type_new
        USING (CASE business_type::text
          WHEN 'clinic' THEN 'service_appointment'
          WHEN 'shop' THEN 'product_retail'
          WHEN 'real_estate' THEN 'property_real_estate'
          ELSE 'professional_other' END)::business_type_new;
        DROP TYPE business_type;
        ALTER TYPE business_type_new RENAME TO business_type;
        ALTER TABLE businesses ALTER COLUMN business_type SET DEFAULT 'professional_other';
    """)


def downgrade() -> None:
    op.execute("""
        CREATE TYPE business_type_old AS ENUM ('clinic', 'shop', 'real_estate', 'other');
        ALTER TABLE businesses ALTER COLUMN business_type DROP DEFAULT;
        ALTER TABLE businesses ALTER COLUMN business_type TYPE business_type_old
        USING (CASE business_type::text
          WHEN 'service_appointment' THEN 'clinic'
          WHEN 'product_retail' THEN 'shop'
          WHEN 'property_real_estate' THEN 'real_estate'
          ELSE 'other' END)::business_type_old;
        DROP TYPE business_type;
        ALTER TYPE business_type_old RENAME TO business_type;
        ALTER TABLE businesses ALTER COLUMN business_type SET DEFAULT 'other';
    """)
