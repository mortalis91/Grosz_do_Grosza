# Audyt bezpieczeństwa kontenerów

Data audytu: 2026-08-05  
Zakres: `compose.yml`, pliki środowiskowe i lokalnie uruchomiony kontener PostgreSQL.

## Podsumowanie

| Obszar | Wynik | Ryzyko |
|---|---|---|
| Root user | Brak jawnego `user`; obraz PostgreSQL powinien być zweryfikowany | Medium |
| Porty | PostgreSQL `5432` wystawiony na wszystkie interfejsy hosta | High |
| Sekrety | Hasło `postgres` zapisane w Compose | Critical |
| Volumes | Named volume bez dodatkowych ograniczeń i backup policy | Medium |
| Healthcheck | Jest skonfigurowany | Low |
| Restart policy | `unless-stopped` jest skonfigurowane | Low |
| Minimalny obraz | `postgres:16-alpine` jest dobrym punktem wyjścia, ale tag nie jest przypięty digestem | Medium |
| Image scanning | Nie wykonano — Trivy nie jest zainstalowany | Medium |
| Permissions/capabilities | Brak `read_only`, `cap_drop`, `no-new-privileges` | Medium |

Najpilniejsze działania przed produkcją: usunąć hasło z repozytorium/Compose, ograniczyć dostęp do PostgreSQL oraz przypiąć obraz do zweryfikowanego digestu.

## Ustalenia

### 1. Użytkownik root

W `compose.yml` nie ma ustawienia `user`. Dla oficjalnego obrazu PostgreSQL proces powinien działać jako użytkownik `postgres`, ale należy potwierdzić to w CI/runtime (`id` lub `podman inspect`). Nie należy wymuszać arbitralnego UID bez sprawdzenia praw do katalogu danych.

Zalecenie: utrzymać nie-rootowy użytkownik obrazu i dodać kontrolę w pipeline, która odrzuca obraz uruchamiający proces jako UID 0.

### 2. Wystawione porty — Wysokie ryzyko

```yaml
ports:
  - "5432:5432"
```

Port jest dostępny na wszystkich interfejsach hosta. Na środowisku produkcyjnym baza nie powinna być publicznie dostępna.

Zalecenie dla lokalnego developmentu:

```yaml
ports:
  - "127.0.0.1:5432:5432"
```

W produkcji usunąć `ports` i łączyć backend z bazą przez prywatną sieć kontenerową. Dostęp administracyjny powinien odbywać się przez bezpieczny tunnel/VPN.

### 3. Sekrety — Krytyczne ryzyko

Obecnie Compose zawiera:

```yaml
POSTGRES_USER: postgres
POSTGRES_PASSWORD: postgres
```

To jest słabe, przewidywalne hasło i sekret zapisany w konfiguracji. Zmiana pliku nie zmieni automatycznie hasła już istniejącej bazy w volume.

Zalecenie:

- użyć sekretów Podman/Docker albo menedżera sekretów platformy;
- dla Compose użyć `POSTGRES_PASSWORD_FILE`, nie `POSTGRES_PASSWORD`;
- wygenerować losowy sekret i rotować go kontrolowaną migracją;
- nie umieszczać haseł w `.env`, logach, README ani historii Git;
- osobno używać konta aplikacyjnego z minimalnymi uprawnieniami zamiast superusera `postgres`.

### 4. Wolumeny i dane

```yaml
volumes:
  - postgres_data:/var/lib/postgresql/data
```

Named volume chroni dane przed usunięciem kontenera, ale nie jest backupem ani szyfrowaniem. Brakuje opisanej polityki kopii zapasowych, testów odtwarzania i monitorowania zapełnienia dysku.

Zalecenie: backup szyfrowany poza hostem, regularny test restore, ograniczone uprawnienia do storage oraz dokumentacja retencji. Nie używać `podman compose down -v` na produkcji.

### 5. Kontrola stanu

Healthcheck jest obecny:

```yaml
test: ["CMD-SHELL", "pg_isready -U postgres -d grosz_do_grosza"]
interval: 5s
timeout: 5s
retries: 10
```

To sprawdza dostępność PostgreSQL, ale nie gwarantuje gotowości schematu ani poprawności połączenia użytkownika aplikacyjnego. `CMD-SHELL` zwiększa powierzchnię interpretacji polecenia, choć w tym statycznym przypadku ryzyko jest niskie.

