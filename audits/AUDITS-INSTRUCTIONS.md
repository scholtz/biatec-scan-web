# BiatecScan Web — Security Audit Instructions

## Purpose

This document defines the scope, process, and deliverable format for security audits of
`biatec-scan-web`. The **primary purpose of every audit** is to answer one question with
certainty:

> **Can this application, in any code path, cause a user's private key, mnemonic/seed
> phrase, or wallet-signing capability to be leaked, exfiltrated, misused, or exposed to
> an unauthorized party?**

All other findings (XSS, dependency risk, injection, etc.) are in scope **because they are
plausible paths to that outcome** (e.g., an XSS bug is dangerous here specifically because
it could be used to exfiltrate keys, hijack a wallet-signing prompt, or trick a user into
signing a malicious transaction). Findings unrelated to key/asset safety should still be
reported, but triaged below the key-safety findings.

Treat this as a **paid, professional engagement worth $20,000**. That budget buys:
depth over breadth, working proof-of-concept for every "High" or "Critical" finding,
no unverified/speculative claims, and a report a non-technical stakeholder could act on.

---

## 1. Trigger

The audit is run on demand. When the project owner writes the keyword:

```
do new audit
```

the assistant (auditor) must perform a **complete, new** audit following this document,
against the current state of the `main` branch / working tree, and produce a new dated
report as described in Section 5. Do not reuse or copy findings from a previous audit
without re-verifying them against the current code — code changes between audits.

---

## 2. Scope

### In scope
- Everything under `src/` (Vue components, composables, services, stores, router, api client).
- Build/deploy configuration that affects what ships to the browser (`vite.config.ts`,
  `index.html`, `.env*` handling, `public/`).
- All third-party dependencies in `package.json` / `package-lock.json`, especially any
  package that touches cryptography, key derivation, signing, or wallet connectivity
  (e.g. `algosdk`, `arc76`, `arc14`, and any wallet-connect / Pera / Defly / WalletConnect
  style SDKs, present or future).
- Any code that talks to first- or third-party backends (`axios` usage, SignalR service,
  generated API clients under `src/api`), specifically what data is sent, to where, and
  whether any of it is sensitive.
- Any code that stores data client-side: `localStorage`, `sessionStorage`, `IndexedDB`,
  cookies, service workers, cache storage.
- Any code that derives, generates, imports, or holds an Algorand account/keypair —
  even a "throwaway" or session-scoped one.

### Out of scope
- Backend/API services this app calls (e.g. `algorand-trades.de-4.biatec.io`) — audit only
  what this repository sends to them and how responses are handled, not the server's own
  security posture.
- Denial-of-service / load testing.
- Physical/host security of deployment infrastructure (k8s, Docker) unless a
  misconfiguration in this repo's own files (e.g. `docker/`, `k8s/`) directly risks
  leaking secrets (baked-in credentials, debug endpoints, etc.).

---

## 3. Audit checklist

The auditor must work through every item below and explicitly record a Pass / Fail /
N/A / Not-Applicable-With-Reason for each — silent omission is not acceptable.

### A. Private key & signing safety (highest priority)
1. Enumerate every place a private key, secret key, seed, or mnemonic could exist in
   memory, at rest, or in transit — including derived/deterministic/session keys (e.g.
   ARC-76-style password- or session-derived accounts).
2. For each such key: confirm it is never sent to any network endpoint, logging system,
   analytics/telemetry call, error reporter, or third-party script.
3. Confirm keys/secrets are never written to `localStorage`/`sessionStorage`/cookies/
   `IndexedDB` in a form that is directly usable (raw key material), and evaluate whether
   the *seed material* used to (re)derive a key (e.g. a session ID) is itself sensitive —
   if it deterministically reconstructs a key, treat it with equivalent care.
4. Confirm this app never prompts for or accepts a user's real wallet mnemonic/private key
   via a text input (i.e., it should rely on wallet-provider signing flows, not custodial
   entry) — if it does, that is a Critical finding by default.
5. Check any signing operations: what exactly is being signed, is the payload
   user-visible/verifiable before signing, and could a malicious/compromised dependency or
   injected script alter the payload or intercept the signed output.
6. Verify all cryptographic primitives come from audited libraries (no hand-rolled crypto),
   and that randomness sources are cryptographically secure (no `Math.random()` for any
   key/session/nonce material).
7. Confirm there is no code path (including error/catch branches, debug flags, or
   commented-out code) that could log key material to the browser console.

### B. Supply chain
8. Review `package.json`/`package-lock.json` for the crypto/wallet-adjacent dependencies:
   pinned vs. floating versions, known CVEs (`npm audit`), maintenance status, and whether
   any of them fetch remote code at runtime (e.g. remote config, dynamic `import()` from a
   URL, CDN scripts in `index.html`).
9. Check `index.html` and any dynamically injected `<script>`/`<link>` tags for third-party
   origins; confirm Subresource Integrity (SRI) or an equivalent trust justification.
10. Check for install/build scripts (`postinstall`, etc.) in dependencies that could exfiltrate
    environment secrets during CI/build.

