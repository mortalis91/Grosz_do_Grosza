# Przegląd bezpieczeństwa API

Data: 2026-08-05  
Zakres: wszystkie endpointy kontrolerów w `src/backend/Api/Controllers`.  
Rodzaj przeglądu: statyczna inwentaryzacja endpointów oraz analiza autoryzacji i walidacji. Nie zastępuje to uwierzytelnionego testu penetracyjnego API z użyciem dwóch użytkowników.

## Podsumowanie zarządcze

Większość kontrolerów biznesowych ma `[Authorize]`, a większość operacji zapisu wyznacza właściciela z JWT. Przed produkcją trzeba jednak naprawić potwierdzone luki:

- `GET /api/v1/transactions/{id}` nie filtruje po bieżącym użytkowniku — możliwe ujawnienie cudzej transakcji.
- Lista, tworzenie, odczyt i edycja reguł kategorii przyjmują lub ufają `userId` od klienta.
- Część endpointów przyjmuje identyfikatory powiązanych encji bez sprawdzenia ich właściciela.
- Logowanie i rejestracja są anonimowe, ale nie mają rate limitingu ani ochrony przed enumeracją.
- Walidacja jest głównie ręczna i niepełna; limity uploadu i zapytań są niewystarczające.

Wdrożono już część poprawek: ownership transakcji, reguł kategorii, kategorii nadrzędnych i budżetów, limity importu CSV, konfigurowalny CORS, rate limiting oraz blokadę logowania po nieudanych próbach.

## Inwentaryzacja endpointów

### Uwierzytelnianie — `/api/v1/auth`

| Metoda i endpoint | Auth | Właściciel / IDOR | Walidacja i błędy | Ryzyko |
|---|---|---|---|---|
| `POST /register` | Nie | Nie dotyczy | Brak widocznych serwerowych limitów długości i polityki haseł. Wyjątek dla powtórzonego e-maila może ujawniać istnienie konta. Brak rate limitingu. Token zwracany od razu. | Wysokie |
| `POST /login` | Nie | Nie dotyczy | Ogólny komunikat błędu, ale brak throttlingu, blokady i ochrony przed brute force. Token bearer ważny 8 godzin. | Wysokie |

**Wymagane zmiany:** rate limiting, serwerowe ograniczenia DTO, jednolita odpowiedź rejestracji, krótkie tokeny dostępowe i refresh tokeny.

**Aktualny status:** rate limiting działa per IP, a dodatkowa blokada konta po 5 nieudanych próbach trwa 15 minut. Stan blokady jest przechowywany w pamięci procesu. Przy wielu instancjach backendu należy przenieść go do współdzielonego Redis lub bazy, aby każda instancja widziała te same próby i blokady.

### Konta — `/api/v1/accounts`

`[Authorize]` na poziomie klasy `AccountsController.cs:12` obejmuje wszystkie poniższe endpointy.

| Metoda i endpoint | Właściciel / IDOR | Walidacja / ujawniane dane | Ryzyko |
|---|---|---|---|
| `GET /` | Tak: filtruje `UserId` | Zwraca aktywne konta, salda, waluty i zewnętrzne ID; brak paginacji. | Średnie |
| `POST /` | Tak: użytkownik z JWT | Ręczna walidacja istnieje, ale brakuje limitów długości i wszystkich powiązanych wartości. | Średnie |
| `GET /{id}` | Tak: `id && UserId` | Ograniczenie GUID i właściciela jest poprawne. | Niskie |
| `PUT /{id}` | W większości tak | Właściciel jest sprawdzany; dane powiązane wymagają dodatkowej walidacji. | Niskie/średnie |
| `POST /{id}/archive` | Tak | Poprawna kontrola właściciela; przejście stanu powinno być idempotentne i audytowane. | Niskie |
| `DELETE /{id}` | Tak | Operacja destrukcyjna nie wymaga ponownego uwierzytelnienia ani potwierdzenia. | Średnie |

### Kategorie — `/api/v1/categories`

| Metoda i endpoint | Właściciel / IDOR | Walidacja / ujawniane dane | Ryzyko |
|---|---|---|---|
| `GET /` | Tak: filtruje `UserId` | Zwraca kategorie użytkownika, także pola systemowe/archiwalne. | Niskie |
| `POST /` | Właściciel z JWT | `ParentId` nie jest sprawdzany pod kątem właściciela; ograniczenia nazwy/koloru/ikony są skąpe. | Średnie |
| `GET /{id}` | Tak | Poprawny filtr właściciela. | Niskie |
| `PUT /{id}` | Tak | `ParentId` może wskazać kategorię innego użytkownika. | Średnie |
| `POST /{id}/archive` | Tak | Poprawna kontrola; trzeba walidować zmiany kategorii systemowych. | Niskie/średnie |

