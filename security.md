# Audyt bezpieczeństwa

Date: 2026-08-05  
Scope: ASP.NET Core API, Next.js frontend, PostgreSQL/Compose configuration and repository contents.  
Method: static source/configuration review, dependency/build inspection and targeted local checks. No authenticated penetration test, production infrastructure test, container scan or external DAST was available. Findings should be re-tested after remediation.

## Podsumowanie zarządcze

The application is not ready for an internet-facing production deployment. The most important blockers are:

1. Cross-user data access in category rules and transaction endpoints (IDOR / broken object-level authorization).
2. Hard-coded database and JWT secrets, including a development JWT fallback.
3. No rate limiting or lockout on login/registration.
4. File upload limits and content/resource controls are missing.
5. HTTPS, security headers and production CORS/deployment configuration are not enforced.
6. Access tokens are stored in browser `localStorage`, making token theft possible after any XSS/client compromise.

## Podsumowanie ryzyka

| Risk | Count | Main examples |
|---|---:|---|
| Critical | 0 confirmed | No confirmed unauthenticated RCE or SQL injection in static review |
| High | 7 | IDOR, secrets, brute force, upload DoS, JWT storage/lifecycle, missing HTTPS |
| Medium | 8 | headers, CORS, Swagger exposure, password hashing hardening, validation and logging |
| Low / informational | 5 | no cookies/CSRF surface, no shell execution found, dependency/process improvements |

## Ustalenia

### SEC-01 — Broken object-level authorization in transactions — High

**Threat:** An authenticated user who knows another transaction UUID can read it. This exposes financial data and is an IDOR (OWASP A01:2021).

**Location:** `src/backend/Api/Controllers/TransactionsController.cs:72-92`, `GetById` queries by `x.Id == id` but does not constrain `x.UserId`.

**Fix:** Query with `x.Id == id && x.UserId == userId.Value`; return `NotFound()` for non-owned objects. Add tests for read/update/delete/splits using two users.

**Related:** `GetSplits` checks ownership of the parent at line 222, but the returned split query at line 224 should also be treated as an ownership boundary and tested.

### SEC-02 — Broken object-level authorization in category rules — High

**Threat:** Category rules can be enumerated across users and created/updated using an arbitrary `request.UserId`. This permits cross-user data disclosure and tampering (A01:2021, A05:2021).

**Location:** `src/backend/Api/Controllers/CategoryRulesController.cs:24-75`.

**Fix:** Ignore `userId` from query/body. Derive the owner exclusively from `User.GetUserId()`. Add `x.UserId == currentUserId` to `GetAll`, `GetById`, and `Update`; validate that `CategoryId` belongs to the same user.

### SEC-03 — Hard-coded production secrets and unsafe JWT fallback — High

**Threat:** Repository users can forge tokens or access the database. The fallback key allows a deployment misconfiguration to silently start with a known signing key.

**Location:** `compose.yml:9` (`POSTGRES_PASSWORD: postgres`), `src/backend/Api/appsettings.json` connection string and `Jwt:Key`, `src/backend/Api/Program.cs:38` fallback `dev-only-change-me-dev-only-change-me`.

**Fix:** Remove secrets from tracked files. Use a secret manager/environment variables, fail startup outside Development when `Jwt:Key` or the database password is missing, require a minimum random key length, rotate any exposed credentials, and use separate credentials per environment.

### SEC-04 — No rate limiting, lockout or abuse controls for authentication — High

**Threat:** Login and registration can be brute-forced, spammed, or used for resource exhaustion. The login response is generic, which helps, but there is no throttling.

**Location:** `src/backend/Api/Controllers/AuthController.cs:18-31`, `src/backend/Infrastructure/Auth/AuthService.cs`.

**Fix:** Add ASP.NET Core rate limiting per IP and account identifier, exponential backoff/temporary lockout, request body limits, monitoring and alerting. Keep generic authentication errors and avoid email enumeration on registration.

### SEC-05 — JWT lifecycle and browser storage are unsafe for production — High

**Threat:** Tokens are valid for eight hours, have no refresh/revocation/rotation mechanism, and are stored in `localStorage`. Any XSS or compromised third-party script can exfiltrate the bearer token.

**Location:** `src/backend/Infrastructure/Auth/JwtTokenService.cs:24-41`; `src/frontend/lib/session.ts:1-15`.

**Fix:** Prefer short-lived access tokens (5–15 minutes) plus rotating, hashed refresh tokens stored server-side. Revoke refresh tokens on logout/password change. Prefer an HttpOnly, Secure, SameSite cookie-based session or a BFF pattern. If bearer tokens remain in the browser, enforce a strict CSP and minimize third-party scripts.

### SEC-06 — Missing HTTPS enforcement and transport security — High

**Threat:** Credentials, JWTs and financial data can be intercepted or modified over HTTP. The current defaults use `http://localhost` and there is no `UseHttpsRedirection`/HSTS.

**Location:** `src/backend/Api/Program.cs:82-87`, `src/frontend/.env.local:1`, `README.md` local HTTP instructions.

