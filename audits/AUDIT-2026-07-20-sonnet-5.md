# BiatecScan Web Security Audit — 2026-07-20

- **Auditor:** Claude Sonnet 5 (claude-sonnet-5)
- **Scope commit:** bb9b9e6
- **Engagement value:** $20,000 (professional-grade audit per [AUDITS-INSTRUCTIONS.md](AUDITS-INSTRUCTIONS.md))
- **Prior audit:** None (first audit)

## Executive summary

BiatecScan Web is a **read-only Algorand blockchain explorer**. It does not implement
wallet connection, does not accept a user's mnemonic or private key anywhere in the UI,
and does not construct or submit user-signed transactions. The only private-key material
that ever exists in the app is a **throwaway, non-monetary Algorand keypair, deterministically
derived from a random session ID, used solely to sign a short-lived ARC-14 login proof**
sent to Biatec's own backend for API authentication. This key never holds funds and is
never asked of, or shown to, the user.

**Verdict: safe to use.** No path was found by which this application can leak a real
user's private key, mnemonic, or funds — because it never has access to them in the first
place. Findings below are hardening recommendations (missing HTTP security headers,
unnecessary credential exposure on the SignalR connection, and documentation of the
session-key threat model) rather than exploitable key-leak vulnerabilities. None are
Critical or High severity.

## Summary of findings

All findings below were fixed the same day this audit was performed; see the "Fix" note
appended to each finding and [RISKS.md](RISKS.md) for the current live status.

| ID | Title | Severity | Status |
|---|---|---|---|
| AUDIT-2026-07-20-01 | No HTTP security headers (CSP / X-Frame-Options / etc.) | Medium | Fixed |
| AUDIT-2026-07-20-02 | SignalR connection sends credentials (`withCredentials: true`) without a stated need | Low | Fixed |
| AUDIT-2026-07-20-03 | Session-derived ARC-14 signing key is reconstructible from `localStorage`; not documented as sensitive | Low | Fixed |
| AUDIT-2026-07-20-04 | `console.log`/`console.warn` used pervasively in production build | Informational | Fixed |
| AUDIT-2026-07-20-05 | `VITE_ENABLE_VERBOSE_LOGGING` env var documented but unused (dead config) | Informational | Fixed |

## Findings

### AUDIT-2026-07-20-01 — No HTTP security headers (Medium)

**Location:** [docker/default.conf](../docker/default.conf), [vercel.json](../vercel.json)

**Description:** Neither the nginx config used for the Docker deployment nor `vercel.json`
sets `Content-Security-Policy`, `X-Frame-Options`/`frame-ancestors`, `X-Content-Type-Options`,
or `Referrer-Policy`. There is currently no XSS sink in the app (no `v-html`, no
`innerHTML`, no `eval`), so there is no active exploit today. However, this app renders a
large amount of attacker-influenceable, on-chain data (asset names, unit names, NFT/ASA
metadata URLs, transaction notes, ABI-decoded method arguments) which is exactly the kind
of content that tends to grow an XSS sink over time as features are added (e.g. rendering
NFT metadata images/descriptions). A CSP is the single highest-leverage control against
that entire future bug class, and it also protects the session ID in `localStorage`
(see AUDIT-2026-07-20-03) from exfiltration if an XSS bug is ever introduced.

**Impact:** Medium today (defense-in-depth gap, no live exploit); would become the
primary mitigating control the day any XSS-capable code path is added.

