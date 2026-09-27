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
- Transaction filtering displays a summary for all filtered results, including transaction count, expenses, income and net balance grouped by currency.
- Manual transaction creation and editing open in a modal window. The modal can be closed with the `X` button or by clicking outside it; after saving, it closes automatically. The action labels are `Dodaj transakcję` and `Zapisz zmiany`. Category pickers use an independent scrollable layer and open upward when needed.
- Categories support groups, subcategories, icons, colors, editing, alphabetical ordering and deletion.
- Dashboard supports monthly summaries, annual charts and PLN conversion for non-PLN balances.
- The `Przychody vs Wydatki` chart supports day, week, month, year and all-time ranges. Transactions marked as `Ignored` are excluded from its calculations.
- Import diagnostics report imported rows, duplicates and failed rows.
- CSV import requires selecting an account first; after import the selected file name is shown and a detailed `.txt` log can be downloaded.
- Budgets support monthly category planning, comments, actual spending, remaining amounts and deletion.
- Expenses can be linked to income transactions representing refunds.
- Expenses can be split into child transactions with separate categories, amounts and descriptions. Child amounts must sum to the parent expense amount.
- Linked refunds are represented as child rows in the transaction list and reduce the expense used in dashboard and reporting calculations.
- Reports include a separate `Planowanie` section with the `Budżet mieszkaniowy` report.
- The housing budget reports average monthly net income and basic living costs, accepts planned housing costs, applies a configurable safety buffer and calculates the amount remaining after the planned purchase.
- Basic living costs use available categories: `Spożywcze`, `Chemia`, `Zdrowie` and its subcategories, `Komórka`, `Internet`, `Zwierzęta` and its subcategories, `Edukacja` and its subcategories, `Rozrywka` and its subcategories, `Odzież i obuwie`, and current rent from `Czynsz i wynajem`.
- For the current year, monthly averages are divided by the number of months already started; completed years use all 12 months. The planning report supports selecting another year.

Detailed functional requirements and current behavior are documented in [`REQUIREMENTS.md`](REQUIREMENTS.md).

## Backend structure

- `src/backend/Api`
- `src/backend/Application`
- `src/backend/Domain`
- `src/backend/Infrastructure`

## Next step

Continue with automated tests for the implemented transaction import, filtering,
categorization, dashboard rules and the housing planning report. PDF export of the
planning report and persistent storage of planned housing costs remain future work.

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

### Kontrole jakości kodu

Polecenia uruchamiające sprawdzanie i formatowanie frontendu:

```bash
cd src/frontend
npm run lint
npm run lint:fix
npm run format
npm run build
```

### Okresy i kategorie transakcji

W zakładce **Transakcje** filtr okresu zawiera gotowe zakresy oraz opcję
**Inny okres**, która otwiera osobne okno wyboru daty początkowej i końcowej.
Filtr kategorii pozwala wybrać **Bez kategorii** albo **Wszystkie kategorie**.
Kategorie i podkategorie mogą posiadać ikony widoczne w filtrach, pickerach
i przy edycji transakcji.

## Ikony interfejsu

## Powiązanie wydatku ze zwrotem

Podczas edycji transakcji typu **Wydatek** można użyć pola **Połącz ze
zwrotem** i wskazać transakcję typu **Przychód**. Powiązanie jest zapisywane
na wydatku i można je usunąć, wybierając opcję **Brak powiązania**.

Kwoty źródłowych transakcji nie są zmieniane. Zwrot wpływa na koszt efektywny:

```text
koszt efektywny = kwota wydatku + kwota zwrotu
```

Przykład: wydatek `-879,97 PLN` i zwrot `+529,98 PLN` dają koszt efektywny
`-349,99 PLN`. Saldo konta nadal korzysta z pełnych, rzeczywistych operacji
bankowych. API dodatkowo sprawdza, że zwrot jest przychodem tego samego
użytkownika i nie jest tą samą transakcją.

## Podział transakcji

Transakcję typu **Wydatek** można podzielić na podtransakcje. Każda część może
mieć własną kategorię, kwotę i opis. Suma podtransakcji musi być równa kwocie
transakcji głównej. Transakcja główna pozostaje operacją bankową i jest
rozwijana na liście, aby pokazać podział.

## Wartość netto w zestawieniach

Jeżeli wydatek ma przypisany zwrot, w zestawieniach finansowych używana jest
wartość netto:

```text
wydatek netto = kwota wydatku + kwota zwrotu
```

Przykład: `-879,97 PLN` oraz `+529,98 PLN` daje `-349,99 PLN`. Powiązany zwrot
nie jest wtedy liczony drugi raz jako osobny przychód. Ta reguła jest używana
w podsumowaniu dashboardu, wykresie przychodów i wydatków, raportach oraz
budżetach.

## Usuwanie konta

Usunięcie konta w zakładce **Konta** jest operacją kaskadową. Wraz z kontem
usuwane są wszystkie przypisane do niego transakcje oraz powiązane partie
importów. Operacja jest trwała — jeśli chcesz zachować historię, użyj opcji
archiwizacji konta zamiast jego usuwania.

### Usuwanie wszystkich transakcji

W trybie **Edytuj transakcje** dostępna jest akcja **Usuń wszystkie transakcje**.
Przed wykonaniem operacji wyświetla się osobny monit bezpieczeństwa. Aby ją
zatwierdzić, należy wpisać `USUŃ`. Operacja trwale usuwa wszystkie transakcje
bieżącego użytkownika i nie można jej cofnąć.

Frontend korzysta z biblioteki `lucide-react`. Wszystkie nowe przyciski i
kontrolki interfejsu powinny używać ikon Lucide zamiast znaków tekstowych,
emoji lub ręcznie rysowanych symboli.

Przykład:

```tsx
import { Pencil, Trash2 } from "lucide-react";

<button type="button" aria-label="Edytuj" title="Edytuj">
  <Pencil size={16} />
  Edytuj
</button>

<button type="button" aria-label="Usuń" title="Usuń">
  <Trash2 size={16} />
</button>
```

Zasady:

- stosuj `16–18 px` dla ikon w przyciskach i filtrach oraz `20–22 px` dla
  nawigacji,
- przycisk zawierający wyłącznie ikonę musi mieć `aria-label` i `title`,
- używaj ikon z jednego zestawu: `ChevronDown`, `ChevronUp`, `Search`,
  `ArrowDownUp`, `Check`, `X`, `Trash2`, `Pencil`, `Tag` i podobnych,
- nie dodawaj nowych symboli typu `⌄`, `↕`, `🗑` ani emoji jako zamienników
  ikon interfejsu.

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
