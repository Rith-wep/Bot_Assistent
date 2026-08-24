# Supabase Authentication and Database Security Audit

## Executive verdict

The implementation is functionally suitable for local development, but it is **not approved for production** in its current state.

The identity-to-tenant design is solid, JWT verification is substantially correct, and direct database access is restricted by Row Level Security (RLS). However, authorization, abuse prevention, session revocation, recovery workflows, security headers, and automated verification require additional hardening.

This audit is read-only. It documents findings and recommended remediation; it does not modify application behavior.

## Scope reviewed

- Supabase Auth signup and signin
- JWT/JWKS validation in FastAPI
- Supabase identity-to-local-user mapping
- Tenant and business provisioning
- Internal administrator authorization
- Browser session lifecycle
- Password recovery
- API authentication behavior
- Supabase PostgreSQL and RLS
- Alembic migrations
- Account deletion and revocation
- Abuse prevention
- Security headers and observability
- Automated security testing

## Critical production blockers

### 1. Email confirmation is disabled while admin access is email-based

Current behavior:

- An email/password signup immediately receives a valid session when confirmation is disabled.
- Bootstrap automatically creates a business and owner profile.
- Internal administration is authorized by comparing `public.users.email` with `ADMIN_EMAILS`.

Evidence:

- `app/core/deps.py`, `get_current_admin_user()`
- `app/routers/auth.py`, `bootstrap()`

Risk:

If an address in `ADMIN_EMAILS` is not already registered, or its Supabase Auth user is deleted, another person may register that address while confirmation is disabled and obtain internal administrator access.

Required remediation:

1. Re-enable email confirmation before any public deployment.
2. Replace `ADMIN_EMAILS` with an immutable Supabase UUID allowlist, such as `ADMIN_SUPABASE_USER_IDS`.
3. Prefer a controlled database permission or internal-admin role rather than email authorization.
4. Require a verified email before first-time business provisioning.

### 2. Admin authorization relies on a stale local email

FastAPI maps requests through the immutable Supabase UUID, but internal administrator access is checked against the email stored in `public.users`.

If an administrator changes their Supabase email, the local email is not synchronized. The account can retain administrator access because the old email remains stored and allowlisted.

Evidence:

- `app/core/deps.py`, lines implementing `ADMIN_EMAILS`

Required remediation:

- Authorize internal administrators by immutable Supabase UUID.
- If emails are displayed or used for communication, synchronize them independently without using them as the authorization identity.

### 3. The RLS downgrade is fail-open

The RLS migration enables RLS during upgrade but disables it during downgrade. Supabase granted broad privileges to the `anon` and `authenticated` roles when the tables were created.

Evidence:

- `alembic/versions/c4a92e7f105b_enable_rls_on_application_tables.py`

Risk:

Downgrading the migration can expose application tables through the Supabase Data API.

Required remediation:

1. Prevent an ordinary downgrade from disabling RLS.
2. Require an explicit, separately reviewed security migration for any RLS removal.
3. Revoke application-table and sequence privileges from `anon` and `authenticated`, because this architecture does not use the Data API for application data.

## High-severity findings

### 4. Deleted or banned Supabase users can retain temporary access

FastAPI validates JWT signature and expiration locally, then confirms only that the corresponding `public.users` row exists.

It does not verify on every request whether the Supabase Auth user was deleted, banned, or signed out. A previously issued access token may remain usable until it expires.

Evidence:

- `app/core/security.py`, `decode_supabase_access_token()`
- `app/core/deps.py`, `get_current_user()`

Required remediation:

- Add a Supabase Auth deletion webhook that disables or deletes the local profile.
- Add `status` or `disabled_at` to the local user model and check it on every request.
- Perform an online Auth user/session check for highly sensitive operations.
- Keep access-token lifetime short.

### 5. No CAPTCHA or application-level abuse protection

Signup invokes Supabase Auth directly, and every authenticated identity can invoke bootstrap to create a business.

Evidence:

- `frontend/src/pages/SignUp.jsx`
- `app/routers/auth.py`, `bootstrap()`

Risks:

- Automated signup
- Tenant and database spam
- Email quota exhaustion
- Password-reset abuse
- Resource exhaustion

Required remediation:

- Add Turnstile or hCaptcha to signup and password recovery.
- Pass the CAPTCHA token to Supabase Auth.
- Rate-limit `/api/auth/bootstrap` by IP and Supabase UUID.
- Add request-size limits.
- Monitor abnormal tenant creation.

### 6. Browser tokens lack XSS hardening

The Supabase browser client persists its session in browser storage. A successful cross-site scripting attack could steal access or refresh tokens.

