import { authFetch } from "@/lib/auth-fetch";

export type AccountItem = {
  id: string;
  userId: string;
  name: string;
  accountType: string;
  currency: string;
  currentBalance: number;
  isArchived: boolean;
  externalAccountId?: string | null;
};

export async function getAccounts() {
  const response = await authFetch("/api/v1/accounts");
  if (!response.ok) return [];
  return (await response.json()) as AccountItem[];
}

export async function createAccount(payload: {
  name: string;
  accountType: string;
  currency: string;
  currentBalance: number;
  externalAccountId?: string;
}) {
  const response = await authFetch("/api/v1/accounts", {
    method: "POST",
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error("Failed to create account");
  }

  return (await response.json()) as AccountItem;
}

export async function updateAccount(
  id: string,
  payload: {
    name: string;
    accountType: string;
    currency: string;
    currentBalance: number;
    externalAccountId?: string;
  },
) {
  const response = await authFetch(`/api/v1/accounts/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error("Failed to update account");
  }
}

export async function archiveAccount(id: string) {
  const response = await authFetch(`/api/v1/accounts/${id}/archive`, {
    method: "POST",
  });

  if (!response.ok) {
    throw new Error("Failed to archive account");
  }
}

export async function deleteAccount(id: string) {
  const response = await authFetch(`/api/v1/accounts/${id}`, {
    method: "DELETE",
  });
  if (!response.ok) throw new Error("Nie udało się usunąć rachunku.");
}
