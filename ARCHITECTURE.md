# Menedżer finansów osobistych — architektura

## Cel

This repository will host a commercial-grade Personal Finance Manager inspired by Kontomierz, YNAB, Wallet, and Portfolio Performance, but broader in scope:

- bank transaction import and normalization
- multi-account financial tracking
- budgeting and cashflow analysis
- category automation and rules
- investments and net worth tracking
- subscriptions and recurring expenses
- Allegro integration
- AI-assisted classification and natural language search

The solution is designed as a modular monolith first, with clear seams that allow future service extraction if required.

## Zasady architektury

- Clean Architecture
- SOLID
- DDD boundaries
- CQRS for application use cases
- explicit domain models, no anemic persistence-first design
- zero business logic in controllers
- infrastructure isolated behind interfaces
- testability as a first-class requirement

## Przegląd systemu

### Frontend

- Next.js 15
- React
- TypeScript
- Tailwind CSS
- shadcn/ui
- TanStack Query
- TanStack Table
- Recharts
- React Hook Form
- Zod

### Backend

- ASP.NET Core 10
- Entity Framework Core
- PostgreSQL
- FluentValidation
- MediatR
- AutoMapper
- Hangfire
- Redis
- Swagger / OpenAPI
- JWT authentication

## Zakres zrealizowanego MVP

The current implementation is a modular monolith with PostgreSQL and a Next.js
frontend. The implemented vertical slices are authentication, accounts and
balances, categories, transactions, CSV imports and dashboard summaries.
Transactions use soft deletion through the `Archived` status and exclude
`Ignored` transactions from income and expense summaries. The remaining module
list below describes the target architecture and is not a claim that every
module is implemented.

### Infrastruktura pomocnicza

- PostgreSQL as the source of truth
- Redis for caching, background job coordination, and short-lived states
- Hangfire for imports, reconciliation, AI jobs, sync jobs, and scheduled recalculations
- Docker and Docker Compose for local development and deployment parity
- GitHub Actions for CI

## Granice wysokiego poziomu

The backend is structured as a modular monolith with bounded contexts:

1. Identity and Access
2. Accounts
3. Transactions
4. Categories and Rules
5. Imports
6. Budgets
7. Goals
8. Assets and Investments
9. Subscriptions
10. Reports and Analytics
11. Allegro Integration
12. AI Assistants and Search
13. Audit and Activity Log
14. Notifications

Each module owns:

- domain entities and value objects
- application use cases
- validators
- repositories and persistence adapters
- API contracts
- tests

## Struktura repozytorium

The codebase will follow this structure:

```text
src/
  backend/
    Api/
    Application/
    Domain/
    Infrastructure/
  frontend/
    app/
    components/
    features/
    lib/
    hooks/
    styles/
tests/
  backend/
  frontend/
docs/
```

### Warstwy backendu

#### Domena

Contains:

- entities
- value objects
- aggregates
- domain events
- domain services
- repository interfaces

Rules:

- no EF Core attributes
- no DTOs
- no HTTP concepts
- no infrastructure references

#### Aplikacja

Contains:

- commands and queries
- handlers
- validators
- DTOs and read models
- application services
- mapping profiles

Rules:

- orchestrates domain logic
- depends on Domain only
- no direct database access
- no HTTP-specific code

#### Infrastruktura

Contains:

- EF Core DbContext
- migrations
- repository implementations
- external integrations
- Hangfire jobs
- Redis cache adapters
- file storage
- email and notification providers
- parsing utilities

#### API

Contains:

- REST endpoints
- authentication and authorization
- request/response contracts
- middleware
- Swagger setup
- exception mapping

## Architektura frontendu

The frontend will be organized by feature rather than by technical layer only.

Suggested areas:

- auth
- dashboard
- accounts
- transactions
- categories
- rules
- imports
- budgets
- goals
- assets
- investments
- reports
- allegro
- ai
- settings

Frontend rules:

- server components by default where practical
- client components only for interaction-heavy screens
- TanStack Query for server state
- React Hook Form + Zod for forms
- TanStack Table for transaction grids
- reusable design system components in `shadcn/ui`

## Strategia modelu domenowego

The domain will be centered around these core aggregates:

- `User`
- `Account`
- `Transaction`
- `Category`
- `CategoryRule`
- `Budget`
- `Goal`
- `Asset`
- `InvestmentAccount`
- `ImportBatch`
- `Subscription`
- `AuditLog`

Supporting concepts:

- `Money`
- `Currency`
- `AccountBalanceSnapshot`
- `TransactionSplit`
- `Merchant`
- `Counterparty`
- `Attachment`
- `Tag`
- `ImportSource`
- `RuleCondition`

## Przepływ danych

### Import transakcji

1. CSV, MT940, OFX, or bank-specific parser ingests raw data.
2. Raw rows are normalized into a canonical import model.
3. Duplicate detection runs before persistence.
4. Transactions are created or updated.
5. Rules and categorization are applied.
6. Account balances and derived summaries are recalculated.
7. Import history and logs are stored.

### Dashboard i raporty

1. Frontend requests a summary endpoint.
2. Application layer composes read models.
3. Infrastructure reads from the database and cached projections.
4. API returns aggregated data optimized for charts and tables.

### AI i wyszukiwanie

1. User asks a natural-language question.
2. The query is classified into intent.
3. Relevant transactions, categories, accounts, or reports are retrieved.
4. The result is converted into a human-readable answer plus structured data.

## Projekt API

The API will be REST-first and versioned.

Guidelines:

- `/api/v1/...` route namespace
- pagination on list endpoints
- filtering and sorting on read endpoints
- command endpoints return explicit result contracts
- validation errors use a consistent problem-details response
- authentication via JWT bearer tokens

## Strategia trwałości danych

PostgreSQL schema will be designed around:

- normalized transactional data
- append-friendly import logs
- denormalized summary tables only when needed for performance
- auditability for financial changes

EF Core migrations will be the default schema evolution mechanism.

## Przetwarzanie w tle

Hangfire will be used for:

- bank import jobs
- duplicate reconciliation
- category rule application
- budget recalculation
- investment valuation refresh
- Allegro sync jobs
- AI enrichment tasks
- report precomputation

## Wymagania bezpieczeństwa

- JWT authentication
- role-based authorization
- secure password reset flow
- audit logging for sensitive operations
- input validation everywhere
- protection against duplicate imports and replayed commands

## Strategia testów

### Backend

- unit tests for domain logic
- application handler tests
- integration tests for API and persistence
- parser tests for CSV and bank formats

### Frontend

- component tests for critical UI
- page and flow tests for main journeys
- form validation tests

## Etapy dostarczania

This project will be implemented incrementally:

1. requirements analysis
2. architecture and boundaries
3. database model
4. backend foundation
5. frontend foundation
6. CSV import
7. automatic categorization
8. dashboard
9. reports
10. Allegro integration
11. AI features
12. tests and hardening
13. Docker and deployment
14. documentation

## Bieżąca decyzja

The first implementation target should be the backend foundation plus the Pekao CSV import path, because that creates the first vertical slice of real value and validates the core financial data model early.
