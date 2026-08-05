# Raport prywatności danych

Data analizy: 2026-08-05  
Zakres: backend ASP.NET Core, PostgreSQL, import CSV, frontend Next.js i proces usuwania konta.

## Podsumowanie

Aplikacja przetwarza dane osobowe i finansowe o wysokiej wrażliwości: e-mail, nazwę użytkownika, salda, numery rachunków, IBAN-y, kontrahentów, tytuły przelewów i historię transakcji. Dane są zapisywane w PostgreSQL w postaci jawnej. Nie znaleziono szyfrowania pól ani formalnego mechanizmu anonimizacji.

**Przed produkcją wymagane są:** usunięcie sekretów z konfiguracji, szyfrowanie transmisji i backupów, ograniczenie logowania treści importu, polityka retencji oraz potwierdzony proces usunięcia/anonimizacji danych.

## Ocena obszarów

| Obszar | Ustalenie | Ryzyko |
|---|---|---|
| Dane osobowe | `User` przechowuje e-mail, display name i hash hasła | High |
| Dane finansowe | Transakcje zawierają kwoty, salda, tytuły i identyfikatory rachunków | High |
| Numery kont/IBAN | `SourceAccount`, `TargetAccount`, `CounterpartyAccount`, `Iban` są przechowywane bez maskowania | High |
| Kontrahenci | Nazwy i adresy kontrahentów są importowane oraz przechowywane | High |
| Logowanie | `ImportLog` zapisuje tytuły transakcji | High |
| Eksport | Brak dedykowanego bezpiecznego eksportu; frontend generuje lokalny log importu | Medium |
| Import | CSV zawiera dane rachunkowe i jest zapisywany/parsowany po stronie API | High |
| Usunięcie konta | `DELETE /api/v1/user` usuwa dane użytkownika | Medium/High |
| Anonimizacja | Brak mechanizmu anonimizacji i retencji | High |
| Szyfrowanie | Brak szyfrowania pól; HTTPS/backupy nie są potwierdzone | Critical |

## 1. Przechowywanie danych osobowych

`User` przechowuje:

- adres e-mail,
- nazwę wyświetlaną,
- walutę domyślną,
- hash hasła.

Transakcje przechowują dodatkowo opis, nazwę i adres kontrahenta, numery rachunków źródłowego/docelowego, IBAN, merchant, numer referencyjny i dane finansowe. Są to dane pozwalające odtworzyć zachowania i sytuację finansową użytkownika.

Zalecenia:

- zdefiniować rejestr kategorii danych, cel przetwarzania i podstawę prawną;
- ograniczyć przechowywanie do danych potrzebnych do funkcji aplikacji;
- ustalić retencję dla aktywnego konta, usuniętych kont, logów i backupów;
- nie przechowywać pełnego IBAN-u, jeśli wystarczą ostatnie 4 cyfry lub token referencyjny.

## 2. Logowanie danych

`TransactionImportService` zapisuje `draft.Title` w `ImportLogs` zarówno przy pominięciu duplikatu, jak i przy imporcie. Tytuł przelewu może zawierać dane osoby, adres, numer rachunku lub inne informacje wrażliwe.

Zalecenia:

- nie zapisywać pełnych tytułów w logach technicznych;
- przechowywać wyłącznie numer wiersza, typ wyniku i identyfikator batcha;
- jeśli podgląd treści jest potrzebny, maskować IBAN, e-mail, telefon i długie ciągi cyfr;
- wdrożyć retencję i kontrolę dostępu do `ImportLogs`;
- redagować JWT, cookies, connection stringi i request body w logach aplikacji.

## 3. Numery kont i IBAN

Model i import przyjmują jawne wartości `SourceAccount`, `TargetAccount`, `CounterpartyAccount` oraz `Iban`. Nie znaleziono szyfrowania aplikacyjnego, tokenizacji ani maskowania.

Zalecenia:

- szyfrować wrażliwe kolumny na poziomie aplikacji albo użyć szyfrowania bazy/storage;
- klucz szyfrujący przechowywać poza bazą, w secret managerze/KMS;
- maskować wartości w UI, logach, eksportach i błędach;
- indeksować wyłącznie bezpieczny fingerprint, jeżeli potrzebne jest wyszukiwanie/deduplication;
- walidować format IBAN i limitować długość wejścia.

## 4. Nazwy kontrahentów

Nazwy kontrahentów trafiają do pól transakcji, a w niektórych przypadkach stają się również opisem transakcji. Są widoczne w dashboardzie, tabeli transakcji i filtrach.

Zalecenia: ograniczyć zakres odpowiedzi API do potrzebnego widoku, maskować dane w logach i eksportach diagnostycznych oraz uwzględnić kontrahenta w zasadach retencji i usuwania.

## 5. Eksport danych

