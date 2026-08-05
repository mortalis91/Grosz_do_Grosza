# Przegląd bezpieczeństwa API

Date: 2026-08-05  
Scope: every controller endpoint under `src/backend/Api/Controllers`.  
Review type: static endpoint inventory and authorization/validation review. This is not a substitute for an authenticated two-user API penetration test.

## Podsumowanie zarządcze

Most business controllers have a class-level `[Authorize]` and most write operations derive the owner from the JWT. There are, however, confirmed authorization gaps that must be fixed before production:

- `GET /api/v1/transactions/{id}` does not filter by the current user — cross-user transaction disclosure.
- Category-rule list/create/read/update accept or trust a caller-supplied `userId` and do not consistently enforce ownership — cross-user disclosure and tampering.
- Several endpoints accept related entity IDs without checking that the related category/account belongs to the current user.
- Authentication endpoints are intentionally anonymous but have no rate limiting or enumeration-resistant registration behavior.
- Validation is mostly manual and incomplete; upload and query limits are insufficient.

## Inwentaryzacja endpointów

Legend: `Auth` is authentication required; `Owner` is whether current-user ownership is enforced in the reviewed query; `Risk` is the endpoint-specific highest concern.

### Uwierzytelnianie — `/api/v1/auth`

| Method and endpoint | Auth | Owner / IDOR | Validation and errors | Risk |
|---|---|---|---|---|
| `POST /register` (`AuthController.cs:18-23`) | No; required for account creation | N/A | `[ApiController]` supplies binding errors, but request model has no visible server-side length/password policy. Duplicate email throws an exception; behavior depends on global exception handling and may enumerate account existence. No rate limit. Returns access token immediately. | High |
| `POST /login` (`AuthController.cs:25-30`) | No | N/A | Generic invalid-credential message in service, but no throttling, lockout or IP/account abuse control. Returns an 8-hour bearer token. | High |

**Required changes:** rate-limit both endpoints, enforce server-side DTO constraints, return a consistent non-enumerating registration response, use short-lived access tokens and a refresh-token flow.

### Konta — `/api/v1/accounts`

Class-level `[Authorize]` at `AccountsController.cs:12` applies to every endpoint below.

| Method and endpoint | Owner / IDOR | Validation / data exposure | Risk |
|---|---|---|---|
| `GET /` (`:28-46`) | Yes: filters `UserId` | Returns all non-archived accounts for the user, including balances, currency and external ID. No pagination. | Medium |
| `POST /` (`:48-66`) | Yes: creates with JWT user ID | Manual validation covers name/type/currency/balance, but request length and all related values need server-side limits. | Medium |
| `GET /{id}` (`:68-80`) | Yes: `id && UserId` | GUID constraint and ownership filter; returns account details. | Low |
| `PUT /{id}` (`:82-114`) | Mostly yes: loads by ID then compares owner | Correctly returns `NotFound` for another user, but related data is not validated beyond the account itself. | Low/Medium |
| `POST /{id}/archive` (`:116-135`) | Yes: loads by ID then compares owner | Good ownership check. State transition should be idempotent and audited. | Low |
| `DELETE /{id}` (`:137-end`) | Yes: account query includes owner; child deletes include owner | Destructive operation has no re-authentication/confirmation/audit endpoint-level control. | Medium |

### Kategorie — `/api/v1/categories`

Class-level `[Authorize]` at `CategoriesController.cs:12` applies to every endpoint.

| Method and endpoint | Owner / IDOR | Validation / data exposure | Risk |
|---|---|---|---|
| `GET /` (`:23-42`) | Yes: filters `UserId` | Returns all user categories, including system/archive fields. No pagination, but bounded by typical user data. | Low |
| `POST /` (`:44-59`) | Category owner is JWT user | `ParentId` is accepted without verifying the parent belongs to the same user; name/color/icon/length constraints are sparse. | Medium |
| `GET /{id}` (`:61-73`) | Yes: ID + user | Good ownership filter. | Low |
| `PUT /{id}` (`:75-105`) | Loads by ID, then compares owner | Owner check exists, but `ParentId` can reference another user's category unless explicitly validated. | Medium |
| `POST /{id}/archive` (`:107-end`) | Yes: loads by ID, then compares owner | Good ownership check; validate system-category transitions. | Low/Medium |