**Aktualny status:** `ParentId` jest sprawdzany pod kątem przynależności do bieżącego użytkownika przy tworzeniu i edycji.

### Reguły kategorii — `/api/v1/category-rules`

`[Authorize]` istnieje, ale własność obiektów nie jest konsekwentnie sprawdzana.

| Metoda i endpoint | Właściciel / IDOR | Problem | Ryzyko |
|---|---|---|---|
| `GET /?userId=...` | **Nie** | Klient może wybrać obcego `userId`; ujawniane są warunki, ID kategorii i ID użytkowników. | Wysokie |
| `POST /` | **Nie** | Używa `request.UserId` i `request.CategoryId`; możliwe tworzenie reguł dla innego użytkownika. | Krytyczne/wysokie |
| `GET /{id}` | **Nie** | Zapytanie tylko po ID reguły umożliwia ujawnienie cudzej reguły. | Wysokie |
| `PUT /{id}` | **Nie** | Możliwa modyfikacja i przypisanie reguły innemu użytkownikowi. | Krytyczne/wysokie |
| `DELETE /{id}` | Tak | Lepsza kontrola niż w pozostałych akcjach; nadal sprawdzać właściciela kategorii. | Niskie |

**Wymagane zmiany:** usunąć `userId` z publicznego wejścia, wyznaczać go z claims, stosować we wszystkich zapytaniach i sprawdzać własność `CategoryId`.

### Dashboard — `/api/v1/dashboard`

`GET /summary?year=&month=` jest chroniony `[Authorize]`. Zapytania używają `UserId` z JWT, ale `year` i `month` nie mają walidacji zakresu. Odpowiedź zawiera agregaty przychodów/wydatków, salda, opisy ostatnich transakcji i nazwy kategorii.

**Ryzyko:** średnie. Ograniczyć zakres roku/miesiąca, daty i ilość danych; traktować opisy i kontrahentów jako dane wrażliwe.

### Importy — `/api/v1/imports`

`POST /` multipart jest chroniony. Własność konta jest sprawdzana, a reguły/kategorie są pobierane dla użytkownika JWT. Brakuje jednak limitów bajtów, wierszy, kolumn, pól, typu content, quota, timeoutu i bezpiecznego streamingu. `categoryMapping` nie ma limitów rozmiaru/głębokości/liczby elementów, a logi zachowują tytuły.

**Ryzyko:** wysokie. Dodać limity multipart/pliku, walidację formatu, ograniczony parser strumieniowy, limit mapowania JSON, limit czasu i maskowanie logów.

### Transakcje — `/api/v1/transactions`

| Metoda i endpoint | Właściciel / IDOR | Problem | Ryzyko |
|---|---|---|---|
| `GET /?accountId=&page=&pageSize=` | Lista filtruje po JWT `UserId` | `pageSize` ma limit 5000, ale brak górnego limitu strony i polityki odpowiedzi. | Niskie/średnie |
| `GET /{id}` | **Nie** | Zapytanie tylko po ID; znając UUID można odczytać cudzą transakcję wraz z opisem, kontrahentem i kwotą. | Wysokie |
| `POST /` | User ID z JWT | `AccountId` i `CategoryId` nie są sprawdzane pod kątem właściciela. | Wysokie |
| `PUT /{id}` | Cel jest sprawdzany | `AccountId` i `CategoryId` w payloadzie nie są weryfikowane jako należące do użytkownika. | Średnie/wysokie |
| `DELETE /all` | Usuwa tylko dane użytkownika JWT | Bardzo destrukcyjne; brak tokenu potwierdzającego, audytu i rate limitingu. | Wysokie |
| `GET /{id}/splits` | Sprawdza właściciela rodzica | Dodać jawny filtr właściciela również w zapytaniu splitów. | Niskie |
| `PUT /{id}/splits` | Transakcja jest ograniczona do użytkownika | Brak sprawdzenia własności kategorii oraz limitu liczby elementów/długości memo. | Średnie |
| `DELETE /{id}` | Sprawdza właściciela | Kontrola poprawna; operację audytować i limitować. | Niskie/średnie |
| `POST /{id}/irrelevant` | ID + JWT user | Kontrola poprawna; brak walidacji przejścia stanu. | Niskie |
| `POST /{id}/relevant` | ID + JWT user | Kontrola poprawna; brak walidacji przejścia stanu. | Niskie |
| `PATCH /{id}/category` | Cel jest ograniczony do użytkownika | `categoryId` nie jest sprawdzane względem kategorii użytkownika. | Średnie |

### Budżety — `/api/v1/budgets`

