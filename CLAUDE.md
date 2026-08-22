# Khmer AI Customer Assistant — SaaS Platform (v2)

## What this project is

The multi-tenant SaaS evolution of an original single-tenant product: an AI
customer assistant (Telegram bot) for small businesses in Cambodia. The legacy
source has been retired from this repository. The current system serves MANY businesses:
each business signs up on a web dashboard, registers its own information through
an onboarding wizard, connects its own Telegram bot, and manages everything
self-service — its AI assistant, its leads, its conversations, its settings.

The current code preserves the proven bot behavior (Khmer replies, lead capture,
human handoff, memory, error handling, and logging) in a multi-tenant engine with
a self-service web platform.

## Current implementation status

Core build steps 1-7 are implemented. Weekly Intelligence parts 1-5 and the
AI-assisted knowledge import are also implemented. The internal admin page is a
read-only business list with status, plan, open-gap count, and last-summary time;
mark-paid and pause-account actions are not implemented. Dashboard headline
metrics and chart data remain partly mocked. Railway deployment is not yet
configured. Facebook Messenger and payment-gateway integration remain out of
scope.

## The golden rule: tenant isolation

Every piece of data belongs to exactly one business (tenant). Every database
table that holds tenant data MUST have a business_id column, and EVERY query
MUST filter by business_id — enforced by construction (helper functions /
repository layer that require business_id), never left to habit. Business A
must never, under any circumstance, see Business B's leads, conversations,
knowledge, or settings. Any code path that touches tenant data without a
business_id scope is a bug, even if it "works."

## Tech stack

- **Language:** Python 3.11+
- **Web framework:** FastAPI
- **Frontend:** React (single-page dashboard) talking to the FastAPI backend.
  Keep it simple: one SPA, no SSR framework. Built with Vite. Styling is
  Tailwind CSS (v4, via the `@tailwindcss/vite` plugin) — utility classes
  only, no separate component/design-system library beyond the shared
  components in `frontend/src/components/`. Follow the design system below
  on every page, present and future.
- **Database:** PostgreSQL (on Railway). SQLAlchemy ORM + Alembic migrations.
- **Bot framework:** python-telegram-bot (async), running MULTIPLE bots
  (one per business) from one process.
- **AI:** provider-agnostic module (currently Groq API; must be swappable to
  Claude/other by config). All AI logic stays isolated in one module.
- **Auth:** email + password with secure hashing (bcrypt/argon2), session or
  JWT — pick the simplest secure standard. Google OAuth is a later add-on.
- **Hosting:** Railway (web service + Postgres). No Docker orchestration, no
  microservices, no message queues. Monolith until pain proves otherwise.

## Database schema (initial)

All tenant-owned tables include business_id (FK, indexed, part of uniqueness
where relevant).

- **businesses**: id, name, business_type (clinic/shop/real_estate/other),
  default_language, plan (trial/basic/standard/premium), status
  (active/paused/cancelled), created_at
- **users**: id, business_id, email (unique), password_hash, role (owner/staff),
  created_at
- **bot_configs**: id, business_id (unique — one bot per business in v2),
  telegram_bot_token (encrypted at rest), owner_chat_id, bot_username,
  is_active, last_started_at
- **knowledge_items**: id, business_id, category (service/faq/hours/location/
  policy/other), title, content_km, content_en, price (nullable), sort_order,
  updated_at  — replaces v1's business_info.md with structured rows
- **conversations**: id, business_id, customer_chat_id, customer_name
  (nullable), started_at, last_message_at, handed_off (bool)
- **messages**: id, conversation_id, business_id, direction (customer/bot),
  text, created_at
- **leads**: id, business_id, conversation_id, customer_name, phone, interest,
  created_at, notified_owner (bool)

Composite indexes on (business_id, created_at) style lookups. Bot tokens are
secrets: encrypt at rest, never log them, never return them fully via API
(mask like `12345***`).

## The bot engine (refactor of v1)

- On startup, load all active bot_configs and run each business's Telegram bot
  from the single process. Support adding/removing/restarting a bot at runtime
  when a business connects or pauses (no full redeploy to onboard a client).
- When a message arrives on any bot: resolve which business owns that bot →
  load that business's knowledge_items and settings → assemble the system
  prompt (same proven v1 rules: polite Khmer with correct honorifics, mirror
  the customer's language, understand Latin-letter Khmer, never invent answers,
  short mobile-friendly replies) → include that conversation's recent history →
  answer → persist conversation + message rows.