Nie znaleziono dedykowanego endpointu eksportu danych użytkownika. Frontend tworzy lokalny plik tekstowy z logiem importu przez `Blob` i `link.download`; plik może pozostać w katalogu pobierania użytkownika.

Przed wdrożeniem funkcji eksportu dodać:

- świadome żądanie eksportu i reautoryzację użytkownika;
- ograniczenie eksportu wyłącznie do danych właściciela;
- ostrzeżenie o wrażliwości pliku i brak publicznych URL-i;
- szyfrowanie eksportu lub krótko żyjący, jednorazowy link po stronie serwera;
- audyt eksportów bez zapisywania ich treści;
- możliwość eksportu danych w formacie zgodnym z polityką przenoszenia danych.

## 6. Import danych

Import CSV przyjmuje dane bankowe zawierające tytuł, kontrahenta, adres i numery rachunków. Parser zachowuje te wartości w transakcjach i logach importu. Plik jest przetwarzany ze strumienia, ale nie znaleziono kompletnej polityki limitów rozmiaru, liczby wierszy, retencji pliku tymczasowego ani automatycznego usuwania artefaktów.

Zalecenia:

- limity rozmiaru pliku, wierszy, kolumn i długości pól;
- skanowanie i bezpieczne odrzucanie plików niezgodnych z formatem;
- brak trwałego przechowywania oryginalnego pliku, chyba że użytkownik wyrazi na to zgodę;
- usuwanie plików tymczasowych po zakończeniu lub błędzie;
- maskowanie danych w raportach importu;
- kontrola właściciela konta przed importem i ograniczenie dostępu do batchów/logów.

## 7. Usunięcie konta

`DELETE /api/v1/user` usuwa użytkownika, konta, transakcje, kategorie, reguły i budżety. To dobry fundament prawa do usunięcia, ale obecnie brakuje:

- reautoryzacji lub ponownego podania hasła;
- potwierdzenia operacji i ochrony przed przypadkowym wywołaniem;
- transakcji/strategii gwarantującej usunięcie wszystkich powiązanych danych;
- jawnego usunięcia `ImportBatches` i `ImportLogs` oraz innych przyszłych artefaktów;
- procedury usuwania z backupów i systemów logowania;
- audytowalnego potwierdzenia wykonania bez zachowania danych osobowych.

Należy wykonać test integracyjny, który po usunięciu konta wyszukuje dane użytkownika we wszystkich tabelach i storage.

## 8. Anonimizacja i retencja

Nie znaleziono funkcji anonimizacji. Samo oznaczenie `IsActive=false` nie byłoby wystarczające. Należy opisać dwa tryby:

- **usunięcie:** usunięcie danych osobowych i finansowych zgodnie z polityką;
- **anonimizacja:** zastąpienie e-maila, nazwy i identyfikatorów tokenami nieodwracalnymi, usunięcie danych rachunkowych oraz zachowanie wyłącznie agregatów, jeśli jest uzasadnione.

Retencja powinna obejmować bazę główną, logi, backupy, eksporty, cache i urządzenia użytkownika. Backupy powinny mieć znaną datę wygaśnięcia i procedurę realizacji usunięcia przy odtwarzaniu.

## 9. Szyfrowanie

Nie znaleziono szyfrowania pól danych finansowych. Wcześniejsza analiza konfiguracji wykazała również brak potwierdzonego HTTPS oraz jawne connection stringi/secrets.

Minimum produkcyjne:

- TLS 1.2+ dla przeglądarki, API i połączenia backend–PostgreSQL;
- szyfrowanie backupów i storage;
- szyfrowanie kolumn z IBAN/rachunkami, jeżeli pełne wartości są konieczne;
- KMS/secret manager z rotacją kluczy;
- brak kluczy w repozytorium, `appsettings.json`, logach i `NEXT_PUBLIC_*`;
- kontrola dostępu do kluczy oddzielona od dostępu do danych.

## Priorytety

1. **Critical:** wdrożyć HTTPS/TLS i usunąć jawne sekrety.
2. **High:** ograniczyć logowanie tytułów oraz usunąć pełne numery rachunków z logów/UI/eksportów.
3. **High:** zaprojektować szyfrowanie IBAN i numerów kont z kluczem poza bazą.
4. **High:** wdrożyć retencję, anonimizację i kompletne usuwanie danych z logów oraz backupów.
5. **Medium:** wzmocnić import limitami i polityką usuwania plików tymczasowych.
6. **Medium:** dodać reautoryzację, audyt i bezpieczny eksport danych.

## Ograniczenia

Raport obejmuje kod i konfigurację repozytorium. Nie potwierdza zgodności prawnej z konkretną jurysdykcją ani konfiguracji produkcyjnego KMS, reverse proxy, backup providerów i systemów logowania, których konfiguracji nie ma w repozytorium.
