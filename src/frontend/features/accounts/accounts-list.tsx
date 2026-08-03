"use client";

import { useEffect, useState } from "react";
import {
  createAccount,
  deleteAccount,
  getAccounts,
  type AccountItem,
  updateAccount,
} from "@/lib/accounts-api";
import { getDashboardSummary } from "@/lib/api";
import { readToken } from "@/lib/session";
import { CreditCard, Landmark, Pencil, PiggyBank, Plus, Trash2 } from "lucide-react";

const assetTypes = [
  ["Bank", "🏦 Konta bankowe"],
  ["Cash", "💵 Gotówka"],
  ["Investment", "📈 Rachunki inwestycyjne"],
  ["Retirement", "🏛 Konta emerytalne"],
  ["Crypto", "₿ Kryptowaluty"],
  ["PreciousMetals", "🪙 Metale szlachetne"],
  ["RealEstate", "🏠 Nieruchomości"],
] as const;

const emptyForm = {
  name: "",
  accountType: "Bank",
  currency: "PLN",
  currentBalance: 0,
  externalAccountId: "",
};

function assetLabel(type: string) {
  return assetTypes.find(([value]) => value === type)?.[1] ?? type;
}

export function AccountsList() {
  const [items, setItems] = useState<AccountItem[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [assetsPln, setAssetsPln] = useState(0);

  async function refresh() {
    setItems(await getAccounts());
    const summary = await getDashboardSummary(readToken());
    setAssetsPln(summary?.balance ?? 0);
  }
  useEffect(() => {
    refresh();
  }, []);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const payload = {
      ...form,
      currentBalance: Number(form.currentBalance),
      externalAccountId: form.externalAccountId || undefined,
    };
    if (editingId) await updateAccount(editingId, payload);
    else await createAccount(payload);
    setForm(emptyForm);
    setEditingId(null);
    await refresh();
  }

  function startEdit(item: AccountItem) {
    setEditingId(item.id);
    setForm({
      name: item.name,
      accountType: item.accountType,
      currency: item.currency,
      currentBalance: item.currentBalance,
      externalAccountId: item.externalAccountId ?? "",
    });
  }

  async function handleDelete(id: string) {
    if (!window.confirm("Czy na pewno usunąć ten rachunek lub portfel?"))
      return;
    await deleteAccount(id);
    await refresh();
  }

  const totalsByCurrency = items.reduce<Record<string, number>>(
    (totals, account) => {
      totals[account.currency] =
        (totals[account.currency] ?? 0) + account.currentBalance;
      return totals;
    },
    {},
  );

  return (
    <div className="space-y-6">
      <form
        onSubmit={handleSubmit}
        className="grid gap-4 rounded-2xl border border-line bg-white/5 p-4 md:grid-cols-4"
      >
        <label className="text-sm text-muted">
          Nazwa
          <input
            value={form.name}
            onChange={(event) => setForm({ ...form, name: event.target.value })}
            className="mt-1 w-full rounded-xl border border-line bg-panel px-3 py-2 text-white outline-none"
            required
          />
        </label>
        <label className="text-sm text-muted">
          <span className="inline-flex items-center gap-2"><Landmark size={15} /> Typ aktywów</span>
          <select
            value={form.accountType}
            onChange={(event) =>
              setForm({ ...form, accountType: event.target.value })
            }
            className="mt-1 w-full rounded-xl border border-line bg-panel px-3 py-2 text-white outline-none"
          >
            {assetTypes.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm text-muted">
          Saldo bieżące
          <input
            type="number"
            step="0.01"
            value={form.currentBalance}
            onChange={(event) =>
              setForm({ ...form, currentBalance: Number(event.target.value) })
            }
            className="mt-1 w-full rounded-xl border border-line bg-panel px-3 py-2 text-white outline-none"
          />
        </label>
        <label className="text-sm text-muted">
          Waluta
          <input
            value={form.currency}
            onChange={(event) =>
              setForm({ ...form, currency: event.target.value.toUpperCase() })
            }
            maxLength={3}
            className="mt-1 w-full rounded-xl border border-line bg-panel px-3 py-2 text-white outline-none"
            required
          />
        </label>
        <label className="text-sm text-muted md:col-span-2">
          External ID
          <input
            value={form.externalAccountId}
            onChange={(event) =>
              setForm({ ...form, externalAccountId: event.target.value })
            }
            className="mt-1 w-full rounded-xl border border-line bg-panel px-3 py-2 text-white outline-none"
          />
        </label>
        <div className="flex items-end gap-3 md:col-span-2">
          <button
            className="rounded-xl bg-accent px-4 py-2 text-black"
            type="submit"
          >
            {editingId ? "Zapisz rachunek" : "Dodaj rachunek"}
          </button>
          {editingId && (
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
          )}
        </div>
      </form>
      <div className="rounded-2xl border border-line bg-white/5 p-4">
        <h2 className="text-sm font-semibold">Wartość kont</h2>
        <div className="mt-3 flex flex-wrap gap-4">
          <div className="rounded-xl border border-accent/40 bg-accent/10 px-4 py-3">
            <div className="text-xs text-muted">Wartość wszystkich aktywów</div>
            <div className="mt-1 text-xl font-semibold text-accent">
              {assetsPln.toLocaleString("pl-PL", { minimumFractionDigits: 2 })}{" "}
              PLN
            </div>
          </div>
          {Object.entries(totalsByCurrency).map(([currency, total]) => (
            <div
              key={currency}
              className="rounded-xl border border-line px-4 py-3"
            >
              <div className="text-xs text-muted">Łącznie {currency}</div>
              <div className="mt-1 text-xl font-semibold">
                {total.toLocaleString("pl-PL", { minimumFractionDigits: 2 })}{" "}
                {currency}
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="overflow-hidden rounded-2xl border border-line">
        <table className="w-full border-collapse text-left text-sm">
          <thead className="bg-white/5 text-muted">
            <tr>
              <th className="px-4 py-3 font-medium">Nazwa</th>
              <th className="px-4 py-3 font-medium">Typ aktywów</th>
              <th className="px-4 py-3 font-medium">Waluta</th>
              <th className="px-4 py-3 font-medium">Wartość konta</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Akcje</th>
            </tr>
          </thead>
          <tbody>
            {items.map((account) => (
              <tr
                key={account.id}
                className="border-t border-line/80 bg-white/[0.02]"
              >
                <td className="px-4 py-3">{account.name}</td>
                <td className="px-4 py-3 text-muted">
                  {assetLabel(account.accountType)}
                </td>
                <td className="px-4 py-3 text-muted">{account.currency}</td>
                <td className="px-4 py-3">
                  {account.currentBalance.toLocaleString("pl-PL", {
                    minimumFractionDigits: 2,
                  })}{" "}
                  {account.currency}
                </td>
                <td className="px-4 py-3">
                  <span className="rounded-full border border-line px-2 py-1 text-xs text-muted">
                    Aktywne
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <button
                      className="rounded-lg border border-line px-3 py-1 text-xs"
                      onClick={() => startEdit(account)}
                    >
                      Edytuj
                    </button>
                    <button
                      className="rounded-lg border border-rose-400/40 px-3 py-1 text-xs text-rose-300"
                      onClick={() => handleDelete(account.id)}
                    >
                      <Trash2 size={15} /> Usuń
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
