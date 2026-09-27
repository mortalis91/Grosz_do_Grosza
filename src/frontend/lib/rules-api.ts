import { authFetch } from "@/lib/auth-fetch";

export type CategoryRule = {
  id: string;
  categoryId: string;
  priority: number;
  isEnabled: boolean;
  conditionType: string;
  counterpartyValue?: string | null;
};

export async function getRules(userId: string) {
  const response = await authFetch(`/api/v1/category-rules?userId=${userId}`);
  return response.ok ? ((await response.json()) as CategoryRule[]) : [];
}

export async function createRule(payload: {
  userId: string;
  categoryId: string;
  conditionType: string;
  counterpartyValue: string;
  priority: number;
  isEnabled: boolean;
}) {
  const response = await authFetch("/api/v1/category-rules", {
    method: "POST",
    body: JSON.stringify({
      ...payload,
      conditionValue: payload.counterpartyValue,
      amountOperator: "none",
      amountValue: null,
    }),
  });
  if (!response.ok)
    throw new Error((await response.text()) || "Nie udało się zapisać reguły.");
}

export async function deleteRule(id: string) {
  const response = await authFetch(`/api/v1/category-rules/${id}`, {
    method: "DELETE",
  });
  if (!response.ok) throw new Error("Nie udało się usunąć reguły.");
}