- Lead capture, human handoff, owner notification, and error handling behave
  exactly as proven in v1, but read/write the database and are scoped by
  business_id.
- Rate-limit and error behavior per v1: never crash, polite apology in the
  customer's language, retry with backoff, log errors with business_id context.

## Weekly Intelligence (unanswered-question insights)

A feature layered on top of the core platform (build it after the core
build order below is stable, using its own build order at the end of this
section). It turns the "could not answer" signal the engine already
produces for handoff into a feedback loop that helps owners close knowledge
gaps, plus a weekly digest so they don't have to check the dashboard to
know how the week went.

**Flow:** engine detects a gap (existing classifier signal, same one behind
the unanswered-streak/handoff logic) → captured as a row → a nightly job
clusters that business's open gaps into human-readable topics → the
dashboard surfaces the topics as one-click-fixable cards → a weekly
Telegram message summarizes the week and flags any open gaps.

### Schema additions

- **unanswered_questions**: id, business_id, conversation_id, question_text,
  created_at, status (open/resolved/dismissed), cluster_id (nullable FK to
  question_clusters, added once that table exists in part 2). Store ONLY
  the question text — no other customer data duplicated into this table.
- **question_clusters**: id, business_id, label_en, label_km, question_count,
  sample_questions (up to 3, JSONB array), first_seen, last_seen, status
  (open/resolved/dismissed).
- **businesses.last_summary_sent**: nullable datetime — records the ISO week
  (Monday 00:00 ICT) the weekly summary was last sent for, so the job can
  never double-send for the same week.

### Nightly clustering job

- Runs once per business per night: fetch that business's `open`
  unanswered_questions, ask the AI module (the same provider-agnostic
  module used for replies/classification — no new AI dependency) to group
  semantically similar ones and produce a short bilingual label per group.
  Batch several questions into one AI call rather than one call per
  question — this has to stay cheap at scale.
- Re-running must merge into existing open clusters for that business, not
  create duplicates.
- One business's failure (bad AI response, DB error) is caught, logged with
  business_id, and must not stop the job for other businesses — same
  isolation rule as the bot engine.

### Weekly summary job

- Runs Monday 8:00 AM Asia/Phnom_Penh (ICT), once per active business:
  Telegram message to the owner, in the business's default_language, with
  last week's conversations/messages, after-hours messages, new leads, and
  handoffs counts — and, if open clusters exist, the count plus the top 1-2
  cluster labels and a link to the dashboard Gaps page. Short, warm,
  mobile-friendly, emoji-light; send a shorter, gentler version if the
  business had zero activity that week.
- Guarded by `businesses.last_summary_sent`: skip any business already sent
  for the current ISO week. Must be safe to re-run/retry.

### Scheduling convention

No new infrastructure. Both jobs are plain CLI entry points
(`python -m app.jobs.cluster_unanswered`, `python -m app.jobs.weekly_summary`)
that process every eligible business in one run — same shape as
`python -m app.run_bot`. In production, Railway's built-in Cron Job
schedule triggers them; that's a scheduled invocation of the existing
monolith, not a queue or a new service. Locally, running the same command
by hand IS the test path (and doubles as the "manual trigger" needed for
testing part 4) — there is no separate test mode; jobs are idempotent so
running them twice is always safe.

### Dashboard "Gaps" card + page

- Dashboard card: "Customers asked about things you have no answer for" —
  top open clusters (label — asked N times). Empty state: "No gaps — your
  assistant answered everything it was asked. 🎉" via the shared
  `EmptyState` component, not bare text.
- Clicking a cluster opens the fix flow: sample questions plus a knowledge
  item form pre-filled from the cluster (category guessed, title = the
  cluster label, Khmer/English content left blank for the owner to write).
  Save → creates the knowledge item, marks the cluster and its questions
  resolved. Dismiss ("not relevant to my business") → marks the cluster and
  its questions dismissed, no knowledge item created.
- Resolved clusters show briefly as "Fixed ✓" (accent styling per the design
  system below) before dropping off the list — the owner should feel the
  progress.

### Internal admin visibility

- Per business, the internal admin page (see Web app pages below) adds:
  open cluster count and last summary sent time. Build only the minimum
  needed for that page to exist (list businesses + these two fields) rather
  than its full eventual scope, unless the full page is separately
  requested. This minimum read-only page is now implemented.

### Build order for this feature (separate from the core build order —
### stop for confirmation after each part, same rule as below)

1. **Capture** — unanswered_questions table + engine hook that records
   every "could not answer" moment.
