# Analiza wydajności

Data analizy: 2026-08-05  
Zakres: backend EF Core/PostgreSQL oraz frontend Next.js/React.

## Podsumowanie

Build produkcyjny frontendu zakończył się sukcesem. Wyniki Next.js: współdzielony First Load JS około **101 kB**, a największe strony mają około **120–122 kB** First Load JS. Nie znaleziono oczywistego klasycznego N+1 w kontrolerach, ale są miejsca z wieloma zapytaniami na jedno żądanie oraz obliczeniami wykonywanymi w pamięci.

Najważniejsze optymalizacje:

1. poprawić obliczenia budżetu z `Where(...).Sum(...)` wykonywanymi dla każdego elementu;
2. rozważyć agregację dashboardu w jednym zapytaniu lub endpointie projekcyjnym;
3. dodać cache krótkotrwały dla stabilnych słowników i agregatów;
4. rozbić duży `transactions-list.tsx` na ładowane warunkowo komponenty oraz dodać wirtualizację dla dużych tabel;
5. poprawić ostrzeżenie `useEffect` i zastąpić `<img>` przez `next/image`.

## Wyniki builda frontendu

Polecenie `npm run build` zakończyło się kodem 0.

| Trasa | Rozmiar strony | First Load JS |
|---|---:|---:|
| `/` | 136 B | 101 kB |
| `/accounts` | 4.17 kB | 110 kB |
| `/budgets` | 1.75 kB | 122 kB |
| `/categories` | 5.82 kB | 112 kB |
| `/dashboard` | 6.45 kB | 113 kB |
| `/settings` | 2.47 kB | 122 kB |
| `/transactions` | 180 B | 120 kB |
| shared | — | 101 kB |

To są dobre rozmiary początkowe dla obecnego zakresu aplikacji, ale tabela transakcji jest funkcjonalnie ciężka i wymaga testu przy tysiącach rekordów.

Build zgłosił dwa ostrzeżenia:

- `app/budgets/page.tsx`: `useEffect` ma brakującą zależność `refresh`;
- `components/app-shell.tsx`: używany jest `<img>`, co może pogarszać LCP i zwiększać transfer.

## Backend — zapytania i N+1

### Brak potwierdzonego klasycznego N+1

Kontrolery używają projekcji `Select`, `AsNoTracking`, paginacji i zapytań zbiorczych. Nie znaleziono pętli, w której każda iteracja wykonuje osobne zapytanie EF Core.

### Miejsca wymagające optymalizacji

#### `BudgetsController`

Aktualna logika pobiera transakcje do pamięci, a następnie dla każdego `budgetItem` wykonuje LINQ `transactions.Where(...).Sum(...)` w pamięci. Przy `B` elementach budżetu i `T` transakcjach jest to około O(B×T).

Zalecenie: najpierw wykonać agregację po `CategoryId` w SQL (`GroupBy` + `Sum`), pobrać słownik wyników i wykonać jedno przejście po elementach budżetu. Kwoty zwrotów również agregować po stronie bazy.

#### `DashboardController`

Dashboard wykonuje oddzielne zapytania dla ostatnich transakcji, wydatków kategorii, nazw kategorii, kont i powiązań zwrotów. To nie jest N+1, ale jedno żądanie powoduje kilka round-tripów.

Zalecenie: utrzymać projekcje, ale rozważyć jeden endpoint z równoległymi zapytaniami albo materializowanymi agregatami miesięcznymi. Nie wykonywać równoległych operacji na tym samym `DbContext`; użyć osobnych scope/contextów albo sekwencyjnie połączyć zapytania.

#### `UsersController.Delete`

Usuwanie konta pobiera całe kolekcje wielu tabel do pamięci przez `ToListAsync`, a następnie śledzi je przed usunięciem. Dla dużego konta może zużyć dużo RAM i długo blokować bazę.

Zalecenie: użyć cascade delete, `ExecuteDeleteAsync` lub procedury batchowej w transakcji, po pełnym sprawdzeniu relacji i backupu.

#### Import CSV

Parser ładuje linie i drafty do pamięci. Dla małych plików bankowych jest to akceptowalne, ale brak limitu rozmiaru/wierszy może prowadzić do wysokiego zużycia pamięci.

Zalecenie: limit pliku i wierszy, streaming parsera, batchowe zapisy oraz limit czasu operacji.

## Indeksy bazy

Znalezione indeksy obejmują m.in.:

- `Users.Email` — unikalny;
- `Accounts(UserId, AccountType)`;
- `Transactions(UserId, ExternalTransactionId)`;
- `Transactions(UserId, AccountId, OccurredAt)`;
- `Transactions(UserId, CategoryId, OccurredAt)`;
- `CategoryRules(UserId, IsEnabled, Priority)`;
- `Categories(UserId, ParentId)`;
- `Budgets(UserId, PeriodType, StartDate)`;
- `BudgetItems(BudgetId, CategoryId)` — unikalny;
- `ImportBatches(UserId, AccountId, SourceHash)` — unikalny;
- `ImportLogs(ImportBatchId, RowNumber)`.