No Content Security Policy or dedicated security-header middleware was found.

Evidence:

- `frontend/src/lib/supabase.js`
- `app/main.py`

Required remediation:

- Add a strict Content Security Policy.
- Add `X-Content-Type-Options: nosniff`.
- Add an appropriate `Referrer-Policy`.
- Add `Permissions-Policy`.
- Add HSTS in production.
- Avoid unsafe inline scripts and unsafe HTML rendering.
- Review every place that renders AI-generated or user-generated content.

### 7. Mutable signup metadata drives tenant creation

When no explicit bootstrap body is available, the business name and type are read from Supabase `user_metadata`.

Evidence:

- `app/routers/auth.py`, metadata handling in `bootstrap()`

This currently does not grant cross-tenant access, but `user_metadata` is controlled by the user and must not be treated as trusted authorization data.

Required remediation:

- Treat metadata only as temporary form recovery data.
- Validate it strictly.
- Require verified email before provisioning.
- Consider storing pending signup details server-side.
- Never derive roles, plans, administrator status, entitlements, or `business_id` from user metadata.

## Medium-severity findings

### 8. Authentication failures are swallowed

All JWT exceptions are converted into the same `401` without structured internal logging.

Evidence:

- `app/core/deps.py`, `get_supabase_identity()`

This previously made the local JWKS network failure difficult to diagnose.

Required remediation:

- Log only the safe exception class and reason.
- Never log access tokens.
- Internally distinguish token expiration, invalid signature, wrong issuer, wrong audience, JWKS failure, and configuration failure.
- Continue returning a generic `401` response to clients.

### 9. Any API `401` forces a global logout

Every authenticated API request that returns `401` emits a global logout event.

Evidence:

- `frontend/src/api/client.js`

A temporary JWKS outage or backend configuration problem can destroy an otherwise valid browser session.

Required remediation:

1. Attempt one controlled session refresh.
2. Retry the API request once.
3. Sign out only when refreshed authentication also fails.
4. Use `403` for authorization failures and never treat it as an expired session.

### 10. Cross-tab and external Auth events are incomplete

The Auth state listener handles `SIGNED_OUT` and `TOKEN_REFRESHED`, but it does not fully process `SIGNED_IN`, `USER_UPDATED`, `PASSWORD_RECOVERY`, and other relevant events.

Evidence:

- `frontend/src/context/AuthContext.jsx`

Consequences:

- Signin from another tab may not initialize the local profile.
- Email changes may not update application state.
- Password recovery is not represented as a distinct security state.

Required remediation:

- Explicitly handle all relevant Supabase Auth events.
- Serialize bootstrap calls to avoid races.
- Refresh the local profile when the Supabase identity changes.

### 11. Password-reset page does not require recovery state

Any visitor can open `/app/reset-password`. The page calls `updateUser()` without checking that the session came from a password-recovery flow.

Evidence:

- `frontend/src/AppShell.jsx`
- `frontend/src/pages/ResetPassword.jsx`

Supabase prevents unauthenticated password changes, so this is not a direct account takeover. However, any normally signed-in user can use this page as a password-change route without reauthentication.

Required remediation:

- Track the `PASSWORD_RECOVERY` event.
- Render the reset page only during a valid recovery session.
- Require current-password verification or reauthentication for ordinary password changes.

### 12. Onboarding routing fails open

If `/onboarding/status` fails, the frontend stores `null`. Only the exact value `false` triggers onboarding, so a status error may route the user into the main application.

Evidence:

- `frontend/src/AppShell.jsx`

Required remediation:

- Use explicit states: `loading`, `required`, `complete`, and `error`.
- Do not interpret a failed status request as completed onboarding.

### 13. Account deletion leaves orphaned application data

Deleting an identity from `auth.users` does not remove or disable:

- `public.users`
- Businesses
- Conversations
- Leads
- Knowledge
- Telegram configuration

There is intentionally no foreign key from `public.users` to `auth.users`.

Required remediation:

- Define formal retention requirements.
- Add a deletion webhook or scheduled reconciliation.
- Soft-delete tenants before final removal.
- Purge data through an audited and delayed deletion workflow.

### 14. Supabase configuration fails late

Supabase settings are optional at startup. A missing `SUPABASE_URL` causes failures only when a protected endpoint is called.

Evidence:

- `app/core/config.py`

Required remediation:

- Make Supabase configuration mandatory in staging and production.
- Fail startup with a clear configuration error.
- Add a readiness check that verifies database and JWKS availability without exposing secrets.

### 15. OpenAPI authentication metadata is stale

`OAuth2PasswordBearer` still references `/api/auth/signin`, but that backend endpoint no longer exists.

