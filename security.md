# Audyt bezpieczeństwa

Data: 2026-08-05  
Zakres: API ASP.NET Core, frontend Next.js, konfiguracja PostgreSQL/Compose oraz zawartość repozytorium.  
Metoda: statyczny przegląd kodu i konfiguracji, analiza zależności/builda oraz celowane testy lokalne. Nie wykonano uwierzytelnionego testu penetracyjnego, testu infrastruktury produkcyjnej, skanowania kontenerów ani zewnętrznego DAST. Po wdrożeniu poprawek ustalenia należy ponownie zweryfikować.

## Podsumowanie zarządcze

Aplikacja nie jest gotowa do publicznego wdrożenia produkcyjnego. Najważniejsze blokery to:

1. Dostęp użytkownika do danych innego użytkownika w regułach kategorii i endpointach transakcji (IDOR / wadliwa autoryzacja obiektowa).
2. Hasła bazy danych i JWT zapisane bezpośrednio w konfiguracji, w tym awaryjny klucz JWT dla developmentu.
3. Brak limitowania żądań i blokady konta przy logowaniu/rejestracji.
4. Brak limitów przesyłania plików oraz kontroli zasobów podczas przetwarzania CSV.
5. Brak wymuszenia HTTPS, nagłówków bezpieczeństwa i produkcyjnej konfiguracji CORS.
6. Tokeny dostępowe są przechowywane w `localStorage`, co umożliwia ich kradzież po XSS lub przejęciu klienta.

## Podsumowanie ryzyka

| Ryzyko              |           Liczba | Główne przykłady                                                                  |
| ------------------- | ---------------: | --------------------------------------------------------------------------------- |
| Krytyczne           | 0 potwierdzonych | Nie potwierdzono nieuwierzytelnionego RCE ani SQL Injection w analizie statycznej |
| Wysokie             |                7 | IDOR, sekrety, brute force, DoS importu, przechowywanie JWT, brak HTTPS           |
| Średnie             |                8 | Nagłówki, CORS, Swagger, haszowanie haseł, walidacja i logowanie                  |
| Niskie/informacyjne |                5 | Brak powierzchni cookies/CSRF, brak wykonywania poleceń, usprawnienia zależności  |

## Ustalenia

### SEC-01 — Wadliwa autoryzacja obiektowa transakcji — wysokie

**Zagrożenie:** Uwierzytelniony użytkownik znający UUID innej transakcji może ją odczytać. Ujawnia to dane finansowe i stanowi IDOR (OWASP A01:2021).

**Miejsce:** `src/backend/Api/Controllers/TransactionsController.cs:72-92`, metoda `GetById` filtruje tylko po `x.Id == id`, bez ograniczenia `x.UserId`.

**Poprawka:** Dodać `x.Id == id && x.UserId == userId.Value`, a dla obcego obiektu zwracać `NotFound()`. Dodać testy odczytu, edycji, usuwania i splitów dla dwóch użytkowników.

### SEC-02 — Wadliwa autoryzacja obiektowa reguł kategorii — wysokie

**Zagrożenie:** Reguły kategorii można enumerować między użytkownikami oraz tworzyć/aktualizować z dowolnym `request.UserId`. Umożliwia to ujawnienie i modyfikację cudzych danych.

**Miejsce:** `src/backend/Api/Controllers/CategoryRulesController.cs:24-75`.

**Poprawka:** Ignorować `userId` z query/body i wyznaczać właściciela wyłącznie przez `User.GetUserId()`. Dodać `x.UserId == currentUserId` w `GetAll`, `GetById` i `Update`; sprawdzać, czy `CategoryId` należy do tego samego użytkownika.

### SEC-03 — Sekrety zapisane w kodzie i niebezpieczny fallback JWT — wysokie

**Zagrożenie:** Osoba mająca dostęp do repozytorium może tworzyć tokeny lub uzyskać dostęp do bazy. Fallback pozwala uruchomić aplikację z powszechnie znanym kluczem.

