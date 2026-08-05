# Code review — przegląd całego projektu

Data analizy: 2026-08-05  
Zakres: `src/backend`, `src/frontend`, `tests` oraz konfiguracja routingu.

## Podsumowanie

Przegląd statyczny nie wykazał aktywnych `TODO`, `FIXME`, `console.log`, `debugger` ani `NotImplementedException` w kodzie aplikacji. Nie znaleziono osobnych endpointów testowych ani oczywistego endpointu debugowego. Najważniejsze problemy dotyczą duplikacji projekcji DTO, nadmiarowych/nieużywanych elementów modelu domenowego oraz bardzo dużego komponentu transakcji.

## Znaleziska

| ID | Obszar | Ustalenie | Priorytet |
|---|---|---|---|
| CR-01 | Debug | `UseDeveloperExceptionPage` jest ograniczone do Development, ale Swagger i `/health` są dostępne niezależnie od środowiska | Medium |
| CR-02 | Duplikacja | Kontrolery Accounts, Categories i CategoryRules powtarzają projekcje list/detail oraz sprawdzanie właściciela | Medium |
| CR-03 | Duplikacja | `TransactionsController` powtarza pobieranie transakcji, sprawdzanie ownership i mapowanie DTO w wielu akcjach | Medium |
| CR-04 | Duplikacja | W `DashboardController` i `BudgetsController` powtarza się logika filtrowania/wykluczania ignorowanych transakcji i zwrotów | Medium |
| CR-05 | Frontend | `transactions-list.tsx` łączy import, edycję, podział, kategorie, filtry i paginację w jednym dużym module | Medium |
| CR-06 | Dead/nieużywany model | Domeny `Assets`, `Goals`, `Investments`, `Subscriptions`, `Tags`, `Attachments` mają konfiguracje/model, ale nie mają odpowiadających endpointów ani ekranów w aktualnym przepływie | Medium — potwierdzić zamiar |
| CR-07 | Dead artifact | `src/frontend/tsconfig.tsbuildinfo` jest wygenerowanym artefaktem kompilacji i nie powinien być częścią repozytorium | Low |
| CR-08 | Endpointy | `/health` jest endpointem operacyjnym, nie testowym; brak osobnych tras `test`/`debug` | Low |
| CR-09 | Jakość | W `BankProfiles.cs` kilka klas profili bankowych jest zapisanych w pojedynczych, bardzo długich liniach | Low |

## TODO, FIXME, console.log i debug

Przeszukanie kodu aplikacji z wykluczeniem `node_modules`, `bin`, `obj`, map sourcemap i `tsconfig.tsbuildinfo` nie znalazło:

- `TODO`, `FIXME`, `HACK` ani `XXX`;
- `console.log` lub `console.debug`;
- `debugger;`;
- `NotImplementedException`.

Wystąpienia słowa `debug` w `package-lock.json` dotyczą zależności npm, a `LogLevel: Debug` w `appsettings.Development.json` jest konfiguracją środowiska deweloperskiego.

## Endpointy debugowe i testowe

### Znalezione trasy specjalne

- `GET /health` w `Program.cs` — właściwy endpoint healthcheck; nie powinien ujawniać szczegółów infrastruktury.
- Swagger `/swagger` oraz `/swagger/v1/swagger.json` — przydatne lokalnie, ale w produkcji ograniczyć autoryzacją, VPN albo wyłączyć.

Nie znaleziono tras typu `/debug`, `/test`, `/seed`, `/mock` ani endpointów zwracających dane testowe.

## Zduplikowany kod

### Projekcje i ownership w kontrolerach

W `AccountsController`, `CategoriesController` i `CategoryRulesController` powtarza się wzorzec:

1. pobranie `userId` z JWT;
2. zapytanie po `id` i `UserId`;
3. projekcja do tego samego DTO listy/detail;
4. podobne odpowiedzi `NotFound`/`Unauthorized`.

Zalecenie: wprowadzić query handlers lub prywatne metody projekcji (`SelectAccountItem`, `SelectCategoryItem`) i wspólne helpery ownership. Nie przenosić autoryzacji wyłącznie do helpera bez zachowania czytelności warunku użytkownika.

### Transakcje

`TransactionsController` wykonuje podobne odczyty i sprawdzenia właściciela w akcjach edycji, usuwania, splitów, kategorii i statusu. Warto wydzielić `GetOwnedTransactionAsync` i osobne serwisy command/query.

### Import

