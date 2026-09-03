# Project Summary

## Product

This project is a multi-tenant AI customer assistant for small businesses. It gives each business a Telegram-based assistant that can answer customer questions from business knowledge, collect leads, notify owners/admins, and support human handoff when the AI is unsure.

The app has two main parts:

- FastAPI backend in `app/`
- React/Vite/Tailwind frontend in `frontend/`

The backend remains the source of truth for authentication, onboarding progress, bot connection state, knowledge data, and go-live readiness.

## Core Features

- Multi-business SaaS structure with data scoped by `business_id`
- Owner authentication and protected dashboard routes
- Guided onboarding wizard
- Business profile and assistant setup
- Knowledge management for location, hours, services, FAQs, policies, and custom items
- Telegram bot token validation and connection
- Owner Telegram linking through `/start` or `/myid`
- Preview chat before going live
- Dashboard, conversations, leads, settings, admins, and notification controls

## Onboarding Flow

The onboarding wizard has four steps:

1. Business setup
2. Knowledge setup
3. Telegram bot connection
4. Test and go live

Each step is backed by API endpoints under `/api/onboarding`. The frontend now uses the updated onboarding status returned by each save/continue request instead of always making an extra `/onboarding/status` request.

## Recent UI Improvements

The onboarding UI was cleaned up for mobile and desktop consistency:

- Removed sticky bottom action bars so buttons no longer float over page content.
- Applied the normal action bar style across Step 2, Step 3, and Step 4.
- Improved the mobile stepper so all four steps fit on-screen.
- Removed numeric prefixes from stepper labels.
- Removed horizontal stepper scrolling and the visible scroll line.
- Replaced problematic mobile native dropdowns with in-page option buttons for:
  - Step 1 customer language
  - Step 2 assistant personality
- Added the full Assistant Preview card to Step 1 mobile.
- Improved Step 2 product/service rows so long names and prices wrap better on mobile.
- Adjusted Step 3 mobile actions so Back and Continue sit on one row, with Skip for now on its own row.

## Recent Loading Improvements

Onboarding now uses skeleton loading states instead of plain `Loading...` text:

- Initial onboarding shell loading
- Step 2 knowledge loading
- Step 3 Telegram status loading
- Step 4 checklist loading

This keeps the page visually stable while data is being fetched.

## Recent Performance Improvements

A lightweight frontend cache was added inside the onboarding parent component.

Cached during the current browser session:

- Step 2 knowledge items, templates, and AI profile
- Step 3 Telegram status
- Step 4 checklist

This improves Back/Continue navigation because steps no longer refetch the same data every time they remount. The cache is invalidated when related data changes:

- Knowledge changes clear the Step 4 checklist cache.
- Telegram connection changes clear the Step 4 checklist cache.

Important: this cache is only a UI optimization. The backend still decides real onboarding progress and completion.

## Draft Persistence

Session storage is used only for unsaved drafts, not for trusted completion state.

Drafts saved in `sessionStorage`:

- Step 1 business name
- Step 1 business type
- Step 1 default language
- Step 2 assistant profile draft

After Step 1 is saved successfully, its draft keys are cleared.

## Files Changed Recently

- `frontend/src/components/Stepper.jsx`
- `frontend/src/pages/onboarding/Onboarding.jsx`
- `frontend/src/pages/onboarding/Step1Basics.jsx`
- `frontend/src/pages/onboarding/Step2Knowledge.jsx`
- `frontend/src/pages/onboarding/Step3Telegram.jsx`
- `frontend/src/pages/onboarding/Step4GoLive.jsx`
- `frontend/src/hooks/useSessionStorageState.js`

## Verification

The frontend build was run after the changes:

```bash
npm run build
```

The build passed successfully.

## Production Notes

The current approach is production-safe because:

- Backend remains the source of truth.
- Client cache is temporary and scoped to UI responsiveness.
- Completion state is not trusted from `sessionStorage`.
- Save/continue buttons still wait for successful API responses before advancing.
- API mutation responses are used directly to avoid unnecessary status reloads.

## Commerce Mini App Plan

The selected commerce direction is Option B: keep the Telegram bot for conversation, and add a Telegram Mini App for catalog browsing, cart, and checkout.

Architecture target:

```text
Dashboard / Telegram Bot / Mini App / Website
                    |
             Commerce API
                    |
       Products, Variants, Orders
                    |
          PostgreSQL + Business Tenant
```

Phase 1 has started with commerce schema hardening:

- Product variants now carry `business_id` for explicit tenant ownership.
- Products and variants have `created_at` and `updated_at`.
- Orders now have a public `order_number`.
- Orders now track `channel` and `external_customer_id` for future Telegram/Facebook/website customers.
- Orders now track `payment_status`, `updated_at`, `cancelled_at`, and `cancellation_reason`.
- New `order_items` table stores product, variant, price, quantity, and line-total snapshots.
- New orders still validate price, stock, product ownership, and totals server-side.

Phase 2 has started with dashboard catalog management polish:

- Product management now has search.
- Product management now has category and status filters.
- Product create/update now updates the local product list from the API response instead of forcing a full refetch.
- Variant editing now has a mobile card layout instead of requiring a wide horizontal table.
- Desktop variant editing keeps the existing table layout.
- Order management now displays public order numbers.
- Order details now show channel identity and payment status.
- Orders can be cancelled with an optional cancellation reason.
- Order CSV export now includes order numbers, payment status, cancellation timestamp, and cancellation reason.

