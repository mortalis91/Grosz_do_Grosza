# Audyt zależności

Data audytu: 2026-08-05  
Zakres: frontend Next.js oraz projekty .NET w `Backend.sln`.

## Podsumowanie

| Obszar | Wynik | Ocena |
|---|---:|---|
| `npm audit` — zależności produkcyjne | 1 Critical, 2 High | **Krytyczne** |
| `dotnet list Backend.sln package --vulnerable --include-transitive` | 0 podatnych pakietów | Brak wykrytych CVE |
| Nieaktualne zależności npm | 12 pakietów | Do zaplanowania |
| Spójność wersji .NET | `net10.0` + część pakietów 9.x | Średnie ryzyko utrzymaniowe |

Najpilniejsza poprawka dotyczy frontendu: `next` 15.3.3 powinien zostać podniesiony co najmniej do wersji 15.5.22 lub nowszej wersji z poprawkami bezpieczeństwa. Aktualny audit wskazuje również podatne wersje transytywne `postcss` i `sharp`.

## Frontend — npm

### Wynik `npm audit`

Audyt zależności produkcyjnych wykazał łącznie 3 podatności:

| Pakiet | Typ | Poziom | Opis | Zalecenie |
|---|---|---|---|---|
| `next@15.3.3` | bezpośredni | **Critical/High** | Podatności Next.js, w tym krytyczne ryzyko deserializacji/protokołu React Flight oraz problemy DoS, SSRF i obejścia middleware | Zaktualizować minimum do `15.5.22`, następnie sprawdzić najnowszą bezpieczną wersję linii 15 |
| `postcss@8.5.6` | transytywny | **High** | Podatności obejmujące XSS oraz odczyt plików/path traversal w określonych scenariuszach parsera | Zaktualizować przez aktualizację Next.js; zweryfikować finalną wersję `postcss` w lockfile |
| `sharp` | transytywny | **High** | Problemy bezpieczeństwa biblioteki libvips; audit wskazuje m.in. CVE-2026-33327, CVE-2026-33328, CVE-2026-35590 i CVE-2026-35591 | Zaktualizować łańcuch zależności przez Next.js; sprawdzić wersję `sharp` po instalacji |

Audit zgłosił poprawkę niepowodującą zmiany głównej wersji (`npm audit fix` wskazuje `next@15.5.22`). Aktualizacji nie należy wykonywać automatycznie na produkcji: po zmianie trzeba uruchomić lint, build oraz testy przeglądarkowe.

### Nieaktualne pakiety npm

Wynik `npm outdated` pokazuje:

| Pakiet | Aktualnie | Najnowsza wersja | Priorytet |
|---|---:|---:|---|
| `next` | 15.3.3 | 16.3.0 | **P1 — bezpieczeństwo**, najpierw bezpieczna linia 15 |
| `eslint-config-next` | 16.2.12 | 16.3.0 | P1 — dopasować do używanej wersji Next |
| `@types/node` | 20.17.32 | 26.1.2 | P2 — sprawdzić zgodność z TypeScript/Node |
| `@types/react` | 19.1.11 | 19.2.18 | P2 |
| `@types/react-dom` | 19.1.8 | 19.2.4 | P2 |
| `autoprefixer` | 10.4.20 | 10.5.4 | P2 |
| `eslint` | 9.39.5 | 10.8.0 | P2 — aktualizacja główna |
| `postcss` | 8.5.6 | 8.5.25 | P1, przez audit |
| `react` | 19.1.0 | 19.2.8 | P2 |
| `react-dom` | 19.1.0 | 19.2.8 | P2 |
| `tailwindcss` | 3.4.17 | 4.3.3 | P3 — duża zmiana konfiguracyjna |
| `typescript` | 5.8.3 | 7.0.2 | P3 — duża zmiana, wymaga przeglądu typów |

Szczególne ryzyko stanowi niespójność `next@15.3.3` i `eslint-config-next@16.2.12`. Te pakiety powinny mieć zgodną linię główną, najlepiej wersje odpowiadające sobie również pod względem minor.

## Backend — NuGet/.NET

Uruchomiono:

```powershell
dotnet list Backend.sln package --vulnerable --include-transitive
```

Wynik dla projektów `GroszDoGrosza.Api`, `Application`, `Domain`, `Infrastructure` oraz testów:

> Wszystkie projekty nie mają pakietów podatnych na zagrożenia według bieżącego źródła `https://api.nuget.org/v3/index.json`.

To oznacza brak potwierdzonych podatności z bieżącego feedu NuGet. Nie jest to gwarancja bezpieczeństwa kodu aplikacji ani zależności systemowych obrazu/kontenera.

### Zależności wymagające przeglądu wersji

Projekty targetują `net10.0`, natomiast część pakietów Microsoft/Npgsql jest w wersji 9.x:

- `Microsoft.AspNetCore.Authentication.JwtBearer` 9.0.0
- `Microsoft.EntityFrameworkCore` 9.0.0
- `Microsoft.EntityFrameworkCore.Design` 9.0.0
- `Npgsql.EntityFrameworkCore.PostgreSQL` 9.0.0
- `System.IdentityModel.Tokens.Jwt` 8.11.0
- `Swashbuckle.AspNetCore` 7.2.0

Nie zaklasyfikowano tego jako CVE, ponieważ audit nie wykazał podatności. Zalecane jest jednak ujednolicenie pakietów z docelowym SDK/runtime oraz regularne aktualizowanie patchy w ramach tej samej linii.

Pakiety testowe (`Microsoft.NET.Test.Sdk`, xUnit, FluentAssertions, Coverlet) również powinny być aktualizowane niezależnie od zależności produkcyjnych.

## Biblioteki porzucone

Wykonane polecenia nie wykrywają statusu utrzymania projektu. Sam `npm audit` i komenda NuGet raportują znane podatności, ale nie potwierdzają, że biblioteka jest aktywnie rozwijana. Nie stwierdzono na podstawie tych wyników jednoznacznie porzuconej biblioteki.

Przy następnym przeglądzie należy sprawdzić dla bezpośrednich zależności: datę ostatniego wydania, liczbę otwartych issue, wsparcie dla używanego Node/.NET oraz komunikaty deprecation.

## Plan działań

1. **P1:** zaktualizować Next.js do najnowszej bezpiecznej wersji linii 15, minimum 15.5.22.
2. **P1:** po instalacji potwierdzić bezpieczne wersje `postcss` i `sharp` w `package-lock.json` oraz ponowić `npm audit`.
3. **P1:** dopasować `eslint-config-next` do wersji Next.js.
4. **P2:** zaktualizować React, typy, PostCSS i Autoprefixer; wykonać `npm run lint` i `npm run build`.
5. **P2:** sprawdzić aktualizacje patchowe pakietów .NET i zgodność z `net10.0`.
6. **P3:** osobno zaplanować migrację Tailwind 3 → 4, TypeScript 5 → 7 i ESLint 9 → 10.
7. Dodać audyt do CI: `npm audit --audit-level=high` oraz `dotnet list ... --vulnerable --include-transitive`, blokując build przy Critical/High.

## Ograniczenia audytu

- Wyniki zależą od aktualności registry npm/NuGet i lockfile.
- Audyt pakietów nie zastępuje analizy kodu, konfiguracji produkcyjnej, obrazu kontenera ani skanowania SCA/SAST.
- Przed wdrożeniem należy ponowić oba audyty po każdej zmianie zależności oraz wygenerować SBOM.
