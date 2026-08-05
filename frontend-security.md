# Przegląd bezpieczeństwa frontendu Next.js

Date: 2026-08-05  
Scope: `src/frontend`, including App Router pages, client components, environment configuration and `package-lock.json`.  
Method: static search plus `npm audit --omit=dev --json`, lint and production build. No browser penetration test or deployed-host test was performed.

## Podsumowanie zarządcze

The codebase has no obvious `dangerouslySetInnerHTML`, `innerHTML`, `eval`, `Function` or direct cookie usage. React's normal escaping is currently protective. The main production blockers are:

1. The frontend stores the JWT in `localStorage`, so any future XSS or compromised client-side dependency can steal the bearer token.
2. `next@15.3.3` is outdated and `npm audit` reports 1 critical and 2 high production dependency findings, with a fix available at `next@15.5.22`.
3. No CSP, clickjacking protection or other browser security headers are configured in `next.config.mjs` or the root layout.
4. The API base URL is exposed through `NEXT_PUBLIC_*`; this is not a secret, but production must use HTTPS and an allowlisted origin.
5. A fixed third-party NBP request is made directly from the browser, increasing privacy/availability and supply-chain exposure.

## Ustalenia i poprawki

### FE-01 — JWT in localStorage — High

**Location:** `src/frontend/lib/session.ts:5,10,15`; `src/frontend/lib/auth-fetch.ts:6-20`; `src/frontend/components/auth-card.tsx:41-57`.

**Threat:** Any successful XSS, malicious browser extension, compromised dependency or injected script can read the bearer token and call the API as the user. `localStorage` is not HttpOnly and persists across browser sessions.

**Fix:** Prefer a backend-for-frontend or server-managed session using an HttpOnly, Secure, SameSite cookie. Use short-lived access tokens and rotating refresh tokens stored server-side. If localStorage remains temporarily, add a strict CSP, remove third-party scripts, keep token TTL short and add token revocation/incident response.

### FE-02 — Missing Content Security Policy — High

**Location:** `src/frontend/next.config.mjs` and `src/frontend/app/layout.tsx` contain no CSP or nonce configuration.

**Threat:** There is no browser-level restriction limiting script, frame, image, font, connect or form destinations. CSP would substantially reduce the impact of a future DOM/reflected XSS or dependency compromise.

**Fix:** Add a production CSP, preferably nonce/hash based for Next.js. Start with a report-only policy and allow only the app origin, API origin, required NBP origin (or proxy it), and trusted asset sources. Avoid `unsafe-eval`; minimize/avoid `unsafe-inline`.

### FE-03 — Missing clickjacking and browser security headers — Medium

**Location:** `src/frontend/next.config.mjs` has no `headers()` configuration.

**Threat:** The app can be framed by another origin unless deployment infrastructure adds protection. Missing `nosniff`, Referrer Policy, Permissions Policy and HSTS increases browser attack surface and data leakage.

**Fix:** Configure, at the reverse proxy or Next.js, at minimum:

```text
Content-Security-Policy: frame-ancestors 'none'; ...
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=()
Strict-Transport-Security: max-age=31536000; includeSubDomains
```

Only send HSTS after HTTPS is correctly deployed.

### FE-04 — Outdated Next.js and production dependency vulnerabilities — Critical/High

**Evidence:** `npm audit --omit=dev --json` on 2026-08-05 reported 3 production vulnerabilities: 1 critical and 2 high. The direct dependency is `next@15.3.3`; audit reports multiple Next.js advisories affecting this range and gives a fix at `15.5.22`. Transitive findings include `postcss` and `sharp`.

**Threat:** Depending on the precise advisory and deployment features, risks include React Flight/RSC request deserialization/RCE, SSRF, DoS, cache confusion, image optimizer issues and PostCSS/sharp vulnerabilities.

**Fix:** Upgrade Next.js to at least the audit-provided fixed version (`15.5.22`) or the currently supported patched release, update the lockfile, run `npm ci`, `npm audit --omit=dev`, lint, build and regression tests. Review the Next.js release notes before deploying. Do not suppress audit findings without a documented reason.

### FE-05 — `NEXT_PUBLIC_*` boundary and API origin — Medium

**Location:** `src/frontend/.env.local:1`, `src/frontend/lib/auth-fetch.ts:3-4`, `src/frontend/lib/api.ts:23`, `src/frontend/components/auth-card.tsx:11`.

**Threat:** Values with `NEXT_PUBLIC_` are embedded into browser bundles and are not secrets. Misplacing a token, password or internal URL there would leak it to every visitor. The current default is HTTP localhost, unsuitable for production.

**Fix:** Keep only a public HTTPS API origin in `NEXT_PUBLIC_BACKEND_API_URL`. Keep all credentials, signing keys, database URLs and private service URLs server-side. Validate the production value at build/deploy time and use an allowlisted HTTPS origin. Ensure `.env.local` remains untracked; rotate any secret ever committed in history.

### FE-06 — Direct third-party exchange-rate fetch — Low/Medium

**Location:** `src/frontend/app/reports/page.tsx:105`.

