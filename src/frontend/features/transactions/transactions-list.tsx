// @ts-nocheck
"use client";

import { useEffect, useRef, useState } from "react";
import {
  ArrowDownUp,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  CircleAlert,
  CircleCheck,
  CircleX,
  FileCog,
  FileSpreadsheet,
  Pencil,
  Search,
  SlidersHorizontal,
  Tag,
  Trash2,
  X,
} from "lucide-react";
import { getAccounts, type AccountItem } from "@/lib/accounts-api";
import { importBankCsv } from "@/lib/imports-api";
import { getCategories, type CategoryItem } from "@/lib/categories-api";
import {
  archiveTransaction,
  markTransactionIrrelevant,
  markTransactionRelevant,
  createTransaction,
  getTransactions,
  type TransactionItem,
  updateTransaction,
  updateTransactionCategory,
} from "@/lib/transactions-api";

const emptyForm = {
  accountId: "",
  occurredAt: "",
  bookedAt: "",
  amount: "",
  currency: "PLN",
  direction: "Expense",
  status: "Imported",
  description: "",
  counterpartyName: "",
  counterpartyAccount: "",
  iban: "",
  merchant: "",
  categoryId: "",
  transactionType: "Manual",
  referenceNumber: "",
  externalTransactionId: "",
};