**Miejsce:** `compose.yml:9` (`POSTGRES_PASSWORD: postgres`), connection string i `Jwt:Key` w `src/backend/Api/appsettings.json`, fallback `dev-only-change-me-dev-only-change-me` w `src/backend/Api/Program.cs:38`.

**Poprawka:** Usunąć sekrety ze śledzonych plików, użyć secret managera/zmiennych środowiskowych, przerwać start poza Development przy braku sekretów, wymagać losowego klucza minimalnej długości, wykonać rotację i używać osobnych danych dla każdego środowiska.

### SEC-04 — Brak limitowania żądań i blokad uwierzytelniania — wysokie

**Zagrożenie:** Logowanie i rejestrację można atakować brute force, spamować lub wykorzystywać do wyczerpania zasobów.

**Miejsce:** `src/backend/Api/Controllers/AuthController.cs:18-31`, `src/backend/Infrastructure/Auth/AuthService.cs`.

**Poprawka:** Dodać rate limiting per IP i identyfikator konta, wykładnicze opóźnienie/tymczasową blokadę, limity body, monitoring i alerty. Zachować ogólne komunikaty błędów, aby nie umożliwiać enumeracji e-maili.

### SEC-05 — Niebezpieczny cykl życia JWT i przechowywanie w przeglądarce — wysokie

**Zagrożenie:** Tokeny są ważne osiem godzin, nie mają odświeżania, unieważniania ani rotacji i są zapisane w `localStorage`. Każdy XSS lub przejęty skrypt może wyprowadzić token bearer.

**Miejsce:** `src/backend/Infrastructure/Auth/JwtTokenService.cs:24-41`; `src/frontend/lib/session.ts:1-15`.

**Poprawka:** Stosować krótkie tokeny dostępowe (5–15 minut) oraz rotowane, haszowane tokeny odświeżające przechowywane po stronie serwera. Preferować sesję przez HttpOnly, Secure, SameSite cookie lub BFF.

### SEC-06 — Brak wymuszenia HTTPS — wysokie

**Zagrożenie:** Dane logowania, JWT i dane finansowe mogą zostać przechwycone lub zmodyfikowane przez HTTP.

**Miejsce:** `src/backend/Api/Program.cs:82-87`, `src/frontend/.env.local:1`, instrukcje HTTP w `README.md`.

**Poprawka:** Zakończyć TLS na zaufanym reverse proxy lub Kestrel, przekierowywać HTTP do HTTPS, włączyć HSTS wyłącznie w produkcji i używać adresów HTTPS API.

### SEC-07 — Nielimitowany upload i import CSV — wysokie

**Zagrożenie:** Duże lub uszkodzone pliki mogą wyczerpać pamięć/CPU. Brakuje limitów rozmiaru, wierszy, pól, czasu i przestrzeni.

**Miejsce:** `src/backend/Api/Controllers/ImportsController.cs:27-40`; `src/backend/Infrastructure/Imports/Parsers/CsvParser.cs:7-14` ładuje cały plik do pamięci.

**Poprawka:** Wprowadzić limity multipart, pliku, wierszy, kolumn i długości pól, walidację rozszerzenia i typu, timeouty, limity per użytkownik oraz parser strumieniowy. Nie ufać `fileName` przy ścieżkach plików.

### SEC-08 — Brak nagłówków bezpieczeństwa i polityki błędów — średnie

Brakuje CSP, ochrony przed framingiem, `nosniff`, polityki referrera i Permissions Policy. Dodać `Content-Security-Policy`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, `frame-ancestors`/`X-Frame-Options` oraz ogólny handler błędów produkcyjnych.

### SEC-09 — Swagger dostępny w każdym środowisku — średnie

**Zagrożenie:** Publiczny schemat API ułatwia mapowanie aplikacji.

**Miejsce:** `src/backend/Api/Program.cs:68-75`.

**Poprawka:** Włączać Swagger tylko w Development albo chronić go sieciowo/autoryzacją.

### SEC-10 — CORS nieprzygotowany do produkcji — średnie