### Reguły kategorii — `/api/v1/category-rules`

Class-level `[Authorize]` exists at `CategoryRulesController.cs:12`, but object ownership is not consistently enforced.

| Method and endpoint | Owner / IDOR | Validation / data exposure | Risk |
|---|---|---|---|
| `GET /?userId=...` (`:23-37`) | **No.** Caller can select another `userId`; with no query it returns all rules | Leaks rule conditions, category IDs and user IDs across tenants. | High |
| `POST /` (`:40-49`) | **No.** Uses `request.UserId` and `request.CategoryId` | Caller can create rules for another user; neither user nor category ownership is verified. | Critical/High |
| `GET /{id}` (`:51-60`) | **No.** Queries only by rule ID | Direct cross-user rule disclosure. | High |
| `PUT /{id}` (`:62-87`) | **No.** Queries only by rule ID and trusts `request.UserId` | Cross-user modification and reassignment. | Critical/High |
| `DELETE /{id}` (`:89-end`) | Yes: ID + JWT user | Stronger than other rule actions; still validate related category ownership. | Low |

**Required changes:** remove `userId` from public input, derive it from claims, apply it to every query and update, and validate `CategoryId` ownership.

### Dashboard — `/api/v1/dashboard`

| Method and endpoint | Auth | Owner / IDOR | Validation / data exposure | Risk |
|---|---|---|---|---|
| `GET /summary?year=&month=` (`DashboardController.cs:23-end`) | Class-level `[Authorize]` at `:12` | Yes: all transaction/category/account queries use JWT user ID | `year` and `month` are nullable but not range-validated; invalid values may produce errors or expensive queries. Returns aggregate income, expenses, balances, recent transaction descriptions and category names. | Medium |

**Required changes:** constrain year/month ranges and add bounded date query behavior. Treat descriptions/counterparties as sensitive data in logs and responses.

### Importy — `/api/v1/imports`

| Method and endpoint | Auth | Owner / IDOR | Validation / data exposure | Risk |
|---|---|---|---|---|
| `POST /` multipart (`ImportsController.cs:25-end`) | Class-level `[Authorize]` | Account ownership is checked at `:31`; import service filters rules/categories by JWT user | Only empty-file validation exists. No byte/row/column/field limits, content-type enforcement, quota, timeout or safe streaming. `categoryMapping` is user JSON without size/depth/count limits. Errors may become generic 500s. Import logs retain titles. | High |

**Required changes:** enforce multipart and per-file limits, validate file signature/format, stream bounded CSV parsing, limit mapping JSON, cap row counts and processing time, and redact sensitive log values.

### Transakcje — `/api/v1/transactions`

Class-level `[Authorize]` at `TransactionsController.cs:12` applies to every endpoint.

| Method and endpoint | Owner / IDOR | Validation / data exposure | Risk |
|---|---|---|---|
| `GET /?accountId=&page=&pageSize=` (`:23-68`) | List filters by JWT `UserId`; account ID is not explicitly checked for ownership but user filter prevents cross-user rows | `pageSize` capped at 5000; page lower bound exists. No upper page bound or maximum response policy. | Low/Medium |
| `GET /{id}` (`:71-95`) | **No.** Query is by transaction ID only | Direct IDOR: another user's transaction can be returned when its GUID is known. Response contains account/user IDs, descriptions, counterparties, external IDs and amounts. | High |
| `POST /` (`:97-146`) | User ID is JWT-derived | Does not verify `request.AccountId` belongs to the current user; caller may create a transaction against another user's account. Category ownership is also not checked. | High |
| `PUT /{id}` (`:148-202`) | Loads by ID then compares owner | Ownership of target is checked; referenced refund is user-scoped. `AccountId` and `CategoryId` in the replacement payload are not verified as owned by the user. | Medium/High |
| `DELETE /all` (`:204-216`) | Deletes only JWT user's rows | Extremely destructive; no confirmation token, idempotency/audit record or rate limit. | High |
| `GET /{id}/splits` (`:218-226`) | Parent ownership is checked before read | Good parent check; keep an explicit ownership predicate in the split query for defense in depth. | Low |
| `PUT /{id}/splits` (`:228-241`) | Transaction is user-scoped | Validates count, positive amounts and sum; category IDs are not checked for same-user ownership. No maximum item count/memo length. | Medium |
| `DELETE /{id}` (`:243-260`) | Loads by ID then compares owner | Good target ownership check; destructive action should be audited and rate-limited. | Low/Medium |
| `POST /{id}/irrelevant` (`:263-272`) | ID + JWT user | Good ownership check; no explicit state transition validation. | Low |
| `POST /{id}/relevant` (`:275-284`) | ID + JWT user | Good ownership check; no explicit state transition validation. | Low |
| `PATCH /{id}/category` (`:287-end`) | ID + JWT user | Target ownership check exists, but supplied `categoryId` is not checked against the current user's categories. | Medium |