2. **Nightly clustering job.**
3. **Dashboard Gaps card + page** (fix flow, dismiss).
4. **Weekly summary job** (+ manual trigger command for testing).
5. **Admin visibility.**

Test plan required per part: unanswered capture correctness (ask multiple
phrasings of one question, verify rows), clustering (variations form ONE
cluster with a sensible bilingual label, re-running merges rather than
duplicating), the one-click fix (creates knowledge, bot answers correctly
afterward, cluster resolves), dismissal, the weekly summary (manual trigger,
no double-send for the same week), and tenant isolation (business A must
never see business B's clusters or questions).

## AI-assisted knowledge import ("Quick add with AI")

An alternative to the manual knowledge_items form: the owner pastes raw
unstructured text (a price list, Facebook About text, a menu, rough notes —
Khmer, English, or mixed) and the AI module turns it into draft knowledge
items for review, instead of the owner retyping everything by hand.

**Flow:** owner pastes text into a large textarea and hits Analyze → backend
sends it to the same provider-agnostic AI module (no new AI dependency) with
an extraction prompt → returns a list of draft items → owner reviews them as
editable cards, edits or deletes any, then "Add all" / "Add selected" →
only then are they persisted as real knowledge_items. Nothing is saved
until the owner confirms — same "never surprise the owner" principle as the
Gaps fix flow.

- **Endpoint:** `POST /api/knowledge/ai-extract`, tenant-scoped like every
  other knowledge endpoint (business_id from the authenticated user).
  Input capped (8000 chars), output capped (40 items), rate-limited
  per-business (in-process sliding window, same pattern as the demo
  endpoint's IP-keyed limiter — no new infra).
- **Extraction:** category (service/faq/hours/location/policy/other), title,
  price (normalized, e.g. `$15` or `$20 - $40`), content_en, content_km.
  Never invent a service, price, hours, or location not present in the
  source text — if hours/location aren't mentioned, no such item is
  produced. When the source only covers one language for an item, the
  other language is drafted naturally (same polite register as the bot's
  voice) and flagged `content_en_ai_generated` / `content_km_ai_generated`
  so the review UI can show an "AI-drafted" chip. These flags are only
  used in the review step — they are not persisted on knowledge_items.
- **Review UI:** shared `AiQuickAdd` component
  (`frontend/src/components/AiQuickAdd.jsx`), used on both the Knowledge
  page and onboarding step 2 — draft cards with inline-editable fields, a
  checkbox to include/exclude each card, a delete button per card, and
  "AI-drafted" chips on generated translations.
- **Empty-state nudge:** when a business has few/no knowledge items, both
  the Knowledge page and onboarding step 2 present "Add with AI" as the
  primary path (manual form/suggestions as secondary), per the design
  system below.

## Frontend design system — "fresh green on deep slate"

Applies to every page, present and future (Dashboard, Leads, Conversations,
Settings, onboarding wizard). Defined as Tailwind v4 theme tokens in
`frontend/src/index.css` (`@theme` block) — never scatter raw hex values in
components; use the token classes (`bg-base`, `text-accent`, etc.).

**Palette (kept intentionally tight — no new colors without updating this
section):**
- `bg-base` (#1E2130) — dark shell: sidebar, auth pages.
- `bg-surface` (#282C3E) — cards/panels/inputs on the dark shell.
- `bg-page` (#F7F8FA) — neutral application workspace background. Green is
  reserved for actions, status, and emphasis rather than large app surfaces.
- `accent` (#22C55E) / `accent-dark` (#16A34A hover) / `accent-soft`
  (#DCFCE7 tint) — primary buttons, active nav item, prices, key stats.
- `warning` (amber, #F59E0B) and `error` (red, #EF4444) — the only other
  semantic colors. Nothing else.
- `ink` (#111827) / `ink-muted` (#6B7280) — text on light surfaces.
  `shell-text` (near-white) / `shell-text-muted` — text on the dark shell.

**Typography:** headings use `font-heading` (Plus Jakarta Sans — bold,
rounded, distinctive), body text uses `font-sans` (Inter). Both stacks
include Noto Sans Khmer so Khmer content renders correctly everywhere
without a separate Khmer-only style.

**Layout:** dark sidebar (desktop) with the business name/logo top, nav
items with `lucide-react` icons, active item highlighted in green. On
mobile the sidebar becomes a fixed bottom tab bar (icons + tiny labels) —
not a hamburger drawer — since owners primarily use phones. Light content
area with a `PageHeader` (`frontend/src/components/PageHeader.jsx`): big
title + description left, primary green action button right. Cards are
white, `rounded-xl`, subtle border/shadow, consistent padding.

**Shared components** (`frontend/src/components/`) — reuse these rather
than re-styling inline: `Button` (variants: primary/secondary/destructive/
ghost), `CategoryBadge` (colored chips), `PageHeader`, `EmptyState`
(icon + message + CTA, never bare gray text), `Skeleton` (loading
placeholders — no spinners), `Sidebar`, `Layout`, `Modal` /
`ConfirmDialog` (on-brand confirm popup — never the native
`window.confirm`), `AiQuickAdd` (paste-to-draft-knowledge review flow,
see AI-assisted knowledge import above).

**Polish rules:** generous whitespace, consistent spacing scale, every
interactive element has a hover/focus state, transitions are 150–200ms
(`transition-colors duration-150` etc). No gradients-everywhere, no
glassmorphism — distinctiveness comes from the navy+green identity and
the heading font, not visual effects.

## Web app pages

1. **Sign up / Sign in** — creates a business + owner user in one flow.
2. **Onboarding wizard** (must be finishable by a non-technical Cambodian
   business owner, in English first, Khmer UI later):
   - Step 1: business basics (name, type, languages)
   - Step 2: business knowledge — friendly forms to add services with prices,
     opening hours, location, FAQs (in Khmer and/or English)
   - Step 3: connect Telegram — clear instructions with screenshots-style
     guidance: create bot via @BotFather, paste token; capture owner_chat_id
     by having the owner press /myid on their new bot (the engine provides
     this command)
   - Step 4: test screen — a web-based preview chat that exercises the real
     prompt + knowledge so the owner can try their assistant before going live
3. **Dashboard** — conversations today/this week, leads this week, after-hours
   messages handled, handoffs. Simple cards + one chart. Plus the "Gaps" card
   (see Weekly Intelligence above) surfacing clustered unanswered-question
   topics with a one-click fix flow into the knowledge editor.
4. **Leads** — table (name, phone, interest, date), CSV export.
5. **Conversations** — list + read-only transcript view.
6. **Knowledge editor** — CRUD on knowledge_items; changes take effect on the
   next customer message (no restart needed).
7. **Settings** — bot connection status, pause/resume bot, business profile,
   and plan display. Billing remains manual; there is currently no payment
   gateway or admin action for changing payment state.
8. **Internal admin page**: the current read-only implementation lists
   businesses, status, plan, open Weekly Intelligence cluster count, and last
   weekly-summary-sent time. Mark-paid and pause-account actions are future work.

## API design conventions

- REST endpoints under /api, all tenant endpoints derive business_id from the
  authenticated user — NEVER from a client-supplied parameter.
- Validation on all inputs; consistent error responses.
- Auth required on everything except signup, signin, health checks, and the
  rate-limited public demo chat endpoint.

## Build order (strict — one step at a time, test before next)

1. **Database + migration**: schema above and Alembic migrations. The historical
   v1 import utility has been retired along with the legacy source tree.
2. **Engine on DB**: v1 bot logic refactored to read knowledge/config from
   Postgres and write conversations/leads to it. Still ONE business. Verify
   identical behavior to v1 (same test script as v1 steps 3–6).
3. **Multi-bot**: run 2+ bots from one process (test with a second dummy
   BotFather bot + fake business row). Prove tenant isolation with parallel
   conversations.
4. **Auth + knowledge editor**: signup/signin, and the first real UI page —
   editing knowledge_items live.
5. **Leads + conversations pages.**
6. **Onboarding wizard** (including runtime bot attach when a token is added).
7. **Dashboard stats + settings + internal admin page.**
8. **Deployment**: Railway web service + Postgres, env-var config, deployment
   docs for a first-timer.

Do not skip ahead. After each step, give me manual test instructions
(including what to check from my phone in Telegram where relevant).

## Development conventions (carried over from v1)

- Explain new concepts simply — I am learning as we build.
- Small functions, clear names, no over-engineering, no premature abstraction.
- Never crash: log, apologize in the customer's language, keep running.
- Secrets only via environment variables; .env in .gitignore; customer data
  (DB dumps, logs, exports) never committed.
- Log conversations and errors with business_id context.

## What NOT to do in v2

- No payment gateway integration (manual billing flag only).
- No Facebook Messenger yet (design the channel layer so it can be added, but
  build Telegram only).
- No Docker/Kubernetes/microservices/queues.
- No per-tenant databases or schemas — shared schema with business_id is the
  chosen pattern at this stage.
- No feature that a real pilot client hasn't asked for or that isn't listed
  above.
