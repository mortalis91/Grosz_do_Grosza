# Lista kontrolna gotowości produkcyjnej

Data przeglądu: 2026-08-05  
Zakres: konfiguracja ASP.NET Core, Next.js, Compose, PostgreSQL i pliki środowiskowe.

## Werdykt

**Aplikacja nie jest jeszcze gotowa do wdrożenia publicznego.** Najpoważniejsze blokery to jawne sekrety, brak wymuszenia HTTPS i brak produkcyjnych nagłówków bezpieczeństwa. Dodatkowo nie ma potwierdzonej konfiguracji backupów, monitoringu, kompresji ani bezpiecznego procesu migracji.

## Lista kontrolna

| Obszar | Status | Ustalenie / wymaganie |
|---|---|---|
| HTTPS | **BLOCKER** | Backend nie używa `UseHttpsRedirection`; frontend ma lokalny adres HTTP. TLS musi terminować reverse proxy lub Kestrel. |
| HSTS | **BLOCKER** | Brak `UseHsts` i `Strict-Transport-Security`. Włączyć dopiero po poprawnym wdrożeniu HTTPS. |
| CSP | **BLOCKER** | Brak skonfigurowanej Content-Security-Policy. Dodać restrykcyjną politykę dopasowaną do assetów i API. |
| X-Frame-Options | **HIGH** | Brak nagłówka. Ustawić `DENY` albo `SAMEORIGIN`; równolegle użyć `frame-ancestors` w CSP. |
| X-Content-Type-Options | **HIGH** | Brak `nosniff`. Dodać na frontendzie i API/reverse proxy. |
| Referrer-Policy | **MEDIUM** | Brak. Zalecane `strict-origin-when-cross-origin` lub ostrzejsze. |
| Permissions-Policy | **MEDIUM** | Brak. Wyłączyć nieużywane funkcje, np. `camera=(), microphone=(), geolocation=()`. |
| Cache headers | **MEDIUM** | Brak jawnej polityki. Dane finansowe i odpowiedzi API powinny mieć `Cache-Control: no-store` lub `private`; statyczne assety mogą mieć długi immutable cache. |
| Gzip | **NOT VERIFIED** | Nie znaleziono konfiguracji kompresji. Skonfigurować w reverse proxy/CDN lub ASP.NET Core. |
| Brotli | **NOT VERIFIED** | Nie znaleziono konfiguracji. Włączyć w reverse proxy/CDN po testach z `Accept-Encoding`. |
| Compression | **NOT VERIFIED** | Nie ma dowodu, że odpowiedzi są kompresowane. Zweryfikować nagłówki `Content-Encoding` i wykluczyć kompresowanie danych wrażliwych w podatnych scenariuszach BREACH. |
| Logging | **PARTIAL** | Jest podstawowy provider ASP.NET (`Information`, `Microsoft.AspNetCore=Warning`). Brak retencji, redakcji sekretów, centralizacji i korelacji żądań. |
| Monitoring | **MISSING** | Jest tylko `/health`; brak metryk, alertów, uptime, śledzenia błędów i monitoringu restartów/bazy. |
| Backups | **MISSING** | Named volume PostgreSQL nie jest backupem. Brak polityki RPO/RTO, szyfrowania, retencji i testów odtworzenia. |
| Migrations | **RISKY** | `dbContext.Database.Migrate()` uruchamia migracje przy każdym starcie API. W produkcji migracje powinny być kontrolowanym krokiem deployu. |
| Database permissions | **BLOCKER** | Aplikacja używa superusera `postgres`. Utworzyć osobnego użytkownika aplikacyjnego z minimalnymi uprawnieniami. |
| Connection strings | **BLOCKER** | Connection string z hasłem znajduje się w `appsettings.json`; usunąć sekret z repozytorium i dostarczać go przez secret manager. |
| Secrets | **BLOCKER** | JWT key oraz hasło PostgreSQL są jawne i domyślne. Wygenerować losowe sekrety, usunąć fallback JWT i wykonać rotację. |
| Environment variables | **PARTIAL** | `.env.local` zawiera publiczny lokalny URL API. Produkcja wymaga HTTPS API URL; sekrety backendu muszą być w środowisku/secret managerze. |

## Szczegółowe ustalenia

### HTTPS, HSTS i nagłówki

W `src/backend/Api/Program.cs` nie znaleziono `UseHttpsRedirection`, `UseHsts` ani middleware ustawiającego nagłówki. W `src/frontend/.env.local` znajduje się:

```text
NEXT_PUBLIC_BACKEND_API_URL=http://localhost:5000
```