**Fix:** Terminate TLS at a trusted reverse proxy or Kestrel, redirect HTTP to HTTPS, enable HSTS only in production, configure secure cookie attributes, use HTTPS API origins, and document certificate/secret management.

### SEC-07 — Unbounded file upload and CSV processing — High

**Threat:** An attacker can upload very large files or malformed CSV data, causing memory/CPU exhaustion. The upload is accepted based on filename/parser behavior and has no size, row, field, timeout or storage quota.

**Location:** `src/backend/Api/Controllers/ImportsController.cs:27-40`; `src/backend/Infrastructure/Imports/Parsers/CsvParser.cs:7-14` reads all lines into memory and splits the whole file.

**Fix:** Enforce endpoint and multipart size limits, file size and row/column/field-length limits, allowed extension and detected content type, cancellation/timeouts, per-user quotas, and streaming/bounded parsing. Store uploads outside the web root if persisted, generate server-side names, and never trust `fileName` for filesystem paths.

### SEC-08 — Missing security headers and production error policy — Medium

**Threat:** Missing CSP, frame protections, MIME sniffing protection, referrer policy and Permissions Policy increase XSS/clickjacking/data-leak impact. Developer exception pages must never be exposed publicly.

**Location:** `src/backend/Api/Program.cs:55-65`; no security-header middleware is configured.

**Fix:** Add production headers: `Content-Security-Policy`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `Permissions-Policy`, and `frame-ancestors`/`X-Frame-Options`. Use HSTS only over HTTPS. Keep `UseDeveloperExceptionPage` Development-only and use a generic production error handler.

### SEC-09 — Swagger is exposed in every environment — Medium

**Threat:** Public API schema and endpoint details help attackers map the application and may expose internal models.

**Location:** `src/backend/Api/Program.cs:68-75`.

**Fix:** Enable Swagger only in Development or protect it with network access/authentication. If production documentation is required, publish a sanitized, access-controlled artifact.

### SEC-10 — CORS is development-only and not deployment-safe — Medium

**Threat:** Hard-coded localhost origins do not support a controlled production frontend configuration. Future changes may lead to an overly broad policy; `AllowAnyHeader` and `AllowAnyMethod` are unnecessarily permissive.

**Location:** `src/backend/Api/Program.cs:29-35`.

**Fix:** Read an explicit allowlist from environment configuration, fail closed when it is missing, allow only required methods/headers, and do not combine wildcard origins with credentials.

### SEC-11 — Password hashing should be upgraded and versioned — Medium

**Threat:** PBKDF2-SHA256 with 100,000 iterations is custom-formatted and has no work-factor/version upgrade path. It is better than plaintext but weaker operationally than a maintained password KDF.

**Location:** `src/backend/Infrastructure/Auth/PasswordHasher.cs:9-27`.

**Fix:** Use ASP.NET Core `PasswordHasher<TUser>` or Argon2id/scrypt with a versioned encoded format, current calibrated cost, and rehash-on-login. Add password length/strength and breached-password controls appropriate for the threat model.

### SEC-12 — Registration and request validation are incomplete — Medium

**Threat:** Oversized display names, emails, category values, descriptions and numeric values can cause abuse, data-quality issues, or excessive resource use. Password minimum validation is primarily client-side.

**Location:** `AuthController`/`AuthService`, request records under `src/backend/Application/**/Models`, and controller validation methods.

**Fix:** Add server-side FluentValidation/DataAnnotations, maximum lengths, normalized email validation, allowed enum/currency values, sensible decimal/date bounds, and global request-size limits. Never rely on frontend `minLength`/`required` alone.

### SEC-13 — Sensitive financial descriptions are written to import logs — Medium

**Threat:** Import titles/counterparty data may contain account or payment information. Logs often have broader access and longer retention than application data.

**Location:** `src/backend/Infrastructure/Imports/TransactionImportService.cs:75,118` where `draft.Title` is stored in `ImportLog`.

**Fix:** Minimize/redact sensitive fields, define retention and access controls, avoid request/token/password logging, and ensure production logs are encrypted and monitored.

### SEC-14 — Client-side token storage and XSS posture — Medium

**Threat:** React escapes rendered text by default, and no obvious `dangerouslySetInnerHTML` was found in the reviewed frontend, but `localStorage` makes any future XSS or dependency compromise immediately token-impacting.

**Location:** `src/frontend/lib/session.ts:5,10`.

**Fix:** Use HttpOnly cookies/BFF where possible; add CSP, dependency auditing, and tests preventing unsafe HTML injection. Do not render imported descriptions as raw HTML.

### SEC-15 — External NBP request is an SSRF/dependency concern — Low/Medium

**Threat:** The frontend fetches a fixed external URL, so this is not currently user-controlled SSRF. It still introduces availability, privacy and supply-chain dependence on a third party.

**Location:** `src/frontend/app/reports/page.tsx` fetches `https://api.nbp.pl/api/exchangerates/tables/A?format=json`.

**Fix:** Keep the destination constant, add timeout/error handling and caching, or proxy through a controlled backend service with an allowlist. Do not accept arbitrary URLs from users.

