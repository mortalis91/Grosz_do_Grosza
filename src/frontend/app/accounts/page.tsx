import { AccountsList } from "@/features/accounts/accounts-list";
import { AppShell } from "@/components/app-shell";

export default function AccountsPage() {
  return (
    <AppShell>
      <section className="space-y-6 rounded-3xl border border-line bg-panel/80 p-6">
        <div>
          <h1 className="text-3xl font-semibold">Rachunki i portfele</h1>
          <p className="mt-1 text-sm text-muted">
            Zarządzaj kontami, portfelami i wartością swoich aktywów.
          </p>
        </div>
        <AccountsList />
      </section>
    </AppShell>
  );
}
