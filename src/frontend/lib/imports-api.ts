import { authFetch } from "@/lib/auth-fetch";

export async function importBankCsv(
  accountId: string,
  file: File,
  categoryMapping: Record<string, string> = {},
) {
  const body = new FormData();
  body.append("accountId", accountId);
  body.append("file", file);
  body.append("categoryMapping", JSON.stringify(categoryMapping));
  const response = await authFetch("/api/v1/imports", { method: "POST", body });
  if (!response.ok)
    throw new Error((await response.text()) || "Import nie powiódł się.");
  return response.json() as Promise<{
    importedRows: number;
    createdTransactions: number;
    duplicateRows: number;
    failedRows: number;
  }>;
}
