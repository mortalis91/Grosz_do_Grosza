# Grosz do Grosza - wymagania i stan realizacji

Dokument opisuje wymagania funkcjonalne oraz zachowanie aktualnej wersji MVP.
Nowe zmiany funkcjonalne powinny być dopisywane tutaj razem z implementacją.

## 1. Konta i majątek

- Użytkownik może tworzyć i edytować konta.
- Typ konta obejmuje co najmniej: Bank, Giełda, Lokata oraz PPE/PPK.
- Konto posiada nazwę, walutę, identyfikator zewnętrzny i bieżące saldo.
- Saldo konta oznacza aktualny stan środków na konkretnym koncie.
- Majątek oznacza sumę wartości posiadanych kont i portfeli, prezentowaną w PLN.
- Wartości w EUR, USD, GBP, CHF i innych walutach są przeliczane na PLN według skonfigurowanych kursów.

## 2. Kategorie

- Kategorie są grupami z hierarchią grupa -> podkategoria.
- System zawiera grupy bazowe: Zakupy, Edukacja, Mieszkanie/Dom, Osobiste,
  Podatki, Przychód, Rachunki/Media, Rozrywka i Zdrowie.
- Użytkownik może dodawać własne grupy i podkategorie.
- Grupa może mieć nazwę, ikonę, kolor i kolejność alfabetyczną.
- Grupy można edytować lub usuwać z menu `•••`.
- Podkategorie można usuwać ikoną kosza.
- Lista kategorii w transakcjach jest domyślnie zwinięta i pozwala wybrać grupę albo podkategorię.

## 3. Transakcje

- Transakcja posiada konto, datę, opis, kwotę, walutę, kategorię, typ i status.
- Kwoty dodatnie są prezentowane na zielono, a ujemne na czerwono.
- Lista pokazuje kolumny: Data, Opis/Tytuł, Kategoria, Kwota, Status i Akcje.
- Kolumny Data i Kwota można sortować rosnąco lub malejąco.
- Można filtrować po opisie oraz koncie.
- Filtr typu pozwala zaznaczyć wiele opcji jednocześnie.
- Opcje filtrów typu to: Przychody, Koszty, Transakcje potwierdzone,
  Transakcje niepotwierdzone, Transakcje istotne i Transakcje nieistotne.
- Transakcja potwierdzona to transakcja z przypisaną kategorią.
- Transakcja istotna to transakcja, której status nie jest `Ignored`.
- Filtry z różnych grup działają łącznie, a opcje w tej samej grupie działają alternatywnie.
- Można zmieniać kategorię bezpośrednio na liście, wybierając także podkategorię.
- Edycja transakcji pozwala zmienić między innymi kategorię i status.
- Przycisk `Usuń` trwale usuwa transakcję z bazy danych.
- Status `Ignored` oznacza transakcję nieistotną i wyłącza ją z podsumowań przychodów i wydatków.

## 4. Grupowa edycja

- Przycisk `Edytuj transakcje` włącza tryb zaznaczania.
- Można zaznaczać pojedyncze transakcje lub wszystkie aktualnie widoczne po filtrach.
- Dostępne akcje grupowe: oznaczenie jako nieistotne, usunięcie oraz odznaczenie.

## 5. Import CSV

- Import odbywa się po wskazaniu konta i pliku CSV.
- Import jest deduplikowany na podstawie identyfikatorów/hashy operacji.
- Komunikat importu pokazuje liczbę zaimportowanych rekordów, duplikatów i błędów.
- Błędy importu powinny zawierać numer wiersza oraz opis przyczyny.

## 6. Dashboard

- Podsumowanie można przeglądać dla wybranego miesiąca.
- Dashboard pokazuje przychody, wydatki, saldo oraz majątek.
- Dostępne jest zestawienie roczne z wartościami miesięcznymi.
- Transakcje `Ignored` nie są uwzględniane w przychodach i wydatkach.
- Ostatnie operacje powinny pochodzić z tego samego źródła co zakładka Transakcje.

## 7. Budżety

- Użytkownik może wybrać miesiąc i zaplanować kwotę dla grupy kategorii lub podkategorii.
- Wybór kategorii korzysta z tego samego rozwijanego komponentu co transakcje, wraz z ikonami i podkategoriami.
- Budżet posiada kwotę, walutę PLN i opcjonalny komentarz do 160 znaków.
- Dla każdej pozycji wyświetlane są: kwota zaplanowana, realne wydatki, pozostała kwota i komentarz.
- Realne wydatki są pobierane z transakcji z wybranego miesiąca i przypisanej kategorii.
- Transakcje ze statusem `Ignored` nie są uwzględniane w realizacji budżetu.
- Pozostała kwota jest obliczana jako `kwota zaplanowana - realne wydatki`.
- Przekroczenie budżetu jest prezentowane kolorem czerwonym, a pozostała kwota kolorem zielonym.
- Użytkownik może usunąć pojedynczą pozycję budżetu; usunięcie nie narusza transakcji ani kategorii.

## 8. Zasady dokumentacji

- Każda zmiana funkcjonalna powinna aktualizować odpowiedni punkt tego dokumentu.
- Zmiany modelu danych należy odnotować także w `DATABASE_MODEL.md`.
- Zmiany granic modułów lub sposobu komunikacji należy odnotować w `ARCHITECTURE.md`.
- Wymagania planowane, ale niezaimplementowane, należy oznaczać jako planowane zamiast opisywać je jako gotowe.