**Recommendation:** Add response headers at the edge (nginx and/or `vercel.json`):
- `Content-Security-Policy` with an allow-list of the fonts, the API/SignalR origins, and
  `default-src 'self'`.
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY` (or `frame-ancestors 'none'` in the CSP)
- `Referrer-Policy: strict-origin-when-cross-origin`

**Fix applied (2026-07-20):** Added all four headers to both
[docker/default.conf](../docker/default.conf) and [vercel.json](../vercel.json), scoped to
the app's known first-party origins (`algorand-trades.de-4.biatec.io`,
`algorand-algod-public.de-4.biatec.io`, `mainnet-idx.algonode.cloud`,
`mainnet-idx.voi.nodely.dev`, `algorand.scan.biatec.io`) plus Google Fonts for
`style-src`/`font-src`. Verified with `npm run build` (production build succeeds) and
`npx vue-tsc --noEmit`.

### AUDIT-2026-07-20-02 — Unneeded `withCredentials: true` on SignalR (Low)

**Location:** [src/services/signalrService.ts:63](../src/services/signalrService.ts#L63)

**Description:** The SignalR hub connection is built with `withCredentials: true`, which
causes the browser to send cookies (and read `Set-Cookie`) for the
`algorand-trades.de-4.biatec.io` origin. Authentication is already handled per-connection
via `accessTokenFactory` (the ARC-14 signed token), so no cookie-based auth appears to be
in use. Sending credentials that aren't needed widens the attack surface for CSRF-style
issues on that origin and is unnecessary.

**Impact:** Low — no cookie-based session exists to abuse today, but this is an
unnecessary widening of what's sent to a third-party origin.

**Recommendation:** Remove `withCredentials: true` unless the backend team confirms it is
required for a specific cookie-based mechanism; if it is required, document why.

**Fix applied (2026-07-20):** Set `withCredentials: false` in
[src/services/signalrService.ts:65](../src/services/signalrService.ts#L65), with a comment
recording that auth is handled entirely via `accessTokenFactory`.

### AUDIT-2026-07-20-03 — Session-derived signing key reconstructible from `localStorage` (Low)

**Location:** [src/services/authService.ts:9-28](../src/services/authService.ts#L9-L28), [src/services/authService.ts:30-52](../src/services/authService.ts#L30-L52)

**Description:** `getSessionId()` stores a random `uuidv7()` under `localStorage["session"]`.
`getAuthToken()` calls `generateAlgorandAccount(session)` (from `arc76`), which
**deterministically** derives an Algorand keypair from that session string, and signs an
ARC-14 login transaction with it. This keypair holds no funds and authorizes nothing
beyond calling Biatec's own read API — so this is not a "private key leak" in the sense
this audit's charter is primarily concerned with (no user asset is ever at risk). However:
- Anyone who can read `localStorage` for this origin (e.g. via a future XSS bug, a
  malicious browser extension, or physical/device access) can reconstruct the exact same
  signing key and impersonate the victim's session against the Biatec API indefinitely
  (the session ID does not expire or rotate).
- This should be explicitly modeled and documented so future contributors don't
  mistakenly assume `localStorage["session"]` is "just a UUID" with no security
  properties.

**Impact:** Low (no funds, no real identity, API is read-oriented) but worth documenting
so the assumption isn't silently invalidated by a future change (e.g. if the backend ever
starts gating a privileged/write action on this same ARC-14 identity).

**Recommendation:**
1. Add a code comment at `getSessionId()`/`getAuthToken()` stating explicitly that the
   session value is signing-key seed material and must never be logged, sent to
   analytics, or exposed in error reports.
2. Confirm with the backend team that the ARC-14 identity generated here is not, and will
   never be, used to gate any privileged/write/monetary action.
3. Consider periodic session rotation (e.g. on a TTL) to limit the blast radius of a
   leaked session ID.

**Fix applied (2026-07-20):** Added the sensitivity comment (recommendation 1) directly
above `getSessionId()` in
[src/services/authService.ts](../src/services/authService.ts). Recommendations 2 and 3 are
product/backend decisions outside this repo's code — recorded as follow-ups in
[RISKS.md](RISKS.md)'s standing risk model rather than closed outright.

### AUDIT-2026-07-20-04 — Pervasive `console.log`/`console.warn` in production (Informational)

**Location:** [src/services/signalrService.ts](../src/services/signalrService.ts) (many
lines, e.g. 77, 82, 87, 94, 97, 102, 107, 111, 144, 260, 274, 294, 304...), and
throughout `src/`.

**Description:** Connection state, subscription filters, and every received block/trade/
asset/pool are logged to the browser console unconditionally. Nothing sensitive is logged
(all on-chain data is already public), so this is not a leak, but it does make it easy for
anyone with devtools open to reverse-engineer the SignalR protocol/hub method names, and
adds noise that could bury a genuine security-relevant console warning.

**Recommendation:** Gate verbose logs behind a build-time or runtime flag (the
`VITE_ENABLE_VERBOSE_LOGGING` env var already exists for this purpose — see
AUDIT-2026-07-20-05) and default it to off in production builds.

**Fix applied (2026-07-20):** Added [src/utils/logger.ts](../src/utils/logger.ts)
(`debugLog`, gated on `VITE_ENABLE_VERBOSE_LOGGING === "true"`, defaulting to silent) and
switched all informational `console.log` calls in
[src/services/signalrService.ts](../src/services/signalrService.ts) to use it;
`console.error` calls for genuine failures were intentionally left as-is.

### AUDIT-2026-07-20-05 — `VITE_ENABLE_VERBOSE_LOGGING` documented but unused (Informational)

**Location:** repo `.env` history (`git log -p -- '*.env*'`); not referenced anywhere in `src/`.

**Description:** The environment variable `VITE_ENABLE_VERBOSE_LOGGING` was introduced
(per commit `620f4c9`) but no code in `src/` actually reads
`import.meta.env.VITE_ENABLE_VERBOSE_LOGGING`. This is dead configuration, not a security
issue by itself, but it's the natural mechanism to use when fixing
AUDIT-2026-07-20-04.

**Recommendation:** Wire this flag up as part of fixing AUDIT-2026-07-20-04, or remove it
if no longer intended.

**Fix applied (2026-07-20):** Wired up as part of the AUDIT-2026-07-20-04 fix — see
[src/utils/logger.ts](../src/utils/logger.ts).

---

## Checklist results

### A. Private key & signing safety
1. Enumerate key material — **Pass.** Only key: ephemeral ARC-14 auth keypair derived from
   a local session UUID (`authService.ts`). No user mnemonic/private key handling anywhere.
2. Keys never sent over the network / to logging / analytics — **Pass.** Only the signed
   ARC-14 *header* (not the raw key) is sent, to Biatec's own API, as designed.
3. Keys/secrets not written to storage in usable raw form — **Pass**, with a caveat: the
   session seed that *reconstructs* the key is stored in `localStorage` — see
   AUDIT-2026-07-20-03.
4. No custodial mnemonic/private-key text entry — **Pass.** No such UI exists.
5. Signing operations reviewed — **Pass.** Only the internal ARC-14 handshake; payload is
   fixed/non-user-controlled, not attacker-influenceable.
6. Crypto primitives from audited libraries, secure randomness — **Pass.** Uses `algosdk`,
   `arc76`, `arc14` (no hand-rolled crypto); `uuidv7()` for session IDs (not used as a
   cryptographic secret in the traditional sense, but see finding 03).
7. No key material logged to console — **Pass.** Verified no `sk`/`account`/`session`
   values appear in any `console.*` call.

### B. Supply chain
8. Dependency review — **Pass.** `npm audit --production` → 0 vulnerabilities. No wallet
   SDKs. Small, reputable dependency set; `arc14`/`arc76` are from the same maintaining org
   as `algosdk` usage pattern in this repo.
9. Third-party script origins / SRI — **Pass, with note.** Only third-party resources are
   Google Fonts (`fonts.googleapis.com`/`fonts.gstatic.com`) via `<link>` in
   [index.html](../index.html); no third-party `<script>` tags. SRI is not applicable to
   `<link rel="stylesheet">` the way it is to scripts here, and Google Fonts is a
   widely-trusted origin — acceptable as-is.
10. Build/install scripts — **Pass.** No custom `postinstall` scripts in `package.json`.

### C. Data handling & transport
11. HTTPS-only, no mixed content — **Pass.** All observed endpoints (`axios-instance.ts`,
    `signalrService.ts`, `arc56Service.ts`) use `https://`.
