# Product Retail Commerce Feature

This document summarizes the end-to-end `product_retail` commerce feature added
to the multi-tenant customer assistant.

The goal is to let retail businesses manage products, variants, delivery zones,
and customer orders while keeping existing service-style businesses on the
original knowledge and leads flow.

## High-Level Behavior

For normal business types, the app still works as before:

```text
Knowledge page -> knowledge_items
Leads page -> leads
Bot completion -> lead capture
```

For `product_retail` businesses, the dashboard switches to commerce behavior:

```text
Knowledge page -> Products
Leads page -> Orders
Settings -> Delivery zones
Bot completion -> order capture
```

The generic `leads` table was not removed. It remains the source of truth for
non-retail tenants. For retail tenants, a completed order is the richer lead.

## Data Model

The commerce schema is introduced by:

```text
alembic/versions/f4b2c1d9e8a7_product_retail_commerce.py
```

New tables:

```text
products
product_variants
delivery_zones
orders
conversation_carts
```

### products

Tenant-scoped catalog table.

Important fields:

- `business_id`
- `name_en`
- `name_km`
- `description_en`
- `description_km`
- `category`
- `base_price`
- `photo_urls`
- `is_active`
- `sort_order`

### product_variants

Variants belong to products.

Important fields:

- `product_id`
- `variant_label`
- `price_override`
- `stock_quantity`
- `sku`
- `is_active`

If `price_override` is null, the variant uses the product `base_price`.

### delivery_zones

Tenant-scoped delivery fee table.

Important fields:

- `business_id`
- `zone_name_en`
- `zone_name_km`
- `fee`
- `estimated_days`
- `sort_order`

### orders

Tenant-scoped retail order table.

Important fields:

- `business_id`
- `conversation_id`
- `customer_name`
- `phone`
- `items`
- `delivery_zone_id`
- `delivery_zone_name` in API responses
- `delivery_address_text`
- `delivery_fee`
- `items_total`
- `grand_total`
- `payment_method`
- `status`
- `created_at`

`items` is JSON shaped like:

```json
[
  {
    "product_id": 1,
    "product_name": "Classic T-shirt",
    "variant_id": 2,
    "variant_label": "Blue / M",
    "qty": 2,
    "unit_price": "8.00",
    "line_total": "16.00"
  }
]
```

## Backend Files

New model files:

```text
app/models/product.py
app/models/delivery_zone.py
app/models/order.py
app/models/conversation_cart.py
```

New repository files:

```text
app/repositories/product.py
app/repositories/delivery_zone.py
app/repositories/order.py
app/repositories/conversation_cart.py
```

New schema file:

```text
app/schemas/commerce.py
```

New router:

```text
app/routers/commerce.py
```

New service:

```text
app/services/commerce.py
```

Router registration:

```text
app/api/router.py
```

Model registration:

```text
app/models/__init__.py
```

## API Endpoints

All commerce endpoints are authenticated and tenant-scoped.

Commerce is enabled only when the current tenant's business type is
`product_retail`.

### Products

```text
GET    /api/products
POST   /api/products
PUT    /api/products/{product_id}
DELETE /api/products/{product_id}
POST   /api/products/ai-extract
```

`/api/products/ai-extract` turns messy pasted product notes into draft products
and variants. Nothing is saved until the frontend submits the reviewed products.

### Delivery Zones

```text
GET    /api/delivery-zones
POST   /api/delivery-zones
PUT    /api/delivery-zones/{zone_id}
DELETE /api/delivery-zones/{zone_id}
```

### Orders

```text
GET  /api/orders
POST /api/orders
PUT  /api/orders/{order_id}/status
```

Allowed status transitions:

```text
pending -> confirmed
pending -> cancelled
confirmed -> shipped
confirmed -> cancelled
```

`shipped` and `cancelled` are terminal in the current implementation.

## Server-Side Order Rules

Order creation lives in:

```text
app/services/commerce.py
```

The backend, not the AI, is responsible for production-sensitive order logic:

- validates the conversation belongs to the tenant
- validates products belong to the tenant
- validates variants belong to the selected product
- rejects inactive products and variants
- rejects out-of-stock variants
- locks variant rows with `SELECT ... FOR UPDATE` while placing orders
- calculates `items_total`
- reads delivery fee from `delivery_zones`
- calculates `grand_total`
- reduces variant stock after order creation
- avoids duplicate order creation for the same conversation

This protects the system from AI guesses and client-side price manipulation.

If a concurrent order reduces stock before the current transaction completes,
the backend returns a clean `400 Bad Request` with a message such as:

```text
Blue / M has only 1 in stock.
```

## Stateful Cart Memory

