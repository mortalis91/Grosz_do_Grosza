import { TransactionsList } from "@/features/transactions/transactions-list";
import { AppShell } from "@/components/app-shell";

export default function TransactionsPage() {
  return (
    <AppShell>
      <section className="space-y-6 rounded-3xl border border-line bg-panel/80 p-6">
        <div>
          <h1 className="text-3xl font-semibold">Transakcje</h1>
          <p className="mt-1 text-sm text-muted">
            Importuj, filtruj i porządkuj swoje operacje finansowe.
          </p>
        </div>
        <TransactionsList />
      </section>
    </AppShell>
  );
}