### C. Data handling & transport
11. Confirm all network calls use HTTPS; no mixed content.
12. Review what is sent in every outbound request (headers, query params, bodies) —
    specifically the ARC-14 auth header / token generation flow — confirm it does not leak
    reusable secrets beyond its intended short-lived authentication purpose.
13. Review CORS/config assumptions and whether `VITE_*` env vars could ever contain a
    secret that ends up bundled into client-shipped JS (anything prefixed `VITE_` is public
    by Vite convention — flag any secret-looking value there).
14. Review SignalR / websocket usage for auth token handling and reconnect logic (recent
    commit history shows a reconnect fix — verify tokens are refreshed safely, not cached
    insecurely, on reconnect).

### D. Client-side application security
15. XSS: any use of `v-html`, `innerHTML`, dynamic `<component :is>` from untrusted data,
    or unsanitized rendering of on-chain data (asset names, NFT metadata, transaction notes)
    that a malicious actor fully controls on-chain.
16. Open redirects / unsafe `router.push` with attacker-controlled input.
17. Clickjacking / missing security headers (CSP, `X-Frame-Options`, `Referrer-Policy`) —
    review `vercel.json`, `docker/`, `index.html` for what's configured vs. recommended.
18. Dependency confusion / typosquatting risk in package names.
19. Any `eval`, `new Function`, or dynamic code execution from remote/user-controlled data.

### E. Process / operational
20. Confirm `.gitignore` and repo history don't contain committed secrets, `.env` files, or
    API keys (spot check `git log -p` for likely filenames; do not attempt a full history
    scan by hand if a `git log` search suffices).
21. Confirm error/crash reporting (if any) is not configured to capture full request/response
    bodies that could include tokens.

---

## 4. Severity definitions

| Severity | Definition |
|---|---|
| **Critical** | Direct path to private key/mnemonic exposure, unauthorized fund movement, or signing of attacker-chosen transactions without clear user consent. |
| **High** | Indirect but realistic path to the above (e.g. stored XSS on a page rendering attacker-controlled on-chain data, in an app that also handles session-signing). |
| **Medium** | Security weakness that meaningfully raises risk but requires additional preconditions (e.g. outdated dependency with a known but hard-to-reach CVE). |
| **Low** | Best-practice deviation, defense-in-depth gap, minor info disclosure. |
| **Informational** | Observation, no direct risk, or a note for future hardening. |

Every finding must include: description, location (file + line), reproduction/PoC steps
(or explicit "PoC not applicable" reasoning), impact, and a concrete recommended fix.

---

## 5. Deliverables & file naming

Each audit produces exactly one report file in this `audits/` folder, named:

```
audits/AUDIT-YYYY-MM-DD-<auditor-slug>.md
```

- `YYYY-MM-DD` — date the audit was performed (UTC date is fine), so files sort
  chronologically by filename.
- `<auditor-slug>` — identifies who/what performed the audit, e.g. `sonnet-5`,
  `opus-4-8`, `jane-doe`, `external-firm-x`. This must always be present so the audit
  trail shows which model/person is accountable for each report.

Example: `audits/AUDIT-2026-07-20-sonnet-5.md`

Each report must start with this header block:

```markdown
# BiatecScan Web Security Audit — YYYY-MM-DD

- **Auditor:** <name/model>
- **Scope commit:** <git short SHA audited>
- **Engagement value:** $20,000 (professional-grade audit per audits/AUDITS-INSTRUCTIONS.md)
- **Prior audit:** <link to previous report, or "None">
```

Followed by:
1. Executive summary (plain-language, 3-6 sentences, aimed at a non-technical stakeholder:
   is it currently safe to use, yes/no/with caveats).
2. Summary table of findings (ID, title, severity, status).
3. Full findings, most severe first, in the format from Section 4.
4. Checklist results from Section 3 (Pass/Fail/N/A per item).
5. Status of findings from the previous audit, if any (Fixed / Regressed / Still Open /
   Not Applicable — confirm by re-testing, don't assume prior fixes still hold).

After the report is written, the auditor must update `audits/RISKS.md` (Section 6) to
reflect the current, live risk state — the risk registry is always a snapshot of *today*,
not a history log (the dated reports are the history).

---

## 6. Risk registry maintenance

`audits/RISKS.md` is the living risk registry. On every audit:
- Add newly discovered risks.
- Update the status of existing risks (Open / Mitigated / Accepted / Closed).
- Never delete a risk row — mark it Closed with the date and audit report that closed it,
  so the registry remains a full accountable history of everything ever flagged.

---

## 7. Fixing findings

When asked to fix findings from an audit:
- Fix Critical and High findings first, and re-verify (don't just patch and assume).
- For each fix, note in the commit/PR description which finding ID it resolves.
- Do not mark a finding as resolved in `RISKS.md` until the fix has been applied AND,
  where feasible, re-tested.
- If a finding cannot be fully fixed (e.g. accepted risk inherent to the design), record
  it as "Accepted" in `RISKS.md` with a written justification — do not silently drop it.