Indeksy dobrze pokrywają główne filtry transakcji. Do weryfikacji po danych produkcyjnych:

- `Transactions(UserId, OccurredAt DESC)` z dodatkowymi kolumnami/indeksem dopasowanym do filtrów statusu i konta;
- indeksy częściowe dla aktywnych transakcji (`Status <> 'Ignored'`), jeśli PostgreSQL i workload to uzasadnią;
- indeksy na FK używanych w usuwaniu i raportach;
- plan zapytań przez `EXPLAIN (ANALYZE, BUFFERS)` dla listy transakcji, dashboardu i budżetów.

Nie należy dodawać indeksów bez pomiaru: zwiększają koszt INSERT/importu i zużycie storage.

## Pamięć podręczna

Nie znaleziono cache aplikacyjnego ani `revalidate`/tagged cache Next.js. Można bezpiecznie rozważyć:

- cache kategorii systemowych i słowników przez `IMemoryCache` lub Redis;
- cache krótkotrwały agregatów dashboardu/budżetu z kluczem `userId + okres + wersja danych`;
- invalidację po imporcie, edycji i usunięciu transakcji;
- cache HTTP wyłącznie dla danych niesensytywnych; dane finansowe powinny mieć `no-store` lub `private`.

Nie cache’ować odpowiedzi użytkownika bez izolacji po `userId`.

## Frontend — renderowanie React

Wiele ekranów jest komponentami klienckimi z `useEffect` i `useState`. Należy sprawdzić, czy odświeżenie filtrów nie powoduje wielokrotnego pobierania danych i pełnego renderowania tabeli.

Zalecenia:

- naprawić brakującą zależność `refresh` w `app/budgets/page.tsx`;
- stabilizować callbacki przekazywane do dużych komponentów przez `useCallback` tylko tam, gdzie pomiar wykazuje korzyść;
- użyć `useMemo` dla drogich sum, filtrowania i mapowania kategorii;
- wydzielić wiersz transakcji do `React.memo`;
- debouncować wyszukiwanie tekstowe i zakres kwot;
- nie przechowywać całego importu/logu w stanie, jeśli użytkownik go nie ogląda;
- ograniczyć liczbę aktualizacji stanu podczas edycji modalnej.

Największy potencjalny koszt dotyczy `transactions-list.tsx`, który zawiera import, filtry, edycję, picker kategorii, podział i paginację w jednym komponencie.

## Leniwe ładowanie i wirtualizacja

Nie znaleziono użycia `dynamic()`, `React.lazy` ani wirtualizacji listy. Rekomendacje:

- ładować modal edycji, picker kategorii i import CSV dynamicznie, gdy są otwierane;
- rozważyć wirtualizację tabeli dla widoków powyżej 100–200 wierszy;
- utrzymać paginację serwerową jako podstawową ochronę przed dużym payloadem;
- nie ładować ciężkich wykresów raportów na stronach, które ich nie używają.

## Rozmiar bundla i tree shaking

Bundle jest obecnie umiarkowany, a Next.js wykonuje tree shaking dla importów ESM. Do dalszej kontroli:

- uruchomić `@next/bundle-analyzer` w CI okresowo;
- importować ikony z `lucide-react` pojedynczo, nie przez szeroki barrel import;
- unikać importowania bibliotek tylko dla prostych funkcji formatowania;
- sprawdzić, czy `transactions-list.tsx` nie trafia do wspólnego chunka przez layout;
- utrzymywać produkcyjny build bez source mapów publicznych, jeśli nie są potrzebne.

## Plan pomiarów

1. Włączyć logowanie czasu zapytań EF Core tylko w środowisku testowym/benchmarkowym.
2. Zebrać `EXPLAIN ANALYZE` dla listy transakcji, dashboardu, raportów i budżetu.
3. Wykonać test z 10k, 100k i 1M transakcji jednego użytkownika.
4. Zmierzyć LCP/INP/CLS oraz czas otwarcia tabeli na słabszym urządzeniu.
5. Porównać bundle przed i po lazy loadingu modalów.
6. Dodać regresyjne limity: czas API, liczba zapytań na endpoint i First Load JS.

## Priorytety

- **P1:** zoptymalizować agregację budżetu i zweryfikować plany SQL.
- **P1:** ograniczyć pamięciowe przetwarzanie usuwania konta i importu.
- **P2:** dodać cache słowników/agregatów z prawidłową izolacją użytkownika.
- **P2:** rozbić ciężki komponent transakcji, dodać memoizację i lazy loading modalów.
- **P2:** naprawić ostrzeżenia builda (`refresh`, `next/image`).
- **P3:** włączyć bundle analyzer, wirtualizację i testy wydajnościowe CI.

## Ograniczenia

Analiza statyczna i build nie zastępują testu obciążeniowego ani profilowania na danych produkcyjnych. Ostateczna decyzja o indeksach i cache powinna wynikać z rzeczywistych planów zapytań i metryk.
