import { authFetch } from "@/lib/auth-fetch";

export type TransactionItem = {
  id: string;
  userId: string;
  accountId: string;
  occurredAt: string;
  amount: number;
  currency: string;
  direction: string;
  status: string;
  description: string;
  counterpartyName?: string | null;
  categoryId?: string | null;
  transactionType: string;
  externalTransactionId?: string | null;
  refundTransactionId?: string | null;
};
export type TransactionSplit = { id?: string; categoryId: string; amount: number; memo: string };
export async function saveTransactionSplits(id: string, items: TransactionSplit[]) {
  const response = await authFetch(`/api/v1/transactions/${id}/splits`, { method: "PUT", body: JSON.stringify({ items }) });
  if (!response.ok) throw new Error("Nie udało się zapisać podziału transakcji.");
}

export async function getTransactions(page = 1, pageSize = 25) {
  const response = await authFetch(
    `/api/v1/transactions?page=${page}&pageSize=${pageSize}`,
  );
  if (!response.ok) return [];
  return (await response.json()) as TransactionItem[];
}

export async function createTransaction(payload: {
  accountId: string;
  occurredAt: string;
  bookedAt?: string | null;
  amount: number;
  currency: string;
  direction: string;
  status: string;
  description: string;
  counterpartyName?: string;
  counterpartyAccount?: string;
  iban?: string;
  merchant?: string;
  categoryId?: string | null;
  transactionType: string;
  referenceNumber?: string | null;
  externalTransactionId?: string | null;
}) {
  const response = await authFetch("/api/v1/transactions", {
    method: "POST",
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error("Failed to create transaction");
  }

  return (await response.json()) as TransactionItem;
}

export async function updateTransaction(
  id: string,
  payload: Parameters<typeof createTransaction>[0],
) {
  const response = await authFetch(`/api/v1/transactions/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error("Failed to update transaction");
  }
}

export async function archiveTransaction(id: string) {
  const response = await authFetch(`/api/v1/transactions/${id}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    throw new Error("Nie udało się usunąć transakcji.");
  }
}

export async function deleteAllTransactions() {
  const response = await authFetch("/api/v1/transactions/all", {
    method: "DELETE",
  });
  if (!response.ok) throw new Error("Nie udało się usunąć transakcji.");
}

export async function markTransactionIrrelevant(id: string) {
  const response = await authFetch(`/api/v1/transactions/${id}/irrelevant`, {
    method: "POST",
  });
  if (!response.ok) throw new Error("Nie udało się oznaczyć transakcji.");
}

export async function markTransactionRelevant(id: string) {
  const response = await authFetch(`/api/v1/transactions/${id}/relevant`, {
    method: "POST",
  });
  if (!response.ok)
    throw new Error("Nie udało się oznaczyć transakcji jako istotnej.");
}

export async function updateTransactionCategory(
  id: string,
  categoryId: string | null,
) {
  const response = await authFetch(`/api/v1/transactions/${id}/category`, {
    method: "PATCH",
    body: JSON.stringify(categoryId),
  });
  if (!response.ok) throw new Error("Nie udało się zmienić kategorii.");
}