Retail conversations now use lightweight DB-backed cart state instead of
treating every AI extraction as a fresh order attempt.

The cart table is:

```text
conversation_carts
```

Important fields:

- `business_id`
- `conversation_id`
- `state`
- `updated_at`
- `expires_at`

The cart state is JSON. It stores incremental order choices:

```json
{
  "items": [
    { "product_id": 1, "variant_id": 3, "qty": 2 }
  ],
  "customer_name": "Hong",
  "phone": "012345678",
  "delivery_zone_id": 1,
  "delivery_address_text": "Street 2004, Phnom Penh",
  "payment_method": "cod"
}
```

The service helpers live in:

```text
app/services/commerce.py
```

Cart helpers:

```text
merge_cart_patch
cart_ready_for_order
create_order_from_cart
```

When the user changes choices, such as size or quantity, the bot merges the new
patch into the existing cart for the same `conversation_id`. The order is only
created after the classifier returns `confirmed_order=true` and the cart has the
required order details.

## AI Behavior

Retail-specific AI behavior was added in:

```text
app/services/ai.py
```

For `product_retail` businesses, the prompt now includes:

- active products
- product descriptions
- product prices
- in-stock variants
- unavailable variants
- delivery zones
- delivery fees
- delivery ETAs

The AI is instructed to:

- act as a sales assistant
- mention only variants with stock above `0` as available
- never promise a variant with stock `0`
- ask for quantity
- ask for delivery address
- ask for delivery zone when needed
- ask for payment method
- suggest COD by default
- avoid guessing when product, variant, stock, address, or zone is ambiguous
- not claim an order has been created until details are confirmed

The retail classifier returns commerce metadata, including:

```json
{
  "mentioned_product_ids": [1],
  "cart_patch": {
    "customer_name": "Hong",
    "phone": "012345678",
    "items": [
      { "product_id": 1, "variant_id": 3, "qty": 2 }
    ],
    "delivery_zone_id": 1,
    "delivery_address_text": "Street 2004, Phnom Penh",
    "payment_method": "cod"
  },
  "confirmed_order": true
}
```

The backend still validates this before saving an order.

## Product Photos

Telegram photo sending was added in:

```text
app/channels/telegram_bot.py
```

When the customer asks to see products or photos, the bot sends real Telegram
photo attachments using saved product `photo_urls`.

Photo trigger words include:

```text
photo
picture
image
see
show
មើល
រូប
```

The AI may discuss a product, but the channel sends the real image separately:

```python
await update.message.reply_photo(photo=photo_url)
```

The AI response is sanitized to remove fake Markdown image output such as:

```text
![Soft Cotton T-shirt](https://example.com/image.jpg)
![Soft Cotton T-shirt](attachment://soft_cotton_tshirt.jpg)
```

Use direct image URLs for reliable Telegram delivery. Cloudinary or direct
`.jpg` / `.png` URLs are best.

## Frontend Behavior

Frontend commerce screens added:

```text
frontend/src/pages/Products.jsx
frontend/src/pages/Orders.jsx
frontend/src/pages/settings/DeliveryZonesSection.jsx
```

Existing route wrappers were updated:

```text
frontend/src/pages/KnowledgeEditor.jsx
frontend/src/pages/Leads.jsx
frontend/src/pages/Settings.jsx
frontend/src/components/Sidebar.jsx
frontend/src/pages/Dashboard.jsx
```

For `product_retail` tenants:

- `/app/knowledge` renders `Products`
- `/app/leads` renders `Orders`
- Settings shows `Delivery zones`
- Sidebar label `Knowledge` becomes `Products`
- Sidebar label `Leads` becomes `Orders`
- Dashboard label `New leads` becomes `New orders`
- Dashboard label `Recent leads` becomes `Recent orders`

The frontend knows the business type through the auth bootstrap profile:

```text
app/schemas/auth.py
app/routers/auth.py
frontend/src/context/AuthContext.jsx
```

## Product Management UI

The Products screen supports:

- product grid
- photo preview gallery
- product name in English and Khmer
- descriptions in English and Khmer
- category
- base price
- multiple image URLs through the `photo_urls` array
- drag-and-drop image upload to Cloudinary when configured
- active flag support in API
- variants with:
  - label
  - price override
  - stock quantity
  - SKU

The "Add with AI" retail flow accepts messy product text and extracts products
with variants.

Cloudinary upload uses the same frontend environment variables as the business
logo upload:

```text
VITE_CLOUDINARY_CLOUD_NAME
VITE_CLOUDINARY_UPLOAD_PRESET
```

If Cloudinary is not configured, owners can still paste direct image URLs.

## Delivery Zones UI

The Settings page includes an editable delivery-zone section for retail tenants.

Owners can manage:

