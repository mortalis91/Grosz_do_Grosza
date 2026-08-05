# Menedżer finansów osobistych — architektura

## Cel

Repozytorium będzie zawierać komercyjnej klasy menedżer finansów osobistych inspirowany aplikacjami Kontomierz, YNAB, Wallet i Portfolio Performance, ale szerszy zakresem:

- import i normalizacja transakcji bankowych,
- obsługa wielu rachunków,
- budżetowanie i analiza przepływów pieniężnych,
- automatyzacja kategorii i reguł,
- śledzenie inwestycji i wartości netto,
- subskrypcje i wydatki cykliczne,
- integracja z Allegro,
- klasyfikacja wspomagana przez AI i wyszukiwanie językiem naturalnym.

Rozwiązanie jest najpierw projektowane jako monolit modułowy, z wyraźnymi granicami umożliwiającymi późniejsze wydzielenie usług, jeśli będzie to potrzebne.

## Zasady architektury

- Clean Architecture,
- SOLID,
- granice DDD,
- CQRS dla przypadków użycia aplikacji,
- jawne modele domenowe, bez anemicznego modelu projektowanego wyłącznie pod persystencję,
- brak logiki biznesowej w kontrolerach,
- izolacja infrastruktury za interfejsami,
- testowalność jako wymaganie pierwszej klasy.

## Przegląd systemu

### Frontend

- Next.js 15,
- React,
- TypeScript,
- Tailwind CSS,
- shadcn/ui,
- TanStack Query,
- TanStack Table,
- Recharts,
- React Hook Form,
- Zod.

### Backend

- ASP.NET Core 10,
- Entity Framework Core,
- PostgreSQL,
- FluentValidation,
- MediatR,
- AutoMapper,
- Hangfire,
- Redis,
- Swagger / OpenAPI,
- uwierzytelnianie JWT.

## Zakres zrealizowanego MVP

Obecna implementacja jest monolitem modułowym z PostgreSQL i frontendem Next.js. Zrealizowane pionowe fragmenty obejmują uwierzytelnianie, konta i salda, kategorie, transakcje, importy CSV oraz podsumowania dashboardu. Transakcje używają miękkiego usuwania przez status `Archived` i wykluczają transakcje `Ignored` z podsumowań przychodów i wydatków. Pozostałe moduły opisane poniżej przedstawiają docelową architekturę i nie oznaczają, że każdy z nich jest już zaimplementowany.

### Infrastruktura pomocnicza

- PostgreSQL jako źródło prawdy,
- Redis do cache, koordynacji zadań w tle i stanów krótkotrwałych,
- Hangfire do importów, uzgadniania danych, zadań AI, synchronizacji i zaplanowanych przeliczeń,
- Docker i Docker Compose do developmentu lokalnego oraz zgodności wdrożeń,
- GitHub Actions do CI.

## Granice wysokiego poziomu

Backend jest zorganizowany jako monolit modułowy z ograniczonymi kontekstami:

1. Tożsamość i dostęp,
2. Konta,
3. Transakcje,
4. Kategorie i reguły,
5. Importy,
6. Budżety,
7. Cele,
8. Majątek i inwestycje,
9. Subskrypcje,
10. Raporty i analityka,
11. Integracja z Allegro,
12. Asystenci AI i wyszukiwanie,
13. Audyt i dziennik aktywności,
14. Powiadomienia.

Każdy moduł posiada:

- encje domenowe i obiekty wartości,
- przypadki użycia aplikacji,
- walidatory,
- repozytoria i adaptery persystencji,
- kontrakty API,
- testy.

## Struktura repozytorium

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

Zawiera:

- encje,
- obiekty wartości,
- agregaty,
- zdarzenia domenowe,
- serwisy domenowe,
- interfejsy repozytoriów.

Zasady:

- brak atrybutów EF Core,
- brak DTO,
- brak pojęć HTTP,
- brak odwołań do infrastruktury.

#### Aplikacja

Zawiera:

- komendy i zapytania,
- handlery,
- walidatory,
- DTO i modele odczytu,
- serwisy aplikacyjne,
- profile mapowania.

Zasady:

- koordynuje logikę domenową,
- zależy wyłącznie od warstwy Domain,
- nie ma bezpośredniego dostępu do bazy,
- nie zawiera kodu zależnego od HTTP.

#### Infrastruktura

Zawiera:

- `DbContext` EF Core,
- migracje,
- implementacje repozytoriów,
- integracje zewnętrzne,
- zadania Hangfire,
- adaptery cache Redis,
- magazyn plików,
- dostawców poczty i powiadomień,
- narzędzia do parsowania.

#### API

Zawiera:

- endpointy REST,
- uwierzytelnianie i autoryzację,
- kontrakty żądań i odpowiedzi,
- middleware,
- konfigurację Swagger,
- mapowanie wyjątków.

## Architektura frontendu

Frontend będzie organizowany według funkcji, a nie wyłącznie według warstw technicznych.

