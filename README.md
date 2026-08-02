# Grosz do Grosza

Personal Finance Manager built with:

- ASP.NET Core 10 backend
- Next.js 15 frontend
- PostgreSQL

## Current status

- Authentication with JWT and protected API calls is implemented.
- PostgreSQL persistence and EF Core migrations are implemented.
- Accounts support bank, brokerage, deposit and pension account types, currencies and current balances.
- Transactions support manual entry, CSV import, categorization, filtering, sorting, editing, soft deletion and bulk actions.
- Categories support groups, subcategories, icons, colors, editing, alphabetical ordering and deletion.
- Dashboard supports monthly summaries, annual charts and PLN conversion for non-PLN balances.
- Import diagnostics report imported rows, duplicates and failed rows.
- Budgets support monthly category planning, comments, actual spending, remaining amounts and deletion.

Detailed functional requirements and current behavior are documented in [`REQUIREMENTS.md`](REQUIREMENTS.md).

## Backend structure

- `src/backend/Api`
- `src/backend/Application`
- `src/backend/Domain`
- `src/backend/Infrastructure`

## Next step

Continue with automated tests for the implemented transaction import, filtering,
categorization and dashboard rules. Planned modules such as budgets, goals,
investments, recurring payments and AI classification remain outside the current MVP.

## Local PostgreSQL

Start the database with Podman Desktop or from the terminal:

```bash
podman compose up -d
```

The backend uses:

- host: `localhost`
- port: `5432`
- database: `grosz_do_grosza`
- user: `postgres`
- password: `postgres`

## Uruchomienie lokalne

### Wymagania

- .NET SDK 10
- Node.js 20 lub nowszy oraz npm
- Podman Desktop (albo Docker) z obsługą Compose

### 1. Uruchom PostgreSQL

W katalogu głównym projektu wykonaj:

```bash
podman compose up -d
```

Kontener PostgreSQL będzie dostępny pod `localhost:5432`. Przy pierwszym
uruchomieniu backend automatycznie zastosuje migracje Entity Framework Core.

### 2. Uruchom backend

W drugim terminalu, również w katalogu głównym projektu:

```bash
dotnet run --project src/backend/Api/GroszDoGrosza.Api.csproj
```

API będzie dostępne pod adresem `http://localhost:5000`, a dokumentacja Swagger
pod `http://localhost:5000/swagger`.

### 3. Uruchom frontend

W trzecim terminalu:

```bash
cd src/frontend
npm install
npm run dev -- --hostname localhost --port 3000
```

Aplikacja webowa będzie dostępna pod adresem `http://localhost:3000`.

Frontend korzysta domyślnie z API pod `http://localhost:5000`. Można zmienić ten
adres, ustawiając zmienną środowiskową `NEXT_PUBLIC_BACKEND_API_URL` w pliku
`src/frontend/.env.local`.

### Testy backendu

Testy można uruchomić z katalogu głównego poleceniem:

```bash
dotnet test
```

### Zatrzymanie środowiska

Po zakończeniu pracy zatrzymaj bazę danych:

```bash
podman compose down
```
