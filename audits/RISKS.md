# BiatecScan Web — Risk Registry

This file is a **live snapshot** of the current risk state. It is updated on every audit
(see [AUDITS-INSTRUCTIONS.md](AUDITS-INSTRUCTIONS.md) Section 6). Historical detail for
each finding lives in the dated audit report that raised it — this table just tracks
current status. Rows are never deleted, only closed.

Last updated: 2026-07-20, by AUDIT-2026-07-20-sonnet-5 (fixes applied same day).

| ID | Title | Severity | Status | Raised in | Closed in |
|---|---|---|---|---|---|
| AUDIT-2026-07-20-01 | No HTTP security headers (CSP / X-Frame-Options / etc.) | Medium | Mitigated | [2026-07-20](AUDIT-2026-07-20-sonnet-5.md) | 2026-07-20, same report |
| AUDIT-2026-07-20-02 | SignalR connection sends credentials (`withCredentials: true`) without a stated need | Low | Mitigated | [2026-07-20](AUDIT-2026-07-20-sonnet-5.md) | 2026-07-20, same report |
| AUDIT-2026-07-20-03 | Session-derived ARC-14 signing key reconstructible from `localStorage`; undocumented sensitivity | Low | Mitigated | [2026-07-20](AUDIT-2026-07-20-sonnet-5.md) | 2026-07-20, same report |
| AUDIT-2026-07-20-04 | Pervasive `console.log`/`console.warn` in production | Informational | Mitigated | [2026-07-20](AUDIT-2026-07-20-sonnet-5.md) | 2026-07-20, same report |
| AUDIT-2026-07-20-05 | `VITE_ENABLE_VERBOSE_LOGGING` documented but unused (dead config) | Informational | Mitigated | [2026-07-20](AUDIT-2026-07-20-sonnet-5.md) | 2026-07-20, same report |

Fix details (applied and re-verified — typecheck, lint, and production build all pass):
- **01:** Added `Content-Security-Policy`, `X-Content-Type-Options`, `X-Frame-Options`,
  `Referrer-Policy` headers in [docker/default.conf](../docker/default.conf) (nginx) and
  [vercel.json](../vercel.json).
- **02:** Set `withCredentials: false` in [src/services/signalrService.ts](../src/services/signalrService.ts).
- **03:** Added an explicit sensitivity comment above the session-id code in
  [src/services/authService.ts](../src/services/authService.ts).
- **04/05:** Added [src/utils/logger.ts](../src/utils/logger.ts) (`debugLog`, gated by
  `VITE_ENABLE_VERBOSE_LOGGING`) and switched `signalrService.ts`'s informational
  `console.log` calls to it; `console.error`/`console.warn` for genuine failures were left
  as-is.

## Status legend

- **Open** — confirmed risk, not yet addressed.
- **Mitigated** — a fix has been applied and re-verified against the current code.
- **Accepted** — risk acknowledged but intentionally not fixed; justification recorded in
  the audit report that accepted it.
- **Closed** — no longer applicable (e.g. the affected feature was removed).

## Standing risk model (context for future auditors)

BiatecScan Web is a **read-only explorer**: it never accepts a user's mnemonic/private
key, never constructs or submits user-signed transactions, and has no wallet-connect
integration. The only key material that exists anywhere in the app is a throwaway,
non-monetary Algorand keypair deterministically derived from a random per-browser session
ID (`arc76` + `arc14` in [src/services/authService.ts](../src/services/authService.ts)),
used only to authenticate read API calls to Biatec's own backend. **If this application
ever adds wallet-connect, transaction-signing, or mnemonic-import functionality, this risk
model changes fundamentally and the next audit must treat that surface as the top
priority**, re-running the full Section 3.A checklist against it in depth.