**Zagrożenie:** Dozwolone są sztywne adresy localhost, a `AllowAnyHeader` i `AllowAnyMethod` są zbyt szerokie.

**Poprawka:** Czytać allowlistę z konfiguracji, domyślnie odmawiać, ograniczyć metody/nagłówki i nie łączyć wildcard origin z credentials.

### SEC-11 — Haszowanie haseł wymaga wersjonowania — średnie

PBKDF2-SHA256 z 100 000 iteracji jest lepszy niż plaintext, ale ma stały koszt i brak ścieżki podnoszenia parametrów. Użyć `PasswordHasher<TUser>` ASP.NET Core lub Argon2id/scrypt, wersjonowanego formatu i rehash-on-login.

### SEC-12 — Niepełna walidacja rejestracji i żądań — średnie

Brakuje serwerowych limitów długości nazw, e-maili, kategorii, opisów i wartości liczbowych. Dodać FluentValidation/DataAnnotations, walidację e-maila, dozwolone enumy/waluty i globalne limity rozmiaru żądań.

### SEC-13 — Wrażliwe opisy trafiają do logów importu — średnie

`TransactionImportService.cs:75,118` zapisuje `draft.Title` w `ImportLog`. Maskować dane, ograniczyć retencję i dostęp oraz nie logować tokenów, haseł ani pełnych request body.

### SEC-14 — Token po stronie klienta i ryzyko XSS — średnie

React domyślnie ucieka tekst, a `dangerouslySetInnerHTML` nie znaleziono, ale `localStorage` zwiększa skutki przyszłego XSS. Użyć HttpOnly cookie/BFF, CSP i testów bezpiecznego renderowania.

### SEC-15 — Zewnętrzne żądanie NBP — niskie/średnie

Frontend odwołuje się do stałego URL NBP, więc nie jest to obecnie SSRF sterowany przez użytkownika. Dodać timeout, obsługę błędów i cache albo kontrolowany proxy z allowlistą.

## Sprawdzone klasy podatności

| Obszar                    | Ocena                                                                                                   |
| ------------------------- | ------------------------------------------------------------------------------------------------------- |
| SQL Injection             | Nie znaleziono konkatenacji SQL; LINQ EF Core jest parametryzowany.                                     |
| XSS                       | Nie znaleziono oczywistego niebezpiecznego renderowania HTML; wymagane CSP i testy.                     |
| CSRF                      | API używa nagłówka bearer i nie używa cookies auth, więc klasyczne CSRF jest obecnie ograniczone.       |
| SSRF                      | Nie znaleziono sterowanego przez użytkownika URL backendu. Stały URL NBP jest kontrolowaną zależnością. |
| Path Traversal            | Nie znaleziono ścieżki pliku budowanej z danych użytkownika.                                            |
| Command Injection         | Nie znaleziono wykonywania procesów/powłoki.                                                            |
| Deserialization           | JSON mapowania użytkownika wymaga limitów rozmiaru, głębokości i liczby elementów.                      |
| File Upload               | Wysokie ryzyko z powodu braku limitów i parsera ograniczonego pamięcią.                                 |
| Authentication            | Logowanie/rejestracja istnieją, ale brakuje rate limitingu i blokad.                                    |
| Authorization             | Potwierdzono IDOR w transakcjach i regułach kategorii.                                                  |
| JWT                       | Walidacja podpisu działa, ale fallback sekretu, długi czas życia i brak rotacji są ryzykiem.            |
| Refresh Token             | Nie znaleziono endpointu ani magazynu tokenów odświeżających.                                           |
| CORS                      | Lokalne originy są lepsze niż wildcard, ale konfiguracja produkcyjna jest nieobecna.                    |
| Cookies                   | Nie znaleziono cookies auth; przy migracji użyć HttpOnly/Secure/SameSite.                               |
| Nagłówki bezpieczeństwa   | Nie są skonfigurowane; zob. SEC-08.                                                                     |
| HTTPS                     | Nie jest wymuszane; zob. SEC-06.                                                                        |
| Rate limiting/brute force | Nie jest skonfigurowane; zob. SEC-04.                                                                   |
| Haszowanie haseł          | PBKDF2 ze stałym kosztem i bez wersjonowania; zob. SEC-11.                                              |
| Wycieki sekretów          | Hasło bazy, klucz JWT i lokalny URL API są w konfiguracji; zob. SEC-03.                                 |
| Zmienne środowiskowe      | `.env.local` jest tylko deweloperskie, a sekrety backendu nie są zewnętrzne.                            |
| Logowanie                 | Zapisywane są tytuły importów; należy je ograniczyć i chronić.                                          |
| IDOR                      | Potwierdzono w `TransactionsController.GetById` i regułach kategorii.                                   |