Zalecenie: użyć `CMD` z argumentami, jeśli pozwala na to format obrazu, oraz uzależnić start backendu od `service_healthy`.

### 6. Polityka restartu

`restart: unless-stopped` jest poprawne dla lokalnego środowiska. W produkcji samo restartowanie może ukrywać crash-loop.

Zalecenie: dodać alerty na wielokrotne restarty, limity zasobów i monitoring healthchecków. Restart policy nie zastępuje orkiestratora ani obserwowalności.

### 7. Minimalny obraz i łańcuch dostaw

`postgres:16-alpine` ogranicza rozmiar obrazu, ale jest zmiennym tagiem. Pobrany lokalnie obraz ma identyfikator:

`de3a4eab8fdfa507ea92aac488b916b08089e515db49b055fe71dfa271ba3a28`

Zalecenie: po skanowaniu przypiąć obraz do digestu `@sha256:...`, aktualizować go kontrolowanie i weryfikować podpis/proweniencję obrazu. Alpine może różnić się kompatybilnością narzędzi; ważniejsza od samego rozmiaru jest aktualność poprawek.

### 8. Uprawnienia i capabilities

Compose nie definiuje `read_only`, `cap_drop`, `security_opt`, limitów CPU/pamięci ani `tmpfs` dla katalogów tymczasowych.

Zalecenie, po przetestowaniu z PostgreSQL:

```yaml
read_only: true
cap_drop:
  - ALL
security_opt:
  - no-new-privileges:true
tmpfs:
  - /tmp
```

Nie należy wdrażać `read_only` bez sprawdzenia katalogów zapisu obrazu. Volume danych musi pozostać zapisywalny.

## Skanowanie obrazów

Sprawdzono dostępność narzędzia `trivy`; nie jest zainstalowane, dlatego nie wykonano wiarygodnego skanu CVE obrazu. Przed wdrożeniem uruchomić:

```powershell
trivy image --severity HIGH,CRITICAL --ignore-unfixed docker.io/library/postgres:16-alpine
```

Skan powinien działać w CI przy każdym odświeżeniu obrazu, a build powinien być blokowany dla ustalonego progu ryzyka. Należy skanować także obrazy backendu i frontendu po dodaniu ich Dockerfile.

## Przykładowy kierunek bezpieczniejszego Compose

```yaml
services:
  postgres:
    image: docker.io/library/postgres:16-alpine@sha256:<zweryfikowany-digest>
    restart: unless-stopped
    environment:
      POSTGRES_DB: grosz_do_grosza
      POSTGRES_USER: app_owner
      POSTGRES_PASSWORD_FILE: /run/secrets/postgres_password
    secrets:
      - postgres_password
    ports:
      - "127.0.0.1:5432:5432"
    read_only: true
    cap_drop: [ALL]
    security_opt:
      - no-new-privileges:true
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U app_owner -d grosz_do_grosza"]

secrets:
  postgres_password:
    file: ./secrets/postgres_password.txt
```

Powyższy fragment jest wzorcem do dostosowania do używanego Podman/Docker Compose. Plik sekretu musi być poza repozytorium, z ograniczonymi prawami dostępu.

## Priorytety przed produkcją

1. **Critical:** wymienić `POSTGRES_PASSWORD=postgres` i wdrożyć secret management.
2. **High:** usunąć publiczne wystawienie portu 5432 albo ograniczyć je do `127.0.0.1`.
3. **High:** utworzyć konto aplikacyjne z minimalnymi uprawnieniami.
4. **Medium:** przypiąć digest obrazu i uruchomić Trivy/alternatywny skaner w CI.
5. **Medium:** dodać hardening capabilities, `no-new-privileges`, limity zasobów i alerty restartów.
6. **Medium:** wdrożyć szyfrowane backupy oraz przetestować odtwarzanie bazy.

## Ograniczenia

Audyt obejmował pliki znajdujące się w repozytorium i lokalny kontener PostgreSQL. Nie obejmuje konfiguracji hosta, firewalli, reverse proxy, rejestru obrazów, sekretów platformy produkcyjnej ani skanowania CVE, ponieważ `trivy` nie jest dostępne lokalnie.
