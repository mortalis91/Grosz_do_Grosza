# Grosz do Grosza

Menedżer finansów osobistych zbudowany przy użyciu:

- ASP.NET Core 10 backend
- Next.js 15 frontend
- PostgreSQL

## Aktualny stan

- Zaimplementowano uwierzytelnianie JWT oraz chronione wywołania API.
- Zaimplementowano persystencję PostgreSQL i migracje EF Core.
- Konta obsługują rachunki bankowe, maklerskie, lokaty i emerytalne, waluty oraz bieżące salda.
- Transakcje obsługują ręczne dodawanie, import CSV, kategoryzację, filtrowanie, sortowanie, edycję, miękkie usuwanie i operacje zbiorcze.
- Filtrowanie transakcji wyświetla podsumowanie wszystkich wyników, w tym liczbę transakcji, wydatki, przychody i saldo netto pogrupowane według waluty.
- Ręczne dodawanie i edycja transakcji odbywają się w oknie modalnym. Można je zamknąć przyciskiem `X` lub kliknięciem poza oknem; po zapisaniu zamyka się automatycznie. Etykiety akcji to `Dodaj transakcję` i `Zapisz zmiany`. Pickery kategorii używają niezależnej przewijanej warstwy i w razie potrzeby otwierają się do góry.
- Kategorie obsługują grupy, podkategorie, ikony, kolory, edycję, sortowanie alfabetyczne i usuwanie.
- Inicjalizacja kategorii jest wykonywana idempotentnie, a widok nie wyświetla
  powtórzonych nazw grup ani podkategorii w obrębie tego samego rodzica.
- Panel główny obsługuje podsumowania miesięczne, wykresy roczne i przeliczanie sald nie-PLN na PLN.
- Wykres `Przychody vs Wydatki` obsługuje zakresy: dzień, tydzień, miesiąc, rok i cały okres. Transakcje oznaczone jako `Ignored` są wykluczane z obliczeń.
- Diagnostyka importu raportuje zaimportowane wiersze, duplikaty i wiersze zakończone błędem.
- Przed importem CSV trzeba wybrać konto; po imporcie wyświetlana jest nazwa pliku, a szczegółowy log `.txt` można pobrać.
- Budżety obsługują miesięczne planowanie według kategorii, komentarze, rzeczywiste wydatki, pozostałe kwoty i usuwanie.
- Wydatki można łączyć z transakcjami przychodowymi reprezentującymi zwroty.
- Wydatki można dzielić na transakcje podrzędne z osobnymi kategoriami, kwotami i opisami. Suma kwot podrzędnych musi być równa kwocie wydatku nadrzędnego.
- Powiązane zwroty są reprezentowane jako wiersze podrzędne na liście transakcji i zmniejszają wydatek używany w panelu głównym oraz raportach.
- Raporty zawierają osobną sekcję `Planowanie` z raportem `Budżet mieszkaniowy`.
- Budżet mieszkaniowy raportuje średni miesięczny dochód netto i podstawowe koszty życia, przyjmuje planowane koszty mieszkania, stosuje konfigurowalny bufor bezpieczeństwa i oblicza kwotę pozostałą po planowanym zakupie.
- Podstawowe koszty życia korzystają z dostępnych kategorii: `Spożywcze`, `Chemia`, `Zdrowie` i jej podkategorie, `Komórka`, `Internet`, `Zwierzęta` i jej podkategorie, `Edukacja` i jej podkategorie, `Rozrywka` i jej podkategorie, `Odzież i obuwie` oraz bieżący czynsz z `Czynsz i wynajem`.
- Dla bieżącego roku średnie miesięczne dzielone są przez liczbę rozpoczętych miesięcy; dla lat zakończonych używane jest 12 miesięcy. Raport planowania pozwala wybrać inny rok.

Szczegółowe wymagania funkcjonalne i bieżące zachowanie opisano w pliku [`REQUIREMENTS.md`](REQUIREMENTS.md).

## Struktura backendu

- `src/backend/Api`
- `src/backend/Application`
- `src/backend/Domain`
- `src/backend/Infrastructure`

## Następny krok

Należy kontynuować prace nad testami automatycznymi zaimplementowanego importu
transakcji, filtrowania, kategoryzacji, reguł panelu głównego i raportu planowania
mieszkaniowego. Eksport raportu planowania do PDF oraz trwałe przechowywanie
planowanych kosztów mieszkania pozostają pracami na przyszłość.

## Lokalny PostgreSQL

Uruchom bazę danych w Podman Desktop lub z terminala:

```bash
podman compose up -d
```

Backend korzysta z:

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

API będzie dostępne pod adresem `http://localhost:5000`. Dokumentacja Swagger
jest dostępna pod `http://localhost:5000/swagger` po uruchomieniu z
`ASPNETCORE_ENVIRONMENT=Development`.

Jeżeli zmienna `ConnectionStrings__DefaultConnection` jest ustawiona, ma
pierwszeństwo przed wartością z `appsettings.json`. Hasło inicjalizacyjne
`POSTGRES_PASSWORD` nie zmienia hasła w już istniejącym wolumenie PostgreSQL.

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

### Diagnostyka połączenia z API

Jeżeli frontend wyświetla komunikat o braku połączenia z API, sprawdź:

- czy backend odpowiada pod `http://localhost:5000/health` i zwraca status `200`;
- czy `NEXT_PUBLIC_BACKEND_API_URL` nie wskazuje na nieużywany port, np. `5211`;
- czy po zmianie adresu API frontend został uruchomiony ponownie.

Wartość `NEXT_PUBLIC_BACKEND_API_URL` musi wskazywać adres backendu, np.
`http://localhost:5000`.

Nieudane logowanie zwraca `401 Unauthorized` i jest wyświetlane jako
`Nieprawidłowy e-mail lub hasło.`. Komunikat `Nie można połączyć się z serwerem
API.` oznacza błąd transportu, CORS albo nieosiągalny adres skonfigurowany w
`NEXT_PUBLIC_BACKEND_API_URL`.

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
