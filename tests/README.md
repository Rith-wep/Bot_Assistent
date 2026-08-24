# Tests

Backend tests belong in `tests/backend/`; frontend tests belong in
`tests/frontend/` or beside the relevant frontend feature when component-local
tests are more useful.

Tests should cover tenant isolation, authentication, API contracts, and the
Telegram message flow before larger refactors are introduced.
