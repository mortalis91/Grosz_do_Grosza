"use client";

import { useEffect, useState } from "react";
import { getTransactions, type TransactionItem } from "@/lib/transactions-api";
import { getCategories, type CategoryItem } from "@/lib/categories-api";

export function TransactionTable() {
  const [rows, setRows] = useState<TransactionItem[]>([]);
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  useEffect(() => {
    Promise.all([getTransactions(), getCategories()]).then(
      ([transactions, loadedCategories]) => {
        setRows(transactions.slice(0, 10));
        setCategories(loadedCategories);
      },
    );
  }, []);
  const categoryName = (id?: string | null) =>
    categories.find((x) => x.id === id)?.name ?? "Bez kategorii";
  return (
    <div className="overflow-hidden rounded-2xl border border-line">
      <table className="w-full border-collapse text-left text-sm">
        <thead className="bg-white/5 text-muted">
          <tr>
            <th className="px-4 py-3 font-medium">Data</th>
            <th className="px-4 py-3 font-medium">Kontrahent</th>
            <th className="px-4 py-3 font-medium">Kwota</th>
            <th className="px-4 py-3 font-medium">Kategoria</th>
            <th className="px-4 py-3 font-medium">Typ</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.id}
              className="border-t border-line/80 bg-white/[0.02]"
            >
              <td className="px-4 py-3 text-muted">
                {new Date(row.occurredAt).toLocaleDateString("pl-PL")}
              </td>
              <td className="px-4 py-3">
                {row.counterpartyName ?? row.description}
              </td>
              <td
                className={`px-4 py-3 font-medium ${row.amount >= 0 ? "text-emerald-400" : "text-rose-400"}`}
              >
                {row.amount.toLocaleString("pl-PL", {
                  style: "currency",
                  currency: row.currency,
                })}
              </td>
              <td className="px-4 py-3 text-muted">
                {categoryName(row.categoryId)}
              </td>
              <td className="px-4 py-3 text-muted">
                {row.direction === "Income"
                  ? "Przychód"
                  : row.direction === "Expense"
                    ? "Wydatek"
                    : "Przelew"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
