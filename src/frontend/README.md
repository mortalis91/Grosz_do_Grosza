# Frontend

Next.js 15 app for Grosz do Grosza.

## Uruchomienie

Z katalogu `src/frontend`:

```bash
npm install
npm run dev -- --hostname localhost --port 3000
```

Frontend korzysta domyślnie z backendu pod `http://localhost:5000`.

## Polecenia deweloperskie

```bash
npm run lint
npm run lint:fix
npm run format
npm run build
```

Interfejs używa `lucide-react` dla ikon kontrolek. Kategorie i podkategorie
mogą mieć własne ikony, a wykres „Przychody vs Wydatki” pomija transakcje ze
statusem `Ignored`.
