# Project architecture

This repository contains three independently deployable concerns:

- `app/` — FastAPI web API and Telegram bot runtime.
- `frontend/` — React dashboard and public marketing site.
- `alembic/` — versioned PostgreSQL schema migrations.

## Backend boundaries

Request handling follows one direction:

```text
api/router -> routers -> services -> repositories -> models/database
```

- `app/api/` composes the public HTTP API. Adding a router is a single change in
  `app/api/router.py`.
- `app/routers/` validates HTTP input and translates service results to HTTP
  responses. Routers should not contain database queries.
- `app/services/` owns business workflows and integrations.
- `app/repositories/` owns database access and tenant scoping.
- `app/models/` and `app/schemas/` contain persistence and transport types.
- `app/channels/` adapts external messaging platforms.
- `app/jobs/` contains scheduled/background entry points.

Cross-tenant access must remain explicit. Tenant-owned reads and writes belong
in a repository bound to `business_id`.

## Frontend boundaries

```text
src/
  api/          HTTP client and endpoint adapters
  components/   reusable application UI
  config/       navigation and stable product configuration
  context/      application-wide React state
  pages/        route-level screens grouped by product area
  utils/        framework-independent formatting helpers
```

Rules for new frontend work:

1. Route-level data loading stays in `pages/`.
2. Reusable visual primitives stay in `components/` and receive data via props.
3. Stable route/navigation definitions stay in `config/`.
4. Network calls go through `api/client.js`; components do not call `fetch`
   directly.
5. Feature folders such as `pages/onboarding`, `pages/settings`, and
   `pages/landing` may contain components used only by that feature.
6. Shared colors and spacing come from the Tailwind theme in `index.css`; avoid
   one-off inline colors in product pages.

## Change checklist

Before merging a change:

```powershell
cd frontend
npm run lint
npm run build
```

For database changes, add an Alembic revision and run `alembic upgrade head`.
Never edit an already-deployed migration to change current schema behavior.
