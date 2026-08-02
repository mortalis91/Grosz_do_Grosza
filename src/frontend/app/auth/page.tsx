import { redirect } from "next/navigation";
import { AuthCard } from "@/components/auth-card";
import { readToken } from "@/lib/session";

export default function AuthPage() {
  if (readToken()) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen px-4 py-8">
      <div className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-6xl items-center gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="space-y-6">
          <div className="text-xs uppercase tracking-[0.35em] text-muted">
            Grosz do Grosza
          </div>
          <h1 className="max-w-2xl text-5xl font-semibold tracking-tight md:text-7xl">
            Personal finance, built like a product, not a spreadsheet.
          </h1>
          <p className="max-w-xl text-lg text-muted">
            Importuj banki, kategoryzuj automatycznie, kontroluj budżety i
            analizuj wydatki w jednym miejscu.
          </p>
          <div className="grid gap-3 sm:grid-cols-3">
            {["JWT auth", "CSV import", "Dashboard live data"].map((item) => (
              <div
                key={item}
                className="rounded-2xl border border-line bg-panel/70 p-4 text-sm text-muted"
              >
                {item}
              </div>
            ))}
          </div>
        </section>

        <AuthCard />
      </div>
    </div>
  );
}