Logika tworzenia transakcji jest wykonywana dwukrotnie w `TransactionImportService`: raz bez dopasowanej reguły, a następnie ponownie, gdy reguła zwróci kategorię. Lepiej wyliczyć `matchedCategoryId` przed jednym konstruktorem `Transaction` i utworzyć obiekt tylko raz.

## Potencjalnie martwy kod

### Modele bez aktualnych konsumentów

Statyczny przegląd znalazł modele i konfiguracje dla:

- `Asset`;
- `Goal`;
- `InvestmentAccount` i `InvestmentTransaction`;
- `Subscription`;
- `Tag`;
- `Attachment`;
- `NormalizedTransaction` i `RawTransaction`.

Nie znaleziono dla nich kontrolerów API w aktualnym zestawie endpointów ani ekranów frontendowych. Mogą być elementem planowanej funkcjonalności, więc nie należy ich usuwać bez potwierdzenia. Zalecane działanie: oznaczyć jako planned albo usunąć po potwierdzeniu, że nie są częścią roadmapy; usunięcie ograniczy migracje i koszt utrzymania modelu.

### Klasy i interfejsy

Nie można wiarygodnie potwierdzić nieużywanej klasy samym `rg`, ponieważ klasy są rejestrowane przez DI, refleksję EF Core lub implementują interfejs. Dotyczy to szczególnie konfiguracji `IEntityTypeConfiguration<>`, profili bankowych i serwisów z `DependencyInjection.cs`.

Do potwierdzenia użyć:

- analizatora Roslyn/IDE `Find All References`;
- `dotnet build` z ostrzeżeniami analyzerów;
- raportu pokrycia endpointów podczas testów integracyjnych;
- `depcheck`/bundle analyzer po stronie frontendu.

## Frontend — organizacja i duplikacja

`transactions-list.tsx` jest największym punktem koncentracji odpowiedzialności. Powinien zostać podzielony na:

- `TransactionToolbar`;
- `TransactionTable`/`TransactionRow`;
- `TransactionEditorModal`;
- `ImportDialog`;
- `CategoryPicker`;
- `DeleteAllDialog`;
- hooki `useTransactions` i `useTransactionFilters`.

W kodzie występuje powtarzane formatowanie dat, kwot i wyszukiwanie po opisie/kontrahencie. Wydzielenie helperów ograniczy rozjazdy formatowania i ułatwi testy.

## Nieużywane endpointy

Wszystkie kontrolery mają odpowiadające moduły API w frontendowych plikach `*-api.ts` albo są używane przez dashboard/transakcje. Na podstawie statycznego przeglądu nie ma potwierdzonego nieużywanego endpointu.

Do pełnego potwierdzenia produkcyjnego należy zebrać telemetrykę routingu przez 30 dni i sprawdzić:

- częstotliwość wywołań każdego endpointu;
- odpowiedzi 404/405/5xx;
- endpointy używane tylko przez stare wersje frontendu;
- Swagger routes i healthchecki wywoływane przez infrastrukturę.

## Artefakty i higiena repozytorium

`src/frontend/tsconfig.tsbuildinfo` zawiera wygenerowany cache TypeScript. Powinien być ignorowany przez Git i usunięty z repozytorium, jeśli jest śledzony. Nie usuwałem go automatycznie, ponieważ zmiany użytkownika w repozytorium pozostają poza zakresem tego przeglądu.

Warto również regularnie sprawdzać wygenerowane `.next`, `bin`, `obj`, logi oraz tymczasowe pliki importu.

## Plan poprawy

1. Ograniczyć Swagger do Development lub zabezpieczyć go na produkcji.
2. Wydzielić wspólne zapytania/projekcje i ownership helpers w backendzie.
3. Uprościć `TransactionImportService`, eliminując podwójne tworzenie transakcji.
4. Rozbić `transactions-list.tsx` na komponenty i hooki.
5. Potwierdzić przydatność modeli Assets/Goals/Investments/Subscriptions/Tags/Attachments.
6. Dodać analizatory Roslyn/ESLint i reguły CI dla TODO/debug logów oraz artefaktów builda.
7. Wykorzystać telemetrykę do decyzji o usunięciu endpointów, zamiast opierać ją wyłącznie na wyszukiwaniu tekstowym.

## Ograniczenia

To jest przegląd statyczny. Nie dowodzi, że każda klasa jest używana w runtime, ani że endpoint nie jest wywoływany przez zewnętrznego klienta. Usuwanie kodu wymaga testów kompilacji, testów integracyjnych i potwierdzenia kontraktów API.
