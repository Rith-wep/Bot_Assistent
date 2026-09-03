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

Good future improvements:

- Add TanStack Query if frontend data fetching grows more complex.
- Add automated mobile viewport tests for onboarding.
- Add backend tests for onboarding step idempotency.
- Return updated checklist data from knowledge and Telegram mutations if the UI needs even fewer requests later.