Proponowane obszary:

- auth,
- dashboard,
- accounts,
- transactions,
- categories,
- rules,
- imports,
- budgets,
- goals,
- assets,
- investments,
- reports,
- allegro,
- ai,
- settings.

Zasady frontendu:

- domyślnie używać server components, jeśli jest to praktyczne,
- client components stosować tylko dla ekranów wymagających intensywnej interakcji,
- używać TanStack Query do stanu serwera,
- używać React Hook Form + Zod do formularzy,
- używać TanStack Table do tabel transakcji,
- współdzielone komponenty systemu projektowego utrzymywać w `shadcn/ui`.

## Strategia modelu domenowego

Główne agregaty domenowe:

- `User`, `Account`, `Transaction`, `Category`, `CategoryRule`, `Budget`, `Goal`, `Asset`, `InvestmentAccount`, `ImportBatch`, `Subscription`, `AuditLog`.

Pojęcia pomocnicze:

- `Money`, `Currency`, `AccountBalanceSnapshot`, `TransactionSplit`, `Merchant`, `Counterparty`, `Attachment`, `Tag`, `ImportSource`, `RuleCondition`.

## Przepływ danych

### Import transakcji

1. Parser CSV, MT940, OFX lub bankowy pobiera dane surowe.
2. Wiersze surowe są normalizowane do kanonicznego modelu importu.
3. Przed zapisem uruchamiane jest wykrywanie duplikatów.
4. Transakcje są tworzone lub aktualizowane.
5. Stosowane są reguły i kategoryzacja.
6. Przeliczane są salda kont i podsumowania pochodne.
7. Zapisywana jest historia importu i logi.

### Dashboard i raporty

1. Frontend wysyła żądanie do endpointu podsumowania.
2. Warstwa aplikacji składa modele odczytu.
3. Infrastruktura odczytuje dane z bazy i cache’owanych projekcji.
4. API zwraca zagregowane dane zoptymalizowane dla wykresów i tabel.

### AI i wyszukiwanie

1. Użytkownik zadaje pytanie językiem naturalnym.
2. Zapytanie jest klasyfikowane według intencji.
3. Pobierane są odpowiednie transakcje, kategorie, konta lub raporty.
4. Wynik jest zamieniany na zrozumiałą odpowiedź oraz dane strukturalne.

## Projekt API

API będzie przede wszystkim REST-owe i wersjonowane.

Wytyczne:

- przestrzeń tras `/api/v1/...`,
- paginacja endpointów list,
- filtrowanie i sortowanie endpointów odczytu,
- endpointy komend zwracają jawne kontrakty wyników,
- błędy walidacji używają spójnej odpowiedzi Problem Details,
- uwierzytelnianie przez tokeny bearer JWT.

## Strategia trwałości danych

Schemat PostgreSQL będzie oparty na:

- znormalizowanych danych transakcyjnych,
- logach importu przyjaznych dopisywaniu,
- zdenormalizowanych tabelach podsumowań tylko wtedy, gdy są potrzebne dla wydajności,
- możliwości audytowania zmian finansowych.

Migracje EF Core będą domyślnym mechanizmem ewolucji schematu.

## Przetwarzanie w tle

Hangfire będzie używany do:

- zadań importu bankowego,
- uzgadniania duplikatów,
- stosowania reguł kategorii,
- przeliczania budżetów,
- odświeżania wycen inwestycji,
- zadań synchronizacji Allegro,
- wzbogacania danych przez AI,
- wstępnego obliczania raportów.

## Wymagania bezpieczeństwa

- uwierzytelnianie JWT,
- autoryzacja oparta na rolach,
- bezpieczny proces resetowania hasła,
- logowanie audytowe wrażliwych operacji,
- walidacja danych wejściowych w każdym miejscu,
- ochrona przed zduplikowanymi importami i ponownie odtworzonymi komendami.

## Strategia testów

### Backend

- testy jednostkowe logiki domenowej,
- testy handlerów aplikacyjnych,
- testy integracyjne API i persystencji,
- testy parserów CSV i formatów bankowych.

### Frontend

- testy komponentów krytycznych elementów UI,
- testy stron i przepływów głównych ścieżek użytkownika,
- testy walidacji formularzy.

## Etapy dostarczania

Projekt będzie realizowany przyrostowo:

1. analiza wymagań,
2. architektura i granice modułów,
3. model bazy danych,
4. fundament backendu,
5. fundament frontendu,
6. import CSV,
7. automatyczna kategoryzacja,
8. dashboard,
9. raporty,
10. integracja z Allegro,
11. funkcje AI,
12. testy i hardening,
13. Docker i wdrożenie,
14. dokumentacja.

## Bieżąca decyzja

Pierwszym celem implementacji powinien być fundament backendu wraz ze ścieżką importu CSV Pekao, ponieważ tworzy to pierwszy pionowy fragment realnej wartości i wcześnie waliduje główny model danych finansowych.