**Threat:** Browser clients contact `api.nbp.pl` directly. This exposes user browser/network metadata to the third party, makes the report dependent on external availability/CORS, and complicates CSP. It is not user-controlled SSRF because the URL is fixed.

**Fix:** Proxy/cache the data through a controlled backend endpoint with a fixed allowlist and timeout, or keep the direct call but add CSP `connect-src`, timeout, caching and a clear fallback. Never turn this into a user-provided URL.

### FE-07 — Client-side auth is not a route authorization boundary — Medium

**Location:** `src/frontend/app/auth/page.tsx`, `src/frontend/lib/session.ts` and client-side navigation.

**Threat:** The frontend can hide/show UI based on local token state, but it cannot enforce authorization. A user can call the API directly or modify client state.

**Fix:** Keep all authorization in the API. Add a server-side/BFF session check for protected page rendering if SSR protection is desired. Do not treat redirects from the frontend as access control.

### FE-08 — User-controlled financial text must remain escaped — Low/Medium

**Evidence:** No `dangerouslySetInnerHTML`, `innerHTML`, `eval`, `new Function`, `document.cookie` or `sessionStorage` usage was found in the reviewed `src/frontend` files. Transaction descriptions, counterparties, category names and import data are rendered through React JSX, which escapes text by default.

**Risk:** Future changes could introduce raw HTML or unsafe URL sinks. Imported financial data is attacker-influenced if a malicious CSV is uploaded.

**Fix:** Keep text rendering as JSX; never add `dangerouslySetInnerHTML` for transaction data. If rich text is required, sanitize with a maintained allowlist sanitizer. Add a lint/code-review rule and tests for payloads such as `<img src=x onerror=...>`.

### FE-09 — Third-party and browser dependency supply chain — Medium

**Location:** `src/frontend/package.json` and `package-lock.json`.

**Threat:** Client bundles include React, Next.js and `lucide-react`; a compromised or vulnerable dependency can execute in the user's origin and access localStorage tokens.

**Fix:** Pin direct versions, use `npm ci` in CI, enforce lockfile review, run `npm audit`/Dependabot or equivalent, generate an SBOM, use package provenance/signature verification where available, minimize dependencies and monitor transitive packages.

### FE-10 — External image and asset handling — Low

**Location:** `src/frontend/components/app-shell.tsx:44` uses `<img>` for a local logo.

**Threat:** Current asset is local and not an XSS sink, but arbitrary remote image sources or permissive Next image optimization configuration could introduce tracking/DoS/cache risk.

**Fix:** Use `next/image` for local assets, keep remote patterns empty or tightly allowlisted, and never derive image URLs from untrusted transaction/import data.

## Sprawdzone obszary

| Area | Result |
|---|---|
| XSS | No obvious raw HTML sinks found; React escaping is currently used. Token storage makes any future XSS high impact. |
| `dangerouslySetInnerHTML` | Not found in `src/frontend`. Keep it prohibited unless sanitized and reviewed. |
| `localStorage` | Used for JWT access token; high-risk design issue. |
| `sessionStorage` | Not found. |
| JWT tokens | Sent as `Authorization: Bearer`; token is persisted in localStorage, 8-hour backend lifetime, no frontend refresh/revocation flow. |
| Data leaks | `NEXT_PUBLIC_BACKEND_API_URL` is public by design. No frontend secret was found in the reviewed sources; `.env.local` is gitignored. |
| CSP | Not configured. |
| Clickjacking | No frontend `frame-ancestors`/`X-Frame-Options` configuration found. |
| Dependencies | `npm audit --omit=dev` reports 1 critical and 2 high production findings, primarily through Next.js and transitive packages. |
| Secrets to client | No obvious secret literal in frontend sources. Treat every `NEXT_PUBLIC_*` value as public. |
| `NEXT_PUBLIC_*` | Used only for API base URL in reviewed code; production value must be HTTPS and non-secret. |

## Lista poprawek według priorytetu

### Natychmiast — przed produkcją

1. Upgrade Next.js to the patched audit version or current supported release and regenerate the lockfile.
2. Replace localStorage JWT storage with HttpOnly Secure SameSite cookie/BFF sessions, or document a temporary exception with short TTL and strict CSP.
3. Add CSP, `frame-ancestors`/`X-Frame-Options`, `nosniff`, Referrer Policy and HSTS after HTTPS deployment.
4. Set `NEXT_PUBLIC_BACKEND_API_URL` to the production HTTPS API origin and verify no secret is prefixed with `NEXT_PUBLIC_`.
5. Run `npm ci`, `npm audit --omit=dev`, lint, build and browser regression tests in CI; fail the pipeline on critical/high production findings.

### Przed obsługą rzeczywistych danych finansowych

6. Add a CSP-compatible third-party policy and proxy/cache NBP rates if practical.
7. Add XSS regression tests for all transaction/category/import text fields.
8. Add session expiration/logout/rotation tests and clear all client auth state on logout or 401.
9. Lock down remote image configuration and replace `<img>` with `next/image` where appropriate.
10. Generate an SBOM and establish dependency update/incident response ownership.