### Budżety — `/api/v1/budgets`

Class-level `[Authorize]` is applied at `BudgetsController.cs:10`.

| Method and endpoint | Owner / IDOR | Validation / data exposure | Risk |
|---|---|---|---|
| `GET /?month=` (`:16-33`) | Budget query is user-scoped; budget items are reached through that budget | `month` is nullable but no sensible date range validation. If no budget, returns an empty array. | Low/Medium |
| `POST /` (`:35-49`) | Budget is user-scoped, but category ownership is not checked | Year/month/date, currency, comment length and amount limits are incomplete. A caller can reference another user's category ID. | Medium |
| `DELETE /items/{id}` (`:51-61`) | Joins item to budget and checks budget user | Good ownership predicate; destructive action should be audited. | Low |

### Użytkownicy — `/api/v1/user`

| Method and endpoint | Auth | Owner / IDOR | Validation / data exposure | Risk |
|---|---|---|---|---|
| `DELETE /` (`UsersController.cs:18-end`) | Class-level `[Authorize]` | Uses JWT user ID only; no arbitrary user ID is accepted | Permanently deletes the user and many related records. Requires re-authentication/confirmation, audit logging, CSRF protection if cookies are introduced, and careful transaction/backup behavior. | High |

## Przekrojowe mechanizmy kontroli API

### Ograniczenie metod HTTP

All reviewed controller actions use explicit `[HttpGet]`, `[HttpPost]`, `[HttpPut]`, `[HttpPatch]` or `[HttpDelete]` attributes. No action was found relying on an implicit verb. Keep endpoint routing configured without broad fallback methods and add method-not-allowed tests.

### Walidacja modeli i parametrów

`[ApiController]` provides binding/format errors, including invalid GUIDs and malformed JSON, but it does not provide business validation by itself. Request records have few visible validation attributes. Add centralized validation for lengths, numeric/date ranges, enum values, currency codes, ownership of related IDs, pagination limits, upload limits and JSON depth/count.

### Obsługa błędów i ujawnianie informacji

Controllers return a mixture of `BadRequest`, `Unauthorized`, `NotFound` and `NoContent`. Service methods throw `InvalidOperationException` for authentication and import failures. There is no visible global production exception handler in `Program.cs`; `UseDeveloperExceptionPage` is Development-only, but unhandled production exceptions still need a controlled ProblemDetails response. Do not return stack traces, EF/database errors, internal IDs beyond what the client needs, or different responses that reveal account existence.

### Enumeracja użytkowników

- Login uses a generic invalid-credentials exception.
- Registration throws a distinct “email already exists” condition, which can reveal whether an account exists.
- No endpoint accepts an arbitrary user ID except category rules (which is itself an authorization defect).

Use a generic registration response or accept the small UX trade-off explicitly, plus rate limiting and monitoring.

### CORS, CSRF i tokeny bearer

The API currently uses an `Authorization` header from the frontend rather than cookies, so classic CSRF is limited. If authentication moves to cookies, add antiforgery tokens and SameSite/Secure/HttpOnly settings. Configure production CORS from an allowlist, not hard-coded localhost origins.

## Kolejność poprawek według priorytetu

1. Fix SEC-API-01: transaction `GetById` ownership predicate.
2. Fix category-rule CRUD to derive owner from JWT and remove caller-controlled `userId`.
3. Validate ownership of account/category IDs in transaction, category and budget writes.
4. Add global ProblemDetails handling and strict server-side DTO validation.
5. Add authentication and destructive-operation rate limiting/auditing.
6. Enforce upload limits and bounded parsing.
7. Rotate secrets, require production configuration, enforce HTTPS and restrict Swagger.
8. Add automated two-user endpoint authorization tests for every route in this report.