Evidence:

- `app/core/deps.py`

Required remediation:

- Update the OpenAPI security scheme for externally issued Supabase bearer tokens.
- Document how a developer obtains a valid token for API testing.

## Workflow assessment

### Signup workflow

```text
Signup form
  -> Supabase Auth signUp
  -> Supabase session
  -> POST /api/auth/bootstrap
  -> verify JWT
  -> create business and local owner transactionally
  -> onboarding
```

Strengths:

- Password handling is delegated to Supabase.
- Business and local-user creation occur in one database transaction.
- Supabase UUID is the idempotency boundary.
- Legacy accounts are not linked automatically by email.

Weaknesses:

- Confirmation is currently disabled for development.
- CAPTCHA and rate limiting are absent.
- Metadata is used as a provisioning fallback.
- Auth identity and application profile can become separated.

### Signin workflow

```text
Signin form
  -> Supabase Auth signInWithPassword
  -> session returned
  -> POST /api/auth/bootstrap
  -> existing local profile returned
  -> onboarding status
  -> dashboard
```

Strengths:

- FastAPI does not receive passwords.
- The backend independently verifies the JWT.
- The tenant comes from the local database, not JWT metadata.

Weaknesses:

- Bootstrap is invoked on every session restoration.
- A temporary bootstrap failure can cause logout.
- Authentication and infrastructure failures are not distinguishable in the UI.

### Protected API workflow

```text
Supabase session
  -> Bearer access token
  -> JWKS signature verification
  -> issuer/audience/expiration validation
  -> lookup public.users by Supabase UUID
  -> derive business_id
  -> tenant-scoped repository
```

This is the strongest part of the implementation. Tenant identity is not accepted from the browser or editable JWT metadata.

### Password recovery workflow

```text
Forgot-password form
  -> Supabase reset email
  -> redirect to /app/reset-password
  -> updateUser(password)
```

Weaknesses:

- Recovery state is not explicitly tracked.
- The reset page is not restricted to a recovery event.
- Rate limiting and CAPTCHA are absent.

## Missing automated verification

No automated authentication or security tests were found.

Minimum required tests:

- Valid JWT acceptance
- Invalid signature rejection
- Wrong issuer rejection
- Wrong audience rejection
- Expired JWT rejection
- JWKS outage behavior
- Concurrent bootstrap requests
- Duplicate email and UUID conflicts
- Cross-tenant access attempts
- Administrator authorization by immutable UUID
- Disabled and deleted-user behavior
- RLS enabled on every application table
- Direct `anon` and `authenticated` access denied
- Signup confirmation flow
- Password recovery-state enforcement
- Refresh-and-retry behavior
- Authentication changes across browser tabs

## Existing strengths

- JWT signature, issuer, audience, and expiration are verified.
- Accepted JWT algorithms are explicitly restricted.
- Tenant identity comes from the local UUID mapping.
- `business_id` is not trusted from the frontend.
- `supabase_user_id` has a unique index.
- Bootstrap is transactional and mostly idempotent.
- Legacy users are not linked automatically by email.
- Protected routers consistently use `get_current_user`.
- RLS is enabled on all 11 application tables.
- No service-role key is exposed to the frontend.
- Backend and frontend publishable keys match.
- The npm dependency audit reported zero known vulnerabilities.
- No mock data was inserted during migration.

## Required remediation order

1. Re-enable email confirmation.
2. Replace email-based admin authorization with immutable UUID authorization.
3. Add CAPTCHA and rate limiting.
4. Harden the RLS migration and revoke direct Data API privileges.
5. Add local-user disabling and Supabase Auth deletion synchronization.
6. Add CSP and production security headers.
7. Enforce password-recovery state and complete Auth event handling.
8. Replace immediate logout on `401` with refresh-and-retry.
9. Add structured authentication logging and readiness checks.
10. Add automated authentication, RLS, and tenant-isolation tests.

## Final rating

| Area | Rating |
|---|---|
| Identity verification | Good |
| Tenant isolation design | Good |
| Database exposure control | Acceptable; downgrade unsafe |
| Administrator authorization | Unsafe for production |
| Abuse resistance | Weak |
| Session lifecycle | Incomplete |
| Account lifecycle | Incomplete |
| Recovery workflow | Incomplete |
| Observability | Weak |
| Automated verification | Missing |
| Production readiness | Not approved |

## Production approval criteria

Production approval should be withheld until all critical findings and high-severity findings have been resolved and covered by automated tests. Medium-severity findings affecting session recovery, operational visibility, and lifecycle management should also be addressed before onboarding external customers.
