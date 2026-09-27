export type DashboardSummary = {
  balance: number;
  income: number;
  expenses: number;
  netWorth: number;
  recentTransactions: Array<{
    id: string;
    occurredAt: string;
    counterpartyName: string;
    amount: number;
    currency: string;
    categoryName: string;
    transactionType: string;
  }>;
  topSpendingCategories: Array<{
    categoryName: string;
    amount: number;
    percentage: number;
  }>;
};

const baseUrl =
  process.env.NEXT_PUBLIC_BACKEND_API_URL ?? "http://localhost:5211";

export async function getDashboardSummary(
  token?: string | null,
  year?: number,
  month?: number,
): Promise<DashboardSummary | null> {
  try {
    const params = year ? `?year=${year}${month ? `&month=${month}` : ""}` : "";
    const response = await fetch(
      `${baseUrl}/api/v1/dashboard/summary${params}`,
      {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        cache: "no-store",
      },
    );

    if (!response.ok) {
      return null;
    }

    return (await response.json()) as DashboardSummary;
  } catch {
    return null;
  }
}