## Sprawdzone klasy podatności

| Area | Assessment |
|---|---|
| SQL Injection | No direct SQL concatenation found; EF Core LINQ is parameterized. Still add tests and avoid `FromSqlRaw` without parameters. |
| XSS | No obvious raw HTML sink found; React escaping helps. `localStorage` turns any future XSS into token theft. Add CSP and security tests. |
| CSRF | API uses Authorization bearer headers and no cookies, so classic CSRF exposure is currently low. If cookies are introduced, add SameSite and antiforgery protection. |
| SSRF | No user-controlled backend URL fetch found. Fixed NBP frontend request is a controlled external dependency. |
| Path Traversal | No direct filesystem path from user input found. Keep upload storage server-generated and outside web root. |
| Command Injection | No shell/process execution found in application code. |
| Deserialization | `JsonSerializer.Deserialize<Dictionary<string,string>>` parses user input; constrain size/count/depth and handle malformed input as a 400, not an unhandled 500. No unsafe polymorphic deserialization found. |
| File Upload | High risk due missing limits, validation and bounded parsing; see SEC-07. |
| Authentication | Login/register exist, but rate limiting, lockout and stronger validation are missing. |
| Authorization | Several controllers scope data by user, but category rules and transaction reads contain IDOR findings. |
| JWT | Signature validation is configured, but secret fallback, 8-hour lifetime, no rotation/revocation and localStorage are production risks. |
| Refresh Token | No refresh-token endpoint or server-side refresh-token store was found. |
| CORS | Explicit localhost origins are safer than wildcard, but production origins are not configurable and methods/headers are broad. |
| Cookies | No application auth cookies found. If migrated from localStorage, use HttpOnly/Secure/SameSite. |
| Security Headers | Not configured; see SEC-08. |
| HTTPS | Not enforced; see SEC-06. |
| Rate Limiting / Brute Force | Not configured; see SEC-04. |
| Password Hashing | PBKDF2 with fixed 100k iterations and no versioning; see SEC-11. |
| Secret Leakage | Database password, JWT key and local API URL are in tracked/config files; see SEC-03. CSV/XLSX attachments also contain financial data and should not be public artifacts. |
| Environment Variables | `.env.local` is development-only and the backend secrets are not externalized. Define production configuration contract and secret scanning in CI. |
| Logging | Import titles are persisted; minimize and protect them. No evidence of JWT/password logging in reviewed code. |
| IDOR | Confirmed in transactions `GetById` and category rules; see SEC-01/SEC-02. |

## Mapowanie na OWASP Top 10: 2021

| OWASP category | Status |
|---|---|
| A01 Broken Access Control | High — SEC-01 and SEC-02. |
| A02 Cryptographic Failures | High — hard-coded secrets, HTTP, localStorage token; SEC-03/05/06. |
| A03 Injection | No SQL/command injection found; validate JSON/file inputs. |
| A04 Insecure Design | High — no abuse controls, upload quotas or token revocation. |
| A05 Security Misconfiguration | High — Swagger, headers, HTTPS and development defaults. |
| A06 Vulnerable and Outdated Components | Requires dependency scanner/SBOM; package versions are pinned but were not fully CVE-verified in this audit. |
| A07 Identification and Authentication Failures | High — brute force, long JWT lifetime, no refresh/revocation. |
| A08 Software and Data Integrity Failures | Medium — add lockfile/SBOM scanning, signed CI artifacts and dependency update policy. |
| A09 Security Logging and Monitoring Failures | Medium — no visible audit/alerting strategy; import data is logged. |
| A10 Server-Side Request Forgery | Low currently — fixed NBP URL, no user-controlled destination found. |

## Bramka produkcyjna

Do not expose this build publicly until at least SEC-01 through SEC-07 are fixed and verified with automated two-user authorization tests. Before launch also require TLS termination, secret rotation, production CORS, rate limiting, upload limits, security headers, controlled Swagger exposure, dependency/CVE scanning, database backups, monitoring and an external authenticated penetration test.

## Zalecane polecenia weryfikacyjne

```powershell
dotnet test
dotnet build Backend.sln --configuration Release
Set-Location src/frontend
npm ci
npm run lint
npm run build
```

Add dynamic tests for: cross-user transaction reads, cross-user category-rule CRUD, malformed/oversized uploads, login throttling, expired/tampered JWTs, CORS origins, missing production secrets, security headers and HTTPS redirects.

## Wyniki wykonania audytu

- `dotnet test Backend.sln --configuration Release --no-restore`: **failed** — 2 existing parser tests expect `Lista_operacji_20260712_205807.csv` at the repository root, but the sample is under `attachments/old/`. This is a test-fixture/path failure, not a security pass.
- `npm run lint`: completed with 4 warnings and 0 errors. Warnings concern a missing React effect dependency, `<img>` optimization, and anonymous config exports.
- `npm run build`: completed successfully during the audit.
- `dotnet build Backend.sln --configuration Release --no-restore`: was not independently accepted from the parallel run because concurrent build/test processes locked generated assemblies; rerun serially after stopping running API/test processes.