Endpointy mają `[Authorize]`. Budżet jest ograniczony do użytkownika, ale tworzenie nie sprawdza własności `CategoryId`; miesiąc, rok, waluta, komentarz i kwoty mają niepełne limity. Usuwanie elementu sprawdza użytkownika przez relację z budżetem.

**Ryzyko:** niskie/średnie dla odczytu i usuwania, średnie dla tworzenia.

**Aktualny status:** tworzenie budżetu sprawdza właściciela kategorii, zakres roku/miesiąca, walutę i maksymalną kwotę.

### Użytkownicy — `/api/v1/user`

`DELETE /` korzysta wyłącznie z ID użytkownika z JWT i nie przyjmuje arbitralnego ID. Trwale usuwa użytkownika oraz wiele powiązanych danych.

**Ryzyko:** wysokie. Wymaga ponownego uwierzytelnienia, potwierdzenia, audytu, transakcji i procedury usuwania z backupów.

## Przekrojowe mechanizmy kontroli API

### Ograniczenie metod HTTP

Wszystkie akcje używają jawnych atrybutów `[HttpGet]`, `[HttpPost]`, `[HttpPut]`, `[HttpPatch]` lub `[HttpDelete]`. Nie znaleziono akcji polegającej na domyślnej metodzie. Dodać testy 405 Method Not Allowed.

### Walidacja modeli i parametrów

`[ApiController]` obsługuje błędy wiązania, ale sam nie zapewnia walidacji biznesowej. Dodać centralną walidację długości, zakresów liczb i dat, enumów, walut, właścicieli powiązanych ID, paginacji, uploadu oraz głębokości/liczby elementów JSON.

### Obsługa błędów i ujawnianie informacji

Kontrolery zwracają `BadRequest`, `Unauthorized`, `NotFound` i `NoContent`, a serwisy rzucają `InvalidOperationException`. Brakuje widocznego globalnego handlera produkcyjnego. Zastosować kontrolowany ProblemDetails i nie zwracać stack trace, błędów EF/bazy ani odpowiedzi ujawniających istnienie konta.

### Enumeracja użytkowników

Logowanie używa ogólnego błędu, ale rejestracja rozróżnia „e-mail już istnieje”. Użyć ogólnej odpowiedzi rejestracji, rate limitingu i monitoringu.

### CORS, CSRF i tokeny bearer

API używa nagłówka `Authorization`, a nie cookies, więc klasyczne CSRF jest ograniczone. Przy przejściu na cookies dodać antiforgery oraz SameSite/Secure/HttpOnly. Produkcyjny CORS konfigurować przez allowlistę, nie przez hard-coded localhost.

**Aktualny status CORS:** allowlista jest pobierana z `Cors:AllowedOrigins`, poza Development obowiązuje zasada fail-closed, a dozwolone metody i nagłówki są ograniczone.

## Kolejność poprawek według priorytetu

1. Dodać filtr właściciela do `TransactionsController.GetById`.
2. Naprawić CRUD reguł kategorii: właściciel wyłącznie z JWT, usunąć sterowane przez klienta `userId`.
3. Sprawdzać własność `AccountId` i `CategoryId` w zapisach transakcji, kategorii i budżetów.
4. Dodać globalny ProblemDetails i rygorystyczną walidację DTO po stronie serwera.
5. Dodać rate limiting i audyt operacji uwierzytelniających oraz destrukcyjnych.
6. Wprowadzić limity uploadu i parser ograniczony zasobami.
7. Zrotować sekrety, wymusić konfigurację produkcyjną, HTTPS i ograniczyć Swagger.
8. Dodać automatyczne testy autoryzacji dwóch użytkowników dla każdej trasy.

## Status po wdrożonych poprawkach

- Odczyt cudzej transakcji: filtr `UserId` dodany i zweryfikowany testem dwóch użytkowników.
- Reguły kategorii: właściciel wyznaczany z JWT, usunięto sterowanie `userId` przez klienta.
- Kategorie nadrzędne i budżety: walidacja właściciela powiązanych `CategoryId`/`ParentId` dodana.
- Import CSV: limity rozmiaru, wierszy, kolumn i długości pól dodane; parser czyta plik wierszami, ale wynik jest jeszcze materializowany do listy.
- CORS: konfiguracja środowiskowa i fail-closed dodane.
- Rate limiting: dodany dla logowania i rejestracji.
- Blokada brute force: 5 nieudanych prób powoduje blokadę na 15 minut w ramach jednej instancji procesu; Redis jest wymagany przy skalowaniu horyzontalnym.
- Nadal do wykonania: HttpOnly cookie/BFF, refresh tokeny, pełne testy integracyjne endpointów i rozproszony magazyn blokad.