- zone name in English
- zone name in Khmer
- delivery fee
- estimated delivery days

These zones are used by the bot prompt and by backend order total calculation.

## Orders UI

For retail tenants, the old Leads page becomes Orders.

The Orders screen shows:

- customer
- phone
- ordered items
- variants
- quantity
- delivery zone
- full delivery address
- item total
- delivery fee
- grand total
- payment method
- status
- created date

Owners can open an order details modal to inspect the full structured snapshot:

- customer and phone
- item rows
- variant labels
- unit prices
- line totals
- delivery zone
- full address
- payment method
- total breakdown

Owners can export orders to CSV from the Orders page. The CSV export supports a
selected date range and includes:

- order ID
- customer
- phone
- item summary
- items total
- delivery zone
- delivery fee
- grand total
- payment method
- status
- address
- created date

Owners can update order status from:

```text
pending -> confirmed -> shipped
```

## Seed Data

Test seed script:

```text
scripts/seed/seed_test_retail_shop.py
```

Run:

```powershell
python scripts/seed/seed_test_retail_shop.py
```

It creates:

- `Hong Test Shop`
- 3 products
- 2 to 3 variants per product
- mixed stock levels
- at least one `0` stock variant
- delivery zones for Phnom Penh, Kandal, and Siem Reap

## Test Script For AI Product Extraction

Paste this into Products -> Add with AI:

```text
Hong Test Shop product list

Classic T-shirt / អាវយឺត Classic
Price: $8
Category: Apparel
Description: Soft cotton T-shirt for everyday wear.
Colors: Red, Blue, Black
Sizes: S, M, L
Stock:
- Red S: 5
- Red M: 0
- Red L: 4
- Blue S: 3
- Blue M: 5
- Blue L: 2
- Black S: 1
- Black M: 6
- Black L: 0
Photo: https://res.cloudinary.com/demo/image/upload/sample.jpg

Canvas Tote Bag / កាបូប Canvas
Price: $6.50
Category: Bags
Description: Reusable canvas tote bag for daily shopping.
Variants:
- Natural: 8 in stock
- Black: $7, 3 in stock
- Green: 0 in stock

Insulated Water Bottle / ដបទឹករក្សាកំដៅ
Price: $12
Category: Accessories
Description: Stainless steel bottle that keeps drinks cold or warm.
Variants:
- White / 500ml: 4 in stock
- Green / 500ml: 2 in stock
- Black / 750ml: $15, 1 in stock
- Pink / 500ml: 0 in stock
```

## Telegram Role-Play Test

After migration and seeding, run one bot worker only:

```powershell
python -m app.run_bot
```

Use this conversation:

```text
Customer: Hi, what T-shirts do you have?
Expected: Bot describes Classic T-shirt and mentions only in-stock variants.

Customer: Do you have Red size M?
Expected: Bot says Red / M is unavailable and offers available alternatives.

Customer: Show me a picture.
Expected: Bot sends a real Telegram photo attachment if photo_urls exists.

Customer: Ok I want Blue size M, quantity 2.
Expected: Bot asks for delivery address and payment method if missing.

Customer: My address is Street 2004, Phnom Penh. My name is Hong and phone is 012345678.
Expected: Bot uses Phnom Penh delivery fee.

Customer: COD is fine.
Expected: Bot has enough information to create an order.
```

Expected math:

```text
Classic T-shirt Blue / M
Quantity: 2
Unit price: $8.00
Items total: $16.00
Phnom Penh delivery: $1.50
Grand total: $17.50
Payment: COD
```

Confirm:

- order appears in `/app/leads`, now labeled Orders
- order status is `pending`
- owner notification contains item, variant, quantity, address, payment, total
- stock for Blue / M decreases by 2

## Operational Notes

Run migration:

```powershell
alembic upgrade head
```

Run frontend build:

```powershell
cd frontend
npm run build
```

Run backend compile check:

```powershell
python -m compileall app scripts
```

Run only one Telegram worker for each bot token:

```powershell
python -m app.run_bot
```

If more than one bot worker uses the same token, Telegram returns:

```text
Conflict: terminated by other getUpdates request
```

## Verification Completed

The following checks passed during implementation:

```powershell
python -m compileall app scripts
npm run build
alembic heads
C:\Users\User\anaconda3\python.exe -m pytest tests\backend
```

Current backend test result:

```text
14 passed
```

## Remaining Hardening

The current version is a working vertical slice. Recommended next hardening:

- add frontend tests for Products, Orders, and Delivery Zones
- improve product matching for photo sending by product name and variant name
- add backend cleanup job for expired `conversation_carts`
- add backend CSV export endpoint if server-side export becomes preferred
- add payment status if prepaid payments become real