Phase 3 has started with commerce service/API cleanup:

- Added Mini-App-ready catalog response schemas.
- Added reusable service helpers for customer-facing catalog payloads.
- Added an authenticated owner catalog preview endpoint at `/api/commerce/catalog-preview`.
- Product variant reads now use explicit `ProductVariant.business_id` tenant scoping.
- Product serialization now uses tenant-scoped repository helpers instead of ad hoc variant queries.

Phase 4 has started with Telegram Mini App auth:

- Added Telegram Mini App `initData` signature verification.
- Added normalized Telegram Mini App identity output.
- Added public verification endpoint at `/api/mini/telegram/verify/{business_id}`.
- Verification uses the business's connected Telegram bot token, decrypted server-side.
- Added tests for valid Mini App signatures and tampering rejection.

Phase 5 has started with Mini App catalog APIs:

- Added verified customer catalog endpoint at `/api/mini/catalog/{business_id}`.
- Added verified product detail endpoint at `/api/mini/catalog/{business_id}/products/{product_id}`.
- Mini App catalog requests use POST bodies so Telegram `initData` is not passed in query strings.
- Catalog responses include the verified Telegram customer identity plus active product/variant data.
- Product detail returns only active tenant-scoped catalog products.

Phase 6 has started with Mini App catalog UI:

- Added customer-facing route `/mini/shop/:businessId`.
- Mini App route is outside `/app`, so it does not require dashboard auth or render dashboard chrome.
- The UI reads `window.Telegram.WebApp.initData` and calls verified Mini App catalog APIs.
- Added mobile-first catalog grid with product images, stock state, prices, search, and category filters.
- Added product detail view with image, description, variant selection, and an Add to cart button placeholder.
- Added skeleton loading and Telegram-only error state for opening outside Telegram.

Phase 7 has started with Mini App frontend cart:

- Added in-memory cart state to the Mini App shop.
- Product detail now supports quantity selection.
- Add to cart now adds selected product/variant/quantity to the cart.
- Catalog header now shows a cart count badge.
- Added cart drawer with item list, photos, variants, quantity controls, remove action, and subtotal.
- Checkout button is present as the next integration point for order creation.

Phase 8 has started with Mini App checkout and order creation:

- Added Mini App checkout request/response schemas.
- Added verified checkout endpoint at `/api/mini/checkout/{business_id}`.
- Checkout verifies Telegram `initData` before trusting the customer identity.
- Checkout creates or reuses the Telegram customer conversation so orders link back to the inbox.
- Mini App orders can create multiple orders for the same Telegram customer conversation.
- Backend revalidates products, variants, stock, prices, delivery, tenant ownership, and totals before saving.
- Successful checkout returns the saved order with the public order number.
- Mini App UI now has a checkout form for name, phone, delivery address, and payment method.
- Cart is cleared only after the backend creates the order successfully.

Phase 9 has started with Mini App order notifications:

- Mini App checkout now sends a Telegram confirmation message to the customer after the order is saved.
- Mini App checkout now notifies the business owner and connected admins about new orders.
- Owner/admin notification reuses the existing `notify_order` service and business notification settings.
- Notification failures are logged but do not roll back a successfully created order.

Phase 10 has started with dashboard order management polish:

- Order listing API now supports tenant-scoped filters for order status, payment status, channel, and search.
- Search can match order number, customer name, phone, or external customer ID.
- Dashboard Orders page now has search and filter controls above the table.
- Orders table now shows the order source/channel and external customer ID.
- CSV export now respects the active filters and includes source/customer identity columns.
- Existing status workflow remains controlled: pending to confirmed, confirmed to shipped, and cancellable before shipped.

AI reliability Phase 1 has started with typed retail action validation:

- Added a typed schema for hidden retail AI actions.
- Retail classifier output now includes confidence, missing fields, and detected customer language.
- Cart/order side effects are ignored when confidence is below the threshold.
- Confirmed order actions are blocked if required fields are still missing.
- Bot photo/cart handling now ignores malformed AI action payloads safely.
- AI still helps interpret customer intent, but backend validation remains the source of truth for stock, price, tenant ownership, and order creation.

AI reliability Phase 2 has started with cart patch validation:

- AI-suggested cart product IDs are checked against active tenant-owned products before being saved.
- AI-suggested variant IDs must belong to the selected product and current business.
- Invalid product, variant, quantity, and delivery-zone values are ignored instead of breaking the bot flow.
- Delivery zone IDs from AI are checked against the current business before being saved to cart state.
- Final order creation still performs the full stock, price, tenant, and delivery validation again.

AI reliability Phase 3 has started with chat order confirmation:

- Chat-based retail orders now require a complete cart before order creation.
- Complete carts trigger a clear confirmation summary instead of immediately creating an order.
- The bot creates the order only after the customer confirms the summarized order.
- Confirmation-only replies such as yes/confirm can complete the order when a cart is awaiting confirmation.
- Delivery zone is optional for chat orders when no delivery zones are configured or discussed.

Good future improvements:

- Add TanStack Query if frontend data fetching grows more complex.
- Add automated mobile viewport tests for onboarding.
- Add backend tests for onboarding step idempotency.
- Return updated checklist data from knowledge and Telegram mutations if the UI needs even fewer requests later.
