import { authFetch } from "@/lib/auth-fetch";
export type BudgetItem = {
  id: string;
  budgetId: string;
  categoryId: string;
  plannedAmount: number;
  actualAmount: number;
  comment?: string | null;
  startDate: string;
  currency: string;
};
export async function getBudgets(year: number, month: number) {
  const r = await authFetch(
    `/api/v1/budgets?month=${year}-${String(month).padStart(2, "0")}-01`,
  );
  return r.ok ? ((await r.json()) as BudgetItem[]) : [];
}
export async function createBudget(payload: {
  categoryId: string;
  amount: number;
  currency: string;
  year: number;
  month: number;
  comment?: string;
}) {
  const r = await authFetch("/api/v1/budgets", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  if (!r.ok) throw new Error("Nie udało się zapisać budżetu.");
}
export async function deleteBudget(id: string) {
  const r = await authFetch(`/api/v1/budgets/items/${id}`, {
    method: "DELETE",
  });
  if (!r.ok) throw new Error("Nie udało się usunąć budżetu.");
}
