"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { CategoryPicker } from "@/features/transactions/transactions-list";
import { getCategories, type CategoryItem } from "@/lib/categories-api";
import {
  createRule,
  deleteRule,
  getRules,
  type CategoryRule,
} from "@/lib/rules-api";
import { getAccounts } from "@/lib/accounts-api";
import { getTransactions } from "@/lib/transactions-api";
import { clearToken, readToken } from "@/lib/session";
import { authFetch } from "@/lib/auth-fetch";

function userIdFromToken(token: string) {
  try {
    return JSON.parse(
      atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")),
    ).sub as string;
  } catch {
    return "";
  }
}

export default function SettingsPage() {
  const router = useRouter();
  const [tab, setTab] = useState("rules");
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [rules, setRules] = useState<CategoryRule[]>([]);
  const [categoryId, setCategoryId] = useState("");
  const [conditionType, setConditionType] = useState("contains");
  const [text, setText] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const token = readToken();
    if (!token) {
      router.replace("/auth");
      return;
    }
    const userId = userIdFromToken(token);
    Promise.all([getCategories(), getRules(userId)]).then(
      ([loadedCategories, loadedRules]) => {
        setCategories(loadedCategories);
        setRules(loadedRules);
      },
    );
  }, [router]);

  async function refreshRules() {
    const token = readToken();
    if (token) setRules(await getRules(userIdFromToken(token)));
  }
  async function saveRule() {
    const token = readToken();
    const userId = token ? userIdFromToken(token) : "";
    if (!userId || !categoryId || !text.trim()) {
      setMessage("Uzupełnij tekst i kategorię.");
      return;
    }
    try {
      await createRule({
        userId,
        categoryId,
        conditionType,
        counterpartyValue: text.trim(),
        priority: 0,
        isEnabled: true,
      });
      await refreshRules();
      setText("");
      setMessage("Reguła została dodana.");
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Nie udało się zapisać reguły.",
      );
    }
  }
  async function removeRule(id: string) {
    if (!window.confirm("Usunąć tę regułę?")) return;
    try {
      await deleteRule(id);
      await refreshRules();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Nie udało się usunąć reguły.",
      );
    }
  }
  async function exportData() {
    const [accounts, transactions] = await Promise.all([
      getAccounts(),
      getTransactions(1, 5000),
    ]);
    const blob = new Blob(
      [
        JSON.stringify(
          { exportedAt: new Date().toISOString(), accounts, transactions },
          null,
          2,
        ),
      ],
      { type: "application/json" },
    );
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "grosz-do-grosza-export.json";
    link.click();
    URL.revokeObjectURL(url);
  }
  async function removeAccount() {
    if (
      !window.confirm(
        "Czy na pewno usunąć konto główne? Wszystkie konta i transakcje zostaną usunięte. Tej operacji nie można cofnąć.",
      )
    )
      return;
    const response = await authFetch("/api/v1/user", { method: "DELETE" });
    if (response.ok) {
      clearToken();
      router.replace("/auth");
    } else setMessage("Nie udało się usunąć konta.");
  }

  return (
    <AppShell>
      <div className="rounded-3xl border border-line bg-panel/80 p-6 shadow-glow">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-semibold">Ustawienia</h2>
          <button
            onClick={() => router.push("/dashboard")}
            className="rounded-xl border border-line px-3 py-2 text-sm"
          >
            Wróć
          </button>
        </div>
        <div className="mt-6 flex flex-wrap gap-2 border-b border-line pb-3">
          {[
            ["rules", "Reguły indywidualne"],
            ["migration", "Migracja danych"],
            ["delete", "Usuń konto"],
          ].map(([value, label]) => (
            <button
              key={value}
              onClick={() => setTab(value)}
              className={`rounded-xl px-4 py-2 text-sm ${tab === value ? "bg-accent text-black" : "border border-line text-muted"}`}
            >
              {label}
            </button>
          ))}
        </div>
        {tab === "rules" && (
          <section className="mt-6 max-w-4xl">
            <h3 className="text-lg font-semibold">
              Automatyczne przypisywanie kategorii
            </h3>
            <p className="mt-2 text-sm text-muted">
              Reguła zadziała przy imporcie przyszłych transakcji na podstawie
              tytułu przelewu.
            </p>
            <div className="mt-5 grid gap-4 md:grid-cols-[1fr_180px_1fr_auto] md:items-end">
              <label className="text-sm text-muted">
                Fragment tytułu
                <input
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-line bg-panel px-3 py-2 text-white"
                  placeholder="np. Lidl"
                />
              </label>
              <label className="text-sm text-muted">
                Porównanie
                <select
                  value={conditionType}
                  onChange={(e) => setConditionType(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-line bg-panel px-3 py-2 text-white"
                >
                  <option value="contains">Zawiera</option>
                  <option value="equals">Równa się</option>
                </select>
              </label>
              <label className="text-sm text-muted">
                Kategoria
                <CategoryPicker
                  categories={categories}
                  value={categoryId}
                  onChange={setCategoryId}
                  compact
                />
              </label>
              <button
                onClick={saveRule}
                className="rounded-xl bg-accent px-4 py-2 text-black"
              >
                Dodaj
              </button>
            </div>
            {message && <p className="mt-4 text-sm text-accent">{message}</p>}
            <div className="mt-6 space-y-2">
              {rules.map((rule) => {
                const category = categories.find(
                  (item) => item.id === rule.categoryId,
                );
                return (
                  <div
                    key={rule.id}
                    className="flex items-center justify-between gap-4 rounded-xl border border-line px-4 py-3 text-sm"
                  >
                    <span>
                      <strong>{rule.counterpartyValue}</strong>{" "}
                      <span className="text-muted">
                        (
                        {rule.conditionType === "equals"
                          ? "równa się"
                          : "zawiera"}
                        )
                      </span>
                      <span className="ml-2 text-accent">
                        → {category?.icon ?? "•"}{" "}
                        {category?.name ?? "Nieznana kategoria"}
                      </span>
                    </span>
                    <button
                      type="button"
                      onClick={() => removeRule(rule.id)}
                      aria-label="Usuń regułę"
                      title="Usuń regułę"
                      className="rounded-lg border border-rose-400/40 px-2 py-1 text-rose-300 hover:bg-rose-400/10"
                    >
                      🗑
                    </button>
                  </div>
                );
              })}
            </div>
          </section>
        )}
        {tab === "migration" && (
          <section className="mt-6 max-w-2xl">
            <h3 className="text-lg font-semibold">Migracja danych</h3>
            <p className="mt-2 text-sm text-muted">
              Eksport obejmuje wszystkie konta i transakcje w jednym pliku JSON.
            </p>
            <button
              onClick={exportData}
              className="mt-5 rounded-xl bg-accent px-4 py-2 text-black"
            >
              Eksportuj dane
            </button>
          </section>
        )}
        {tab === "delete" && (
          <section className="mt-6 max-w-2xl">
            <h3 className="text-lg font-semibold text-rose-300">Usuń konto</h3>
            <p className="mt-2 text-sm text-muted">
              Wszystkie Twoje konta i transakcje zostaną usunięte.
            </p>
            <p className="mt-2 font-semibold text-rose-300">
              Ta operacja jest nieodwracalna.
            </p>
            <button
              onClick={removeAccount}
              className="mt-5 rounded-xl border border-rose-400/50 px-4 py-2 text-rose-300"
            >
              Usuń konto główne
            </button>
          </section>
        )}
      </div>
    </AppShell>
  );
}