12. Outbound request review / ARC-14 token scope — **Pass.** See finding 03 for the one
    caveat around session-ID sensitivity.
13. `VITE_*` env vars checked for embedded secrets — **Pass.** Only public URLs
    (`VITE_ALGORAND_INDEXER_URL`, `VITE_ALGORAND_ALGOD_URL`, `VITE_API_BASE_URL`,
    `VITE_ARC56_REGISTRY_URL`) and a boolean flag found; none are secrets.
14. SignalR/websocket auth & reconnect — **Pass, with note.** `accessTokenFactory` fetches
    a fresh ARC-14 token per (re)connect rather than caching a stale one — correct
    behavior. See finding 02 for the unrelated `withCredentials` note.

### D. Client-side application security
15. XSS via `v-html`/`innerHTML`/dynamic component — **Pass.** No matches found anywhere
    in `src/`.
16. Open redirects / unsafe router navigation — **Pass.** No dynamic external redirect
    logic found in routing.
17. Clickjacking / missing security headers — **Fail at time of audit, fixed same day.**
    See AUDIT-2026-07-20-01.
18. Dependency confusion / typosquatting — **Pass.** All dependency names are correct,
    well-known packages.
19. `eval`/`new Function`/dynamic remote code execution — **Pass.** None found.

### E. Process / operational
20. No committed secrets in repo or history — **Pass.** Checked `.gitignore` and
    `git log -p -- '*.env*'`; only public config values were ever committed.
21. Error/crash reporting scope — **Pass (N/A).** No error-reporting/telemetry SDK is
    integrated in this app.

## Status of findings from previous audit

N/A — this is the first audit.