export function TransactionsList() {
  // Dane ekranu: transakcje, konta i kategorie są pobierane z API po zalogowaniu.
  const [items, setItems] = useState<TransactionItem[]>([]);
  const [accounts, setAccounts] = useState<AccountItem[]>([]);
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [importMessage, setImportMessage] = useState("");
  const [mappingOpen, setMappingOpen] = useState(false);
  const [categoryMapping, setCategoryMapping] = useState<
    Array<{ source: string; target: string }>
  >([
    { source: "Restauracje i kawiarnie", target: "Restauracje, puby, kluby" },
    { source: "Artykuły spożywcze", target: "Spożywcze" },
    { source: "Wynagrodzenie", target: "Pensja" },
    { source: "Transport publiczny", target: "Bilety i taksówki" },
    { source: "Odsetki, zwrot z inwestycji", target: "Odsetki bankowe" },
    { source: "Podróże", target: "Wyjazdy, podróże, wakacje" },
    { source: "Multimedia", target: "Internet, TV, telefon" },
    { source: "Premia, nagroda", target: "Nadgodziny" },
    { source: "Ubrania", target: "Odzież i obuwie" },
    { source: "Czynsz", target: "Czynsz i wynajem" },
    { source: "Ubezpieczenia", target: "Ubezpieczenie mieszkania, domu" },
    { source: "Taxi", target: "Bilety i taksówki" },
    { source: "Hotele", target: "Wyjazdy, podróże, wakacje" },
  ]);
  useEffect(() => {
    if (!mappingOpen) return;
    const closeOnOutsideClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (
        !target.closest(".mapping-editor") &&
        !target.closest('[aria-label="Mapowanie kategorii"]')
      )
        setMappingOpen(false);
    };
    document.addEventListener("mousedown", closeOnOutsideClick);
    return () => document.removeEventListener("mousedown", closeOnOutsideClick);
  }, [mappingOpen]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<"date" | "amount">("date");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [pageSize, setPageSize] = useState(25);
  const [currentPage, setCurrentPage] = useState(1);
  const [dateFilter, setDateFilter] = useState("current-month");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [amountOpen, setAmountOpen] = useState(false);
  const [minAmount, setMinAmount] = useState("");
  const [maxAmount, setMaxAmount] = useState("");
  const [draftMinAmount, setDraftMinAmount] = useState("");
  const [draftMaxAmount, setDraftMaxAmount] = useState("");
  const [filterAccount, setFilterAccount] = useState("");
  const [filterType, setFilterType] = useState<string[]>(["relevant"]);
  const [typeFilterOpen, setTypeFilterOpen] = useState(false);
  const [bulkEdit, setBulkEdit] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkCategoryOpen, setBulkCategoryOpen] = useState(false);
  const [bulkCategoryId, setBulkCategoryId] = useState("");
  // Referencje służą do zamykania dropdownów po kliknięciu poza ich obszarem.
  const typeFilterRef = useRef<HTMLDivElement>(null);
  const amountRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!typeFilterOpen && !amountOpen) return;
    const closeOnOutsideClick = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        typeFilterOpen &&
        typeFilterRef.current &&
        !typeFilterRef.current.contains(target)
      )
        setTypeFilterOpen(false);
      if (
        amountOpen &&
        amountRef.current &&
        !amountRef.current.contains(target)
      )
        setAmountOpen(false);
    };
    document.addEventListener("mousedown", closeOnOutsideClick);
    return () => document.removeEventListener("mousedown", closeOnOutsideClick);
  }, [typeFilterOpen, amountOpen]);
  function toggleSort(field: "date" | "amount") {
    if (sort === field)
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    else {
      setSort(field);
      setSortDirection("desc");
    }
  }

  async function refresh() {
    // Jedno odświeżenie utrzymuje spójny widok po edycji, imporcie lub akcji grupowej.
    setItems(await getTransactions(1, 5000));
    setAccounts(await getAccounts());
    setCategories(await getCategories());
  }

  useEffect(() => {
    refresh();
  }, [pageSize]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    // Ten sam formularz obsługuje zarówno dodawanie, jak i edycję transakcji.
    event.preventDefault();

    const payload = {
      accountId: form.accountId,
      occurredAt: form.occurredAt,
      bookedAt: form.bookedAt || null,
      amount: Number(form.amount),
      currency: form.currency,
      direction: form.direction,
      status: form.status,
      description: form.description,
      counterpartyName: form.counterpartyName || undefined,
      counterpartyAccount: form.counterpartyAccount || undefined,
      iban: form.iban || undefined,
      merchant: form.merchant || undefined,
      categoryId: form.categoryId || null,
      transactionType: form.transactionType,
      referenceNumber: form.referenceNumber || null,
      externalTransactionId: form.externalTransactionId || null,
    };

    if (editingId) {
      await updateTransaction(editingId, payload);
    } else {
      await createTransaction(payload);
    }

    setForm(emptyForm);
    setEditingId(null);
    await refresh();
  }

  function startEdit(item: TransactionItem) {
    setEditingId(item.id);
    setShowCreateForm(true);
    setForm({
      accountId: item.accountId,
      occurredAt: item.occurredAt.slice(0, 16),
      bookedAt: "",
      amount: String(item.amount),
      currency: item.currency,
      direction: item.direction,
      status: item.status,
      description: item.description,
      counterpartyName: item.counterpartyName ?? "",
      counterpartyAccount: "",
      iban: "",
      merchant: "",
      categoryId: item.categoryId ?? "",
      transactionType: item.transactionType,
      referenceNumber: "",
      externalTransactionId: item.externalTransactionId ?? "",
    });
  }

  async function handleArchive(id: string) {
    await archiveTransaction(id);
    await refresh();
  }
  async function handleIrrelevant(id: string) {
    await markTransactionIrrelevant(id);
    await refresh();
  }

  function toggleSelected(id: string) {
    // Zaznaczenia są przechowywane jako identyfikatory, aby akcje grupowe były niezależne od sortowania.
    setSelectedIds((current) =>
      current.includes(id)
        ? current.filter((itemId) => itemId !== id)
        : [...current, id],
    );
  }

  async function handleBulkAction(
    action: "irrelevant" | "relevant" | "archive",
  ) {
    // Akcje grupowe wykonują tę samą operację API dla każdej zaznaczonej transakcji.
    const ids = [...selectedIds];
    if (!ids.length) return;
    await Promise.all(
      ids.map((id) =>
        action === "irrelevant"
          ? markTransactionIrrelevant(id)
          : action === "relevant"
            ? markTransactionRelevant(id)
            : archiveTransaction(id),
      ),
    );
    setSelectedIds([]);
    await refresh();
  }

  async function handleBulkCategoryAssign() {
    // Masowe przypisanie korzysta z istniejącego endpointu zmiany kategorii.
    if (!selectedIds.length || !bulkCategoryId) return;
    await Promise.all(
      selectedIds.map((id) => updateTransactionCategory(id, bulkCategoryId)),
    );
    setSelectedIds([]);
    setBulkCategoryId("");
    setBulkCategoryOpen(false);
    await refresh();
  }

  function toggleTypeFilter(value: string) {
    setFilterType((current) =>
      current.includes(value)
        ? current.filter((type) => type !== value)
        : [...current, value],
    );
  }

  const selectedTypeFilters = filterType;

  function matchesDateFilter(item: TransactionItem) {
    if (dateFilter === "all") return true;
    const date = new Date(item.occurredAt);
    const now = new Date();
    if (dateFilter === "current-month")
      return (
        date.getFullYear() === now.getFullYear() &&
        date.getMonth() === now.getMonth()
      );
    if (dateFilter === "previous-month") {
      const previous = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      return (
        date.getFullYear() === previous.getFullYear() &&
        date.getMonth() === previous.getMonth()
      );
    }
    if (dateFilter === "current-year")
      return date.getFullYear() === now.getFullYear();
    if (dateFilter === "previous-year")
      return date.getFullYear() === now.getFullYear() - 1;
    return true;
  }

  function matchesTypeFilters(item: TransactionItem) {
    const incomeExpense = selectedTypeFilters.filter(
      (type) => type === "income" || type === "expense",
    );
    const confirmation = selectedTypeFilters.filter(
      (type) => type === "confirmed" || type === "unconfirmed",
    );
    const relevance = selectedTypeFilters.filter(
      (type) => type === "relevant" || type === "irrelevant",
    );
    return (
      (incomeExpense.length === 0 ||
        incomeExpense.some((type) =>
          type === "income" ? item.amount > 0 : item.amount < 0,
        )) &&
      (confirmation.length === 0 ||
        confirmation.some((type) =>
          type === "confirmed" ? Boolean(item.categoryId) : !item.categoryId,
        )) &&
      (relevance.length === 0 ||
        relevance.some((type) =>
          type === "relevant"
            ? item.status !== "Ignored"
            : item.status === "Ignored",
        ))
    );
  }

  async function handleCategoryChange(id: string, categoryId: string) {
    await updateTransactionCategory(id, categoryId || null);
    await refresh();
  }

  async function handleImport(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    const accountId = form.accountId || accounts[0]?.id;
    if (!file || !accountId) {
      setImportMessage("Najpierw wybierz konto i plik CSV.");
      return;
    }
    try {
      const result = await importBankCsv(
        accountId,
        file,
        Object.fromEntries(
          categoryMapping
            .filter((item) => item.source.trim())
            .map((item) => [item.source.trim(), item.target.trim()]),
        ),
      );
      setImportMessage(
        `Zaimportowano ${result.createdTransactions} transakcji. Duplikaty: ${result.duplicateRows}. BLędy: ${result.failedRows}.`,
      );
      await refresh();
    } catch (error) {
      setImportMessage(
        error instanceof Error ? error.message : "Import nie powiódł się.",
      );
    } finally {
      event.target.value = "";
    }
  }

  // Najpierw filtrujemy i sortujemy pełny zbiór, a dopiero potem wycinamy bieżącą stronę.
  const filteredItems = items
    .filter(
      (item) =>
        matchesDateFilter(item) &&
        item.description.toLowerCase().includes(search.toLowerCase()) &&
        (!filterAccount || item.accountId === filterAccount) &&
        (!categoryFilter || item.categoryId === categoryFilter) &&
        (!minAmount || Math.abs(item.amount) >= Number(minAmount)) &&
        (!maxAmount || Math.abs(item.amount) <= Number(maxAmount)) &&
        matchesTypeFilters(item),
    )
    .sort((a, b) => {
      const result =
        sort === "amount"
          ? b.amount - a.amount
          : new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime();
      return sortDirection === "asc" ? -result : result;
    });
  const totalPages = Math.max(1, Math.ceil(filteredItems.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const visibleItems = filteredItems.slice(
    (safePage - 1) * pageSize,
    safePage * pageSize,
  );
  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);
  const allVisibleSelected =
    visibleItems.length > 0 &&
    visibleItems.every((item) => selectedIds.includes(item.id));

  return (
    // Główna struktura widoku: import, formularz, tryb edycji grupowej, filtry i tabela.
    <div className="space-y-6">
      <section className="rounded-2xl border border-line bg-white/5 p-4">
        <div className="flex flex-wrap items-end gap-3">
          <label className="text-sm text-muted">
            Konto importu
            <select
              value={form.accountId}
              onChange={(event) =>
                setForm({ ...form, accountId: event.target.value })
              }
              className="mt-1 block rounded-xl border border-line bg-panel px-3 py-2 text-white"
            >
              <option value="">Wybierz konto</option>
              {accounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name} ({account.currency})
                </option>
              ))}
            </select>
          </label>
          <label className="inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-2 text-black cursor-pointer">
            <FileSpreadsheet size={17} /> Importuj CSV
            <input
              type="file"
              accept=".csv,text/csv"
              onChange={handleImport}
              className="hidden"
            />
          </label>
          <button
            type="button"
            onClick={() => setMappingOpen(!mappingOpen)}
            className="rounded-xl border border-line px-3 py-2 text-lg text-muted"
            title="Mapowanie kategorii"
            aria-label="Mapowanie kategorii"
          >
            <FileCog size={18} />
          </button>
          {importMessage && (
            <span className="text-sm text-muted">{importMessage}</span>
          )}
        </div>
        {mappingOpen && (
          <div className="mt-4 rounded-xl border border-line bg-panel p-4">
            <h3 className="font-semibold">Mapowanie kategorii z pliku</h3>
            <p className="mt-1 text-sm text-muted">
              Zmień kategorię docelową używaną podczas importu.
            </p>
            <div className="mt-3 space-y-2">
              {Object.entries(categoryMapping).map(([source, target]) => (
                <div
                  key={source}
                  className="grid gap-2 md:grid-cols-[1fr_1fr] md:items-center"
                >
                  <span className="text-sm">{source}</span>
                  <select
                    value={target}
                    onChange={(event) =>
                      setCategoryMapping({
                        ...categoryMapping,
                        [source]: event.target.value,
                      })
                    }
                    className="rounded-xl border border-line bg-white/5 px-3 py-2 text-sm"
                  >
                    {categories.map((category) => (
                      <option key={category.id} value={category.name}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </div>
        )}
        {mappingOpen && (
          <div className="mapping-editor mt-4 rounded-xl border border-line bg-panel p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold">Mapowanie kategorii z pliku</h3>
                <p className="mt-1 text-sm text-muted">
                  Wpisz ręcznie obie wartości mapowania.
                </p>
              </div>
              <button
                type="button"
                onClick={() =>
                  setCategoryMapping([
                    ...categoryMapping,
                    { source: "", target: "" },
                  ])
                }
                className="rounded-xl bg-accent px-3 py-2 text-sm text-black"
              >
                + Dodaj mapowanie
              </button>
            </div>
            <div className="mt-3 space-y-2">
              {categoryMapping.map((item, index) => (
                <div
                  key={index}
                  className="grid gap-2 md:grid-cols-[1fr_1fr_auto] md:items-center"
                >
                  <input
                    value={item.source}
                    onChange={(event) =>
                      setCategoryMapping(
                        categoryMapping.map((row, rowIndex) =>
                          rowIndex === index
                            ? { ...row, source: event.target.value }
                            : row,
                        ),
                      )
                    }
                    placeholder="Kategoria z pliku"
                    className="rounded-xl border border-line bg-white/5 px-3 py-2 text-sm"
                  />
                  <input
                    value={item.target}
                    onChange={(event) =>
                      setCategoryMapping(
                        categoryMapping.map((row, rowIndex) =>
                          rowIndex === index
                            ? { ...row, target: event.target.value }
                            : row,
                        ),
                      )
                    }
                    placeholder="Kategoria w aplikacji"
                    className="rounded-xl border border-line bg-white/5 px-3 py-2 text-sm"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setCategoryMapping(
                        categoryMapping.filter(
                          (_, rowIndex) => rowIndex !== index,
                        ),
                      )
                    }
                    className="rounded-lg border border-rose-400/40 px-2 py-2 text-rose-300"
                    title="Usuń mapowanie"
                    aria-label="Usuń mapowanie"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>
      <button
        type="button"
        onClick={() => setShowCreateForm(!showCreateForm)}
        className="rounded-xl border border-line px-4 py-2 text-sm text-muted"
      >
        {showCreateForm
          ? "Zwiń ręczne dodawanie"
          : "+ Dodaj transakcję ręcznie"}
      </button>
      {showCreateForm && (
        <form
          onSubmit={handleSubmit}
          className="grid items-start gap-4 rounded-2xl border border-line bg-white/5 p-5 md:grid-cols-4"
        >
          <label className="flex flex-col gap-1 text-sm text-muted">
            Konto
            <select
              value={form.accountId}
              onChange={(event) =>
                setForm({ ...form, accountId: event.target.value })
              }
              className="rounded-xl border border-line bg-panel px-3 py-2 outline-none"
              required
            >
              <option value="">Wybierz konto</option>
              {accounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm text-muted">
            Data operacji
            <input
              value={form.occurredAt}
              onChange={(event) =>
                setForm({ ...form, occurredAt: event.target.value })
              }
              type="datetime-local"
              className="rounded-xl border border-line bg-panel px-3 py-2 outline-none"
              required
            />
          </label>
          <label className="flex flex-col gap-1 text-sm text-muted">
            Kwota
            <input
              value={form.amount}
              onChange={(event) =>
                setForm({ ...form, amount: event.target.value })
              }
              placeholder="Kwota"
              type="number"
              step="0.01"
              className="rounded-xl border border-line bg-panel px-3 py-2 outline-none"
              required
            />
          </label>
          <label className="flex flex-col gap-1 text-sm text-muted">
            Waluta
            <select
              value={form.currency}
              onChange={(event) =>
                setForm({ ...form, currency: event.target.value })
              }
              className="rounded-xl border border-line bg-panel px-3 py-2 outline-none"
            >
              {["PLN", "EUR", "USD", "GBP", "CHF"].map((currency) => (
                <option key={currency}>{currency}</option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm text-muted md:col-span-3">
            Opis
            <input
              value={form.description}
              onChange={(event) =>
                setForm({ ...form, description: event.target.value })
              }
              placeholder="Opis"
              className="mt-1 w-full rounded-xl border border-line bg-panel px-3 py-2 outline-none"
              required
            />
          </label>
          <label className="flex flex-col gap-1 text-sm text-muted">
            Kontrahent
            <input
              value={form.counterpartyName}
              onChange={(event) =>
                setForm({ ...form, counterpartyName: event.target.value })
              }
              placeholder="Kontrahent"
              className="rounded-xl border border-line bg-panel px-3 py-2 outline-none"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm text-muted">
            Typ transakcji
            <select
              value={form.transactionType}
              onChange={(event) =>
                setForm({ ...form, transactionType: event.target.value })
              }
              className="rounded-xl border border-line bg-panel px-3 py-2 outline-none"
            >
              <option value="Expense">Wydatek</option>
              <option value="Income">PrzychAld</option>
              <option value="Transfer">Przelew</option>
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm text-muted">
            Status
            <select
              value={form.status}
              onChange={(event) =>
                setForm({ ...form, status: event.target.value })
              }
              className="mt-1 w-full rounded-xl border border-line bg-panel px-3 py-2 outline-none"
            >
              <option value="Imported">Importowana</option>
              <option value="Manual">Ręczna</option>
              <option value="Ignored">Nieistotna</option>
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm text-muted">
            Kategoria
            <CategoryPicker
              categories={categories}
              value={form.categoryId}
              onChange={(categoryId) => setForm({ ...form, categoryId })}
            />
          </label>
          <div className="md:col-span-4 flex gap-3">
            <button
              className="rounded-xl bg-accent px-4 py-2 text-black"
              type="submit"
            >
              {editingId ? "Update transaction" : "Create transaction"}
            </button>
            {editingId && (
              <>
                <button
                  type="button"
                  className="rounded-xl border border-line px-4 py-2 text-muted"
                  onClick={() => {
                    setEditingId(null);
                    setForm(emptyForm);
                  }}
                >
                  Anuluj
                </button>
                <button
                  type="button"
                  className="rounded-xl border border-rose-400/40 px-4 py-2 text-rose-300"
                  onClick={async () => {
                    await handleArchive(editingId);
                    setEditingId(null);
                    setForm(emptyForm);
                  }}
                >
                  Usuń
                </button>
              </>
            )}
          </div>
        </form>
      )}

      <div className="min-h-[420px] overflow-x-auto rounded-2xl border border-line">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-white/5 px-4 py-3">
          <button
            type="button"
            onClick={() => {
              setBulkEdit(!bulkEdit);
              setSelectedIds([]);
            }}
            className="rounded-xl border border-line px-4 py-2 text-sm"
          >
            {bulkEdit ? "Zakończ edycję transakcji" : "Edytuj transakcje"}
          </button>
          {bulkEdit && (
            <span className="text-sm text-muted">
              Zaznacz transakcje, aby wykonać akcję grupową.
            </span>
          )}
        </div>
        {bulkEdit && (
          <div className="flex flex-wrap items-center gap-4 border-b border-line bg-white/[0.03] px-4 py-3 text-sm">
            <strong>Wybrano: {selectedIds.length}</strong>
            <button
              type="button"
              disabled={!selectedIds.length}
              onClick={() => setBulkCategoryOpen(true)}
              className="inline-flex items-center gap-1 text-accent disabled:opacity-40"
            >
              <Tag size={15} /> Przypisz kategorię
            </button>
            <button
              type="button"
              disabled={!selectedIds.length}
              onClick={() => handleBulkAction("irrelevant")}
              className="text-accent disabled:opacity-40"
            >
              Oznacz jako nieistotne
            </button>
            <button
              type="button"
              disabled={!selectedIds.length}
              onClick={() => handleBulkAction("relevant")}
              className="text-accent disabled:opacity-40"
            >
              Odznacz jako istotne
            </button>
            <button
              type="button"
              disabled={!selectedIds.length}
              onClick={() => handleBulkAction("archive")}
              className="text-accent disabled:opacity-40"
            >
              Usuń
            </button>
            <button
              type="button"
              disabled={!selectedIds.length}
              onClick={() => setSelectedIds([])}
              className="text-accent disabled:opacity-40"
            >
              Odznacz
            </button>
          </div>
        )}
        {bulkCategoryOpen && (
          <div
            className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="bulk-category-title"
          >
            <div className="w-full max-w-md rounded-2xl border border-line bg-panel p-5 shadow-2xl">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2
                    id="bulk-category-title"
                    className="text-lg font-semibold"
                  >
                    Przypisz kategorię
                  </h2>
                  <p className="mt-1 text-sm text-muted">
                    Wybrana kategoria zostanie przypisana do{" "}
                    {selectedIds.length} transakcji.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setBulkCategoryOpen(false)}
                  className="text-xl text-muted"
                  aria-label="Zamknij"
                >
                  ×
                </button>
              </div>
              <label className="mt-5 block text-sm text-muted">
                Kategoria
                <div className="mt-1">
                  <CategoryPicker
                    categories={categories}
                    value={bulkCategoryId}
                    onChange={setBulkCategoryId}
                  />
                </div>
              </label>
              <div className="mt-5 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setBulkCategoryOpen(false)}
                  className="inline-flex items-center gap-1 rounded-xl border border-line px-4 py-2 text-sm text-muted"
                >
                  <X size={15} /> Anuluj
                </button>
                <button
                  type="button"
                  disabled={!bulkCategoryId}
                  onClick={handleBulkCategoryAssign}
                  className="rounded-xl bg-accent px-4 py-2 text-sm text-black disabled:opacity-40"
                >
                  Przypisz
                </button>
              </div>
            </div>
          </div>
        )}
        <div className="transactions-filter-bars flex flex-wrap items-center gap-3 border-b border-line bg-white/5 p-3">
          <div className="flex flex-wrap gap-3 border-b border-line bg-white/5 p-3">
            <select
              value={dateFilter}
              onChange={(event) => setDateFilter(event.target.value)}
              className="rounded-xl border border-line bg-panel px-3 py-2 text-sm"
            >
              <option value="current-month">Bieżący miesiąc</option>
              <option value="previous-month">Poprzedni miesiąc</option>
              <option value="current-year">Obecny rok</option>
              <option value="previous-year">Poprzedni rok</option>
              <option value="all">Wszystkie okresy</option>
            </select>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filtruj po opisie"
              className="rounded-xl border border-line bg-panel px-3 py-2 text-sm"
            />
            <select
              value={filterAccount}
              onChange={(e) => setFilterAccount(e.target.value)}
              className="rounded-xl border border-line bg-panel px-3 py-2 text-sm"
            >
              <option value="">Konto: wszystkie</option>
              {accounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name}
                </option>
              ))}
            </select>
            <div ref={typeFilterRef} className="relative">
              <button
                type="button"
                onClick={() => setTypeFilterOpen(!typeFilterOpen)}
                className="inline-flex min-w-48 items-center justify-between gap-2 whitespace-nowrap rounded-xl border border-line bg-panel px-3 py-2 text-sm"
              >
                Typ:{" "}
                {selectedTypeFilters.length ? "Transakcje..." : "wszystkie"}{" "}
                {selectedTypeFilters.length > 1 && (
                  <span className="ml-2 rounded-full bg-white/10 px-2">
                    +{selectedTypeFilters.length - 1}
                  </span>
                )}{" "}
                {typeFilterOpen ? (
                  <ChevronUp size={15} />
                ) : (
                  <ChevronDown size={15} />
                )}
              </button>
              {typeFilterOpen && (
                <div className="absolute left-0 top-full z-30 mt-1 w-64 rounded-xl border border-line bg-panel p-1 shadow-xl">
                  {[
                    ["income", "Przychody"],
                    ["expense", "Koszty"],
                    ["confirmed", "Transakcje potwierdzone"],
                    ["unconfirmed", "Transakcje niepotwierdzone"],
                    ["relevant", "Transakcje istotne"],
                    ["irrelevant", "Transakcje nieistotne"],
                  ].map(([value, label]) => (
                    <button
                      type="button"
                      key={value}
                      onClick={() => toggleTypeFilter(value)}
                      className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm hover:bg-white/10"
                    >
                      <span>{label}</span>
                      {selectedTypeFilters.includes(value) && (
                        <span className="text-accent">✓</span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <label className="flex items-center gap-1 text-sm text-muted">
              Pokaż
              <select
                value={pageSize}
                onChange={(event) => setPageSize(Number(event.target.value))}
                className="rounded-xl border border-line bg-panel px-3 py-2 text-white"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </label>
          </div>
          <div className="flex flex-wrap gap-3 border-b border-line bg-white/5 p-3">
            <div ref={amountRef} className="relative">
              <button
                type="button"
                onClick={() => setAmountOpen(!amountOpen)}
                className="rounded-xl border border-line bg-panel px-3 py-2 text-sm"
              >
                Ustaw zakres kwot
              </button>
              {amountOpen && (
                <div className="absolute left-0 top-full z-30 mt-1 w-80 rounded-xl border border-line bg-panel p-4 shadow-xl">
                  <div className="mb-3 font-semibold">Ustaw zakres kwot</div>
                  <label className="mb-3 flex flex-col gap-1 text-sm text-muted">
                    Od kwoty
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={draftMinAmount}
                      onChange={(e) => setDraftMinAmount(e.target.value)}
                      className="rounded-xl border border-line bg-white/5 px-3 py-2 text-white"
                    />
                  </label>
                  <label className="mb-4 flex flex-col gap-1 text-sm text-muted">
                    Do kwoty
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={draftMaxAmount}
                      onChange={(e) => setDraftMaxAmount(e.target.value)}
                      className="rounded-xl border border-line bg-white/5 px-3 py-2 text-white"
                    />
                  </label>
                  <div className="flex justify-between gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setMinAmount("");
                        setMaxAmount("");
                        setDraftMinAmount("");
                        setDraftMaxAmount("");
                        setAmountOpen(false);
                      }}
                      className="rounded-xl border border-line px-3 py-2 text-sm text-muted"
                    >
                      WyczyLć
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setMinAmount(draftMinAmount);
                        setMaxAmount(draftMaxAmount);
                        setAmountOpen(false);
                      }}
                      className="rounded-xl bg-accent px-4 py-2 text-sm text-black"
                    >
                      OK
                    </button>
                  </div>
                </div>
              )}
            </div>
            <div className="w-64">
              <CategoryPicker
                categories={categories}
                value={categoryFilter}
                onChange={setCategoryFilter}
                compact
              />
            </div>
          </div>
        </div>
        <table className="w-full min-w-[1100px] table-fixed border-collapse text-left text-sm">
          <colgroup>
            <col className="w-[35px]" />
            <col className="w-[120px]" />
            <col className="w-[120px]" />
            <col className="w-[30px]" />
            <col className="w-[30px]" />
            <col className="w-[80px]" />
          </colgroup>
          <thead className="bg-white/5 text-muted">
            <tr>
              <th className="whitespace-nowrap px-4 py-3 font-medium">
                {bulkEdit && (
                  <input
                    type="checkbox"
                    checked={allVisibleSelected}
                    onChange={() => {
                      const ids = visibleItems.map((item) => item.id);
                      setSelectedIds((current) =>
                        allVisibleSelected
                          ? current.filter((id) => !ids.includes(id))
                          : Array.from(new Set([...current, ...ids])),
                      );
                    }}
                    className="mr-3"
                  />
                )}
                <button
                  onClick={() => toggleSort("date")}
                  className="inline-flex items-center gap-2"
                >
                  Data{" "}
                  <span>
                    {sort === "date"
                      ? sortDirection === "asc"
                        ? "↑"
                        : "↓"
                      : "↕"}
                  </span>
                </button>
              </th>
              <th className="px-4 py-3 font-medium">Opis/Tytuł</th>
              <th className="px-4 py-3 font-medium">Kategoria</th>
              <th className="px-4 py-3 font-medium">
                <button
                  onClick={() => toggleSort("amount")}
                  className="inline-flex items-center gap-2"
                >
                  Kwota{" "}
                  <span>
                    {sort === "amount"
                      ? sortDirection === "asc"
                        ? "↑"
                        : "↓"
                      : "↕"}
                  </span>
                </button>
              </th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Akcje</th>
            </tr>
          </thead>
          <tbody>
            {visibleItems.map((item) => (
              <tr
                key={item.id}
                className="border-t border-line/80 bg-white/[0.02]"
              >
                <td className="px-4 py-3 text-muted">
                  {bulkEdit && (
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(item.id)}
                      onChange={() => toggleSelected(item.id)}
                      className="mr-3"
                    />
                  )}
                  {new Date(item.occurredAt).toLocaleDateString("pl-PL")}
                </td>
                <td className="w-64 whitespace-normal break-words px-4 py-3">
                  {item.description}
                </td>
                <td className="w-80 px-4 py-3">
                  <CategoryPicker
                    categories={categories}
                    value={item.categoryId ?? ""}
                    onChange={(categoryId) =>
                      handleCategoryChange(item.id, categoryId)
                    }
                    compact
                  />
                </td>
                <td
                  className={`w-36 whitespace-nowrap px-4 py-3 font-medium ${item.amount >= 0 ? "text-emerald-400" : "text-rose-400"}`}
                >
                  {item.amount.toLocaleString("pl-PL", {
                    style: "currency",
                    currency: item.currency,
                  })}
                </td>
                <td className="px-4 py-3">
                  <span className="inline-flex items-center gap-1 rounded-full border border-line px-2 py-1 text-xs text-muted">
                    <StatusIcon status={item.status} />
                    {item.status}
                  </span>
                </td>
                <td className="w-64 px-4 py-3">
                  <div className="flex flex-wrap gap-2">
                    <button
                      className="inline-flex items-center gap-1 rounded-lg border border-line px-3 py-1 text-xs"
                      onClick={() => startEdit(item)}
                    >
                      <Pencil size={13} /> Edytuj
                    </button>
                    <button
                      className="inline-flex items-center gap-1 rounded-lg border border-line px-3 py-1 text-xs"
                      onClick={() => handleIrrelevant(item.id)}
                    >
                      <X size={13} /> Nieistotna
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="flex items-center justify-between border-t border-line bg-white/[0.03] px-4 py-3 text-sm">
          <button
            type="button"
            disabled={safePage <= 1}
            onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
            className="flex items-center gap-2 text-muted hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ChevronLeft size={18} /> Poprzednia
          </button>
          <div className="flex items-center gap-2">
            <span className="rounded-lg bg-accent px-3 py-2 font-medium text-black">
              {safePage}
            </span>
            <span className="text-muted">z {totalPages}</span>
          </div>
          <button
            type="button"
            disabled={safePage >= totalPages}
            onClick={() =>
              setCurrentPage((page) => Math.min(totalPages, page + 1))
            }
            className="flex items-center gap-2 text-muted hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
          >
            Następna <ChevronRight size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}

function StatusIcon({ status }: { status: string }) {
  if (status === "Ignored")
    return <CircleX size={13} className="text-rose-300" />;
  if (status === "Imported")
    return <CircleCheck size={13} className="text-emerald-300" />;
  return <CircleAlert size={13} className="text-amber-300" />;
}

function translateTransactionType(type: string) {
  const labels: Record<string, string> = {
    Expense: "Wydatek",
    Income: "PrzychAld",
    Transfer: "Przelew",
    Manual: "Ręczna",
    Imported: "Importowana",
  };
  return labels[type] ?? type;
}

export function CategoryPicker({
  categories,
  value,
  onChange,
  compact = false,
}: {
  categories: CategoryItem[];
  value: string;
  onChange: (value: string) => void;
  compact?: boolean;
}) {
  // Wspólny picker kategorii używany w filtrze, formularzu i masowym przypisywaniu.
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const pickerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (
        pickerRef.current &&
        !pickerRef.current.contains(event.target as Node)
      )
        setOpen(false);
    };
    document.addEventListener("mousedown", closeOnOutsideClick);
    return () => document.removeEventListener("mousedown", closeOnOutsideClick);
  }, [open]);
  const active = categories.filter((category) => !category.isArchived);
  const selectedCategory = active.find((category) => category.id === value);
  const selected = selectedCategory?.name ?? "Bez kategorii";
  const parents = active.filter((category) => !category.parentId);
  const query = search.trim().toLocaleLowerCase("pl-PL");
  const visibleParents = parents.filter((parent) => {
    const children = active.filter((child) => child.parentId === parent.id);
    return (
      !query ||
      parent.name.toLocaleLowerCase("pl-PL").includes(query) ||
      children.some((child) =>
        child.name.toLocaleLowerCase("pl-PL").includes(query),
      )
    );
  });
  const choose = (categoryId: string) => {
    onChange(categoryId);
    setSearch("");
    setOpen(false);
  };
  return (
    <div
      ref={pickerRef}
      className={`relative ${compact ? "w-full max-w-80" : "w-full"}`}
    >
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between rounded-xl border border-line bg-panel px-3 py-2 text-left text-sm transition hover:border-accent/70"
      >
        <span className="flex items-center gap-2 truncate">
          <span className="text-lg leading-none">
            {selectedCategory?.icon ?? "•"}
          </span>
          <span className="truncate">{selected}</span>
        </span>
        <span className="ml-2 text-muted">
          {open ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
        </span>
      </button>
      {open && (
        <div className="absolute z-30 mt-1 w-full overflow-hidden rounded-xl border border-line bg-panel shadow-2xl">
          <div className="border-b border-line p-2">
            <div className="flex items-center gap-2 rounded-lg bg-white/[0.04] px-2">
              <Search size={18} className="text-muted" />
              <input
                autoFocus
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Wyszukaj kategorię..."
                className="min-w-0 flex-1 bg-transparent px-1 py-2 text-sm outline-none placeholder:text-muted"
              />
            </div>
          </div>
          <div className="max-h-72 overflow-y-auto p-2">
            <button
              type="button"
              onClick={() => choose("")}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm text-muted hover:bg-white/10"
            >
              <span className="text-lg"></span>
              <span>Bez kategorii</span>
            </button>
            {visibleParents.map((parent) => {
              const children = active.filter(
                (child) => child.parentId === parent.id,
              );
              const filteredChildren = children.filter(
                (child) =>
                  !query ||
                  child.name.toLocaleLowerCase("pl-PL").includes(query) ||
                  parent.name.toLocaleLowerCase("pl-PL").includes(query),
              );
              const isExpanded = Boolean(query) || expanded === parent.id;
              return (
                <div key={parent.id}>
                  <button
                    type="button"
                    onClick={() =>
                      children.length
                        ? setExpanded(isExpanded && !query ? null : parent.id)
                        : choose(parent.id)
                    }
                    className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm hover:bg-white/10"
                  >
                    <span className="flex items-center gap-3">
                      <span className="text-lg leading-none">
                        {parent.icon ?? "•"}
                      </span>
                      <span>{parent.name}</span>
                    </span>
                    <span className="text-muted">
                      {children.length &&
                        (isExpanded ? (
                          <ChevronUp size={15} />
                        ) : (
                          <ChevronDown size={15} />
                        ))}
                    </span>
                  </button>
                  {isExpanded &&
                    filteredChildren.map((child) => (
                      <button
                        type="button"
                        key={child.id}
                        onClick={() => choose(child.id)}
                        className="flex w-full items-center gap-3 rounded-lg px-5 py-2 text-left text-sm text-muted hover:bg-white/10"
                      >
                        <span className="text-lg leading-none">
                          {child.icon ?? "•"}
                        </span>
                        <span>{child.name}</span>
                      </button>
                    ))}
                </div>
              );
            })}
            {visibleParents.length === 0 && (
              <p className="px-3 py-4 text-sm text-muted">
                Nie znaleziono kategorii.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