## Mapowanie na OWASP Top 10: 2021

| Kategoria OWASP                                | Status                                                                    |
| ---------------------------------------------- | ------------------------------------------------------------------------- |
| A01 Broken Access Control                      | Wysokie — SEC-01 i SEC-02.                                                |
| A02 Cryptographic Failures                     | Wysokie — sekrety, HTTP i token localStorage.                             |
| A03 Injection                                  | Nie znaleziono SQL/command injection; walidować JSON i pliki.             |
| A04 Insecure Design                            | Wysokie — brak kontroli nadużyć, limitów uploadu i unieważniania tokenów. |
| A05 Security Misconfiguration                  | Wysokie — Swagger, nagłówki, HTTPS i domyślne ustawienia.                 |
| A06 Vulnerable and Outdated Components         | Wymaga skanera zależności/SBOM.                                           |
| A07 Identification and Authentication Failures | Wysokie — brute force, długi JWT, brak refresh/revocation.                |
| A08 Software and Data Integrity Failures       | Średnie — dodać skanowanie lockfile/SBOM i podpisy artefaktów CI.         |
| A09 Security Logging and Monitoring Failures   | Średnie — brak widocznej strategii audytu i alertów.                      |
| A10 Server-Side Request Forgery                | Obecnie niskie — stały URL NBP.                                           |

## Bramka produkcyjna

Nie publikować aplikacji, dopóki co najmniej SEC-01–SEC-07 nie zostaną poprawione i zweryfikowane automatycznymi testami dwóch użytkowników. Przed startem wymagane są również TLS, rotacja sekretów, produkcyjny CORS, rate limiting, limity uploadu, nagłówki bezpieczeństwa, kontrolowany Swagger, skanowanie CVE, backupy bazy, monitoring oraz zewnętrzny uwierzytelniony test penetracyjny.

## Zalecane polecenia weryfikacyjne

```powershell
dotnet test
dotnet build Backend.sln --configuration Release
Set-Location src/frontend
npm ci
npm run lint
npm run build
```

Dodać testy dynamiczne: odczyt transakcji innego użytkownika, CRUD reguł kategorii, uszkodzone/za duże uploady, throttling logowania, wygasłe i zmodyfikowane JWT, originy CORS, brak sekretów produkcyjnych, nagłówki bezpieczeństwa i przekierowania HTTPS.

## Wyniki wykonania audytu

- `dotnet test Backend.sln --configuration Release --no-restore`: **niepowodzenie** — 2 istniejące testy parsera oczekują `Lista_operacji_20260712_205807.csv` w katalogu głównym, a plik znajduje się w `attachments/old/`. To problem fixture/ścieżki testowej, nie pozytywny wynik bezpieczeństwa.
- `npm run lint`: zakończone 4 ostrzeżeniami i 0 błędów. Dotyczą brakującej zależności efektu React, optymalizacji `<img>` i anonimowych eksportów konfiguracji.
- `npm run build`: zakończone pomyślnie podczas audytu.
- `dotnet build Backend.sln --configuration Release --no-restore`: nie zostało niezależnie zaakceptowane z równoległego uruchomienia, ponieważ procesy build/test blokowały assembly; należy uruchomić ponownie sekwencyjnie po zatrzymaniu procesów API/testów.