To jest poprawne tylko dla developmentu. Produkcja powinna używać wyłącznie zaufanego HTTPS, np. `https://api.example.com`.

Najlepiej skonfigurować nagłówki w jednym kontrolowanym reverse proxy/CDN:

```text
Strict-Transport-Security: max-age=31536000; includeSubDomains
Content-Security-Policy: default-src 'self'; frame-ancestors 'none'; object-src 'none'; base-uri 'self'
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=()
```

Przed włączeniem CSP należy sprawdzić wszystkie skrypty, fonty, obrazy, endpointy API i zewnętrzne źródła używane przez aplikację.

### Pamięć podręczna i kompresja

Nie znaleziono jawnej konfiguracji cache ani kompresji. Wymagana polityka:

- odpowiedzi z transakcjami, raportami, profilem i tokenami: `Cache-Control: no-store`;
- dane publiczne, jeśli kiedykolwiek wystąpią: `private` lub krótki `max-age`;
- assety Next.js z hashem: długi cache `public, max-age=31536000, immutable`;
- gzip/Brotli w reverse proxy lub CDN, z testem `Vary: Accept-Encoding`;
- nie kompresować sekretów w sposób zwiększający ryzyko BREACH przy reflektowanym input.

### Logowanie i monitoring

Konfiguracja logowania jest podstawowa. Przed produkcją dodać:

- strukturalne logi JSON z correlation/request ID;
- redakcję haseł, JWT, connection stringów, cookies i danych finansowych;
- centralny agregator logów, kontrolę dostępu i retencję;
- alerty na 5xx, nieudane logowania, brute force, restart loop i błędy migracji;
- metryki czasu odpowiedzi, throughput, aktywnych połączeń DB, błędów i wykorzystania zasobów;
- monitoring `/health` oraz osobny readiness check zależności.

Nie logować pełnych nagłówków `Authorization`, request body importów ani connection stringów.

### Kopie zapasowe i migracje

Migracje EF Core są obecne, ale automatyczne `Database.Migrate()` w starcie API może powodować race conditions, długi start i niekontrolowaną zmianę schematu. Zalecany proces:

1. backup/snapshot przed zmianą;
2. `dotnet ef database update` lub zatwierdzony bundle migracyjny jako osobny krok deployu;
3. smoke test i readiness check;
4. plan rollbacku lub migracji kompatybilnej wstecz.

Dla PostgreSQL wdrożyć szyfrowany backup poza hostem, retencję, RPO/RTO oraz cykliczny test restore. Sam `postgres_data` nie zapewnia żadnego z tych elementów.

### Baza, connection stringi i sekrety

Obecne wartości w `src/backend/Api/appsettings.json`:

```json
"Username": "postgres",
"Password": "postgres"
```

oraz klucz JWT:

```json
"Key": "dev-only-change-me-dev-only-change-me"
```

Przed produkcją należy:

- usunąć te sekrety z plików śledzonych przez Git i historii, jeśli były commitowane;
- wykonać rotację haseł i klucza JWT;
- wymusić brak startu aplikacji poza Development, gdy sekrety są nieobecne lub mają wartość domyślną;
- użyć secret managera lub chronionych zmiennych środowiskowych;
- ograniczyć uprawnienia konta DB do wymaganych tabel/operacji;
- ograniczyć dostęp sieciowy DB do backendu.

`NEXT_PUBLIC_*` może zawierać wyłącznie publiczny adres HTTPS API — każda wartość z tym prefiksem trafia do bundla klienta.

## Warunki akceptacji przed publikacją

- [ ] Działa HTTPS i przekierowanie HTTP → HTTPS.
- [ ] HSTS włączony po weryfikacji TLS.
- [ ] CSP, X-Frame-Options, `nosniff`, Referrer-Policy i Permissions-Policy są obecne w odpowiedziach.
- [ ] Dane finansowe nie są cache’owane przez przeglądarkę, proxy ani CDN.
- [ ] Zmierzono gzip/Brotli na frontendzie i API.
- [ ] Sekrety są dostarczane z secret managera i zostały zrotowane.
- [ ] Aplikacja używa nieuprzywilejowanego użytkownika DB.
- [ ] Migracje są osobnym, audytowanym krokiem wdrożenia.
- [ ] Backup i restore zostały przetestowane, a RPO/RTO zaakceptowane.
- [ ] Działa monitoring, alerting, centralne logi i redakcja danych wrażliwych.
- [ ] Wykonano testy smoke, build, audyt zależności i testy bezpieczeństwa po wdrożeniu.
