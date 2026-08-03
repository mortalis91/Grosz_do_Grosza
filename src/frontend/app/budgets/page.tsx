"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { getCategories, type CategoryItem } from "@/lib/categories-api";
import {
  createBudget,
  deleteBudget,
  getBudgets,
  type BudgetItem,
} from "@/lib/budgets-api";
import { CategoryPicker } from "@/features/transactions/transactions-list";
import { CalendarDays, Plus, Trash2 } from "lucide-react";

export default function BudgetsPage() {
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [items, setItems] = useState<BudgetItem[]>([]);
  const [month, setMonth] = useState(() => new Date());
  const [categoryId, setCategoryId] = useState("");
  const [amount, setAmount] = useState("");
  const [comment, setComment] = useState("");

  async function refresh() {
    setCategories(await getCategories());
    setItems(await getBudgets(month.getFullYear(), month.getMonth() + 1));
  }

  useEffect(() => {
    refresh();
  }, [month]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    await createBudget({
      categoryId,
      amount: Number(amount),
      currency: "PLN",
      year: month.getFullYear(),
      month: month.getMonth() + 1,
      comment,
    });
    setCategoryId("");
    setAmount("");
    setComment("");
    await refresh();
  }

  async function remove(id: string) {
    if (!window.confirm("Czy na pewno usunąć ten budżet?")) return;
    await deleteBudget(id);
    await refresh();
  }

  const active = categories.filter((x) => !x.isArchived);
  const name = (id: string) =>
    active.find((x) => x.id === id)?.name ?? "Nieznana kategoria";
  const format = (value: number) =>
    `${value.toLocaleString("pl-PL", { minimumFractionDigits: 2 })} PLN`;

  return (
    <AppShell>
      <section className="space-y-6 rounded-3xl border border-line bg-panel/80 p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-semibold">Budżety</h1>
            <p className="mt-1 text-sm text-muted">
              Planuj wydatki według kategorii i kontroluj pozostałe środki.
            </p>
          </div>
          <input
            type="month"
            value={`${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, "0")}`}
            onChange={(e) => setMonth(new Date(`${e.target.value}-01`))}
            className="rounded-xl border border-line bg-panel px-3 py-2"
          />
        </div>
        <form
          onSubmit={submit}
          className="grid gap-4 rounded-2xl border border-line bg-white/5 p-5 md:grid-cols-4"
        >
          <label className="flex flex-col gap-1 text-sm text-muted">
            Kategoria
            <CategoryPicker
              categories={active}
              value={categoryId}
              onChange={setCategoryId}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm text-muted">
            Kwota
            <input
              required
              type="number"
              min="0.01"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Kwota"
              className="rounded-xl border border-line bg-panel px-3 py-2"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm text-muted">
            Komentarz
            <input
              maxLength={160}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Komentarz"
              className="rounded-xl border border-line bg-panel px-3 py-2"
            />
          </label>
          <div className="flex items-end">
            <button
              className="rounded-xl bg-accent px-4 py-2 text-black"
              type="submit"
            >
              Zaplanuj budżet
            </button>
          </div>
        </form>
        <div className="rounded-2xl border border-line">
          <div className="grid grid-cols-[1.5fr_1fr_1fr_1fr_2fr_auto] gap-4 border-b border-line p-4 text-sm text-muted">
            <span>Kategoria</span>
            <span>Zaplanowano</span>
            <span>Wydatki</span>
            <span>Pozostało</span>
            <span>Komentarz</span>
            <span>Akcje</span>
          </div>
          {items.length ? (
            items.map((item) => {
              const remaining = item.plannedAmount - item.actualAmount;
              return (
                <div
                  key={item.id}
                  className="grid grid-cols-[1.5fr_1fr_1fr_1fr_2fr_auto] items-center gap-4 border-b border-line/70 px-4 py-4 text-sm"
                >
                  <span>{name(item.categoryId)}</span>
                  <span>{format(item.plannedAmount)}</span>
                  <span>{format(item.actualAmount)}</span>
                  <span
                    className={
                      remaining < 0 ? "text-rose-400" : "text-emerald-400"
                    }
                  >
                    {format(remaining)}
                  </span>
                  <span className="text-muted">
                    {item.comment || "Brak komentarza"}
                  </span>
                  <button
                    type="button"
                    onClick={() => remove(item.id)}
                    className="rounded-lg border border-rose-400/40 px-3 py-1 text-xs text-rose-300"
                  >
                    <Trash2 size={15} /> Usuń
                  </button>
                </div>
              );
            })
          ) : (
            <p className="p-4 text-muted">
              Brak zaplanowanych wydatków dla wybranego miesiąca.
            </p>
          )}
        </div>
      </section>
    </AppShell>
  );
}
