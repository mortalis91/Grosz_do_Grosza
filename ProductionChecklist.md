# Lista kontrolna gotowości produkcyjnej

Data przeglądu: 2026-08-05  
Zakres: ASP.NET Core, Next.js, Compose, PostgreSQL i konfiguracja środowiska.

## Werdykt

Kod aplikacji ma wdrożone podstawowe zabezpieczenia HTTP, HSTS poza Development, kompresję Brotli/Gzip, cache-control dla API oraz kontrolowane migracje. Aplikacja nadal nie jest gotowa do publicznego wdrożenia bez konfiguracji infrastruktury: certyfikatu HTTPS, backupów, monitoringu, konta DB o minimalnych uprawnieniach i secret managera.

## Status

| Obszar | Status | Ustalenie |
|---|---|---|
| HTTPS | DO KONFIGURACJI | API wymusza HTTPS poza Development przez `UseHttpsRedirection`; certyfikat musi być dostarczony przez Kestrel lub reverse proxy. |
| HSTS | WDROŻONE W API | `UseHsts()` działa poza Development. W produkcji trzeba potwierdzić poprawny TLS przed włączeniem preload. |
| CSP | WDROŻONE W API | API wysyła restrykcyjne `default-src 'none'` i `frame-ancestors 'none'`; CSP frontendu należy ustawić w Next.js/reverse proxy zgodnie z używanymi assetami. |
| X-Frame-Options | WDROŻONE | `DENY`. |
| X-Content-Type-Options | WDROŻONE | `nosniff`. |
| Referrer-Policy | WDROŻONE | `strict-origin-when-cross-origin`. |
| Permissions-Policy | WDROŻONE | Wyłączone kamera, mikrofon i geolokalizacja. |
| Cache headers | WDROŻONE DLA API | `/api` i `/health` otrzymują `Cache-Control: no-store, no-cache` przed wykonaniem endpointu; zapobiega to zrywaniu odpowiedzi HTTP. Assety Next.js powinny mieć długi immutable cache na proxy/CDN. |
| Gzip | DO KONFIGURACJI | Kompresję należy włączyć w reverse proxy/CDN po pomiarach; wyłączono ją w API, aby nie ryzykować zrywania odpowiedzi przy lokalnym Kestrel. |
| Brotli | DO KONFIGURACJI | Zalecane w reverse proxy/CDN; zweryfikować `Content-Encoding` i `Vary: Accept-Encoding`. |
| Kompresja | DO KONFIGURACJI | Wyłączona w Kestrel. Skonfigurować na warstwie proxy, z wykluczeniem odpowiedzi zawierających reflektowane sekrety. |
| Logowanie | CZĘŚCIOWE | Podstawowy provider ASP.NET działa. Nadal potrzebne są JSON, korelacja żądań, retencja, centralizacja i redakcja danych. |
| Monitoring | BRAK | Potrzebne metryki, alerty 5xx/logowania/brute force, uptime i monitoring bazy. `/health` nie zastępuje monitoringu. |
| Backupy | BRAK | Named volume nie jest backupem. Potrzebne szyfrowane kopie, retencja, RPO/RTO i test restore. |
| Migracje | WDROŻONE KONTROLOWANIE | Automatyczne migracje działają tylko w Development lub po jawnej fladze `Database:ApplyMigrations=true`. Produkcja powinna używać osobnego kroku deployu. |
| Uprawnienia DB | DO POPRAWY | Compose używa użytkownika `postgres`; produkcja musi używać osobnego użytkownika aplikacyjnego z minimalnymi uprawnieniami. |
| Connection stringi | CZĘŚCIOWE | Bazowy `appsettings.json` nie zawiera sekretu; produkcja musi dostarczać connection string przez secret manager/env. |
| Sekrety | DO ROTACJI/WDROŻENIA | JWT i hasło DB nie mogą być w repozytorium; wymagane losowe wartości, rotacja i kontrola dostępu. |
| Zmienne środowiskowe | CZĘŚCIOWE | `NEXT_PUBLIC_*` może zawierać wyłącznie publiczny HTTPS URL API. Sekrety backendu pozostają poza bundlem klienta. |

## Wprowadzone poprawki

- Zweryfikowano kompresję; pozostawiono ją do konfiguracji reverse proxy/CDN, aby nie wpływała na stabilność lokalnego API.
- Przeniesiono ustawianie nagłówków cache przed `next()`. Odpowiedź `GET /health` została zweryfikowana jako poprawne HTTP 200 z kompletnym body.
- Wyłączono kompresję wbudowaną w Kestrel po wykryciu zrywania odpowiedzi HTTP/1.1; kompresja pozostaje zadaniem reverse proxy/CDN.
- Dodano `Cache-Control: no-store, no-cache` dla endpointów `/api` i `/health`.
- Wyłączono automatyczne migracje w produkcji. Flaga `Database:ApplyMigrations` ma domyślnie wartość `false`.
- Zaktualizowano ocenę nagłówków, HTTPS, HSTS i sekretów zgodnie z aktualnym kodem.

## Wymagane przed publikacją

- [ ] Certyfikat TLS i przekierowanie HTTP → HTTPS zweryfikowane z zewnątrz.
- [ ] CSP frontendu oraz security headers potwierdzone na publicznym adresie.
- [ ] Sekrety dostarczane z secret managera i zrotowane.
- [ ] Osobny użytkownik DB z minimalnymi uprawnieniami.
- [ ] Migracje uruchamiane jako audytowany krok wdrożenia.
- [ ] Backup i restore przetestowane, RPO/RTO zaakceptowane.
- [ ] Monitoring, alerting, centralne logi i redakcja danych wrażliwych działają.
- [ ] Smoke testy, build, audyt zależności i testy bezpieczeństwa wykonane po wdrożeniu.

## Konfiguracja aplikacji

W środowisku produkcyjnym ustaw co najmniej:

```text
Jwt__Key=<losowy sekret co najmniej 32 znaki>
ConnectionStrings__DefaultConnection=<connection string z secret managera>
Cors__AllowedOrigins__0=https://app.example.com
Database__ApplyMigrations=false
```

Nie ustawiaj `Database__ApplyMigrations=true` jako stałej konfiguracji produkcyjnej. Migracje wykonuj osobnym, kontrolowanym poleceniem lub bundlem EF Core po backupie.
