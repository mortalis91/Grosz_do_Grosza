"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getDashboardSummary, type DashboardSummary } from "@/lib/api";
import { readToken } from "@/lib/session";
import { AppShell } from "@/components/app-shell";
import { StatCard } from "@/components/stat-card";
import { TransactionTable } from "@/features/transactions/transaction-table";

export function DashboardClient() {
  const router = useRouter();
  const [dashboard, setDashboard] = useState<DashboardSummary | null>(null);
  const [ready, setReady] = useState(false);
  const [period, setPeriod] = useState(() => new Date());

  useEffect(() => {
    const token = readToken();
    if (!token) {
      router.replace("/auth");
      return;
    }
    getDashboardSummary(
      token,
      period.getFullYear(),
      period.getMonth() + 1,
    ).then((result) => {
      setDashboard(result);
      setReady(true);
    });
  }, [router, period]);

  const summary = dashboard
    ? [
        {
          label: "Saldo",
          value: formatCurrency(dashboard.balance),
          delta: "Stan bieżący",
          tone: "neutral" as const,
        },
        {
          label: "Przychody",
          value: formatCurrency(dashboard.income),
          delta: "+ Wpływy w miesiącu",
          tone: "positive" as const,
        },
        {
          label: "Wydatki",
          value: formatCurrency(dashboard.expenses),
          delta: "- Wydatki w miesiącu",
          tone: "negative" as const,
        },
      ]
    : [
        {
          label: "Saldo",
          value: "0,00 zł‚",
          delta: ready ? "Brak danych" : "Ładowanie...",
          tone: "neutral" as const,
        },
        {
          label: "Przychody",
          value: "0,00 zł‚",
          delta: ready ? "Brak danych" : "Ładowanie...",
          tone: "positive" as const,
        },
        {
          label: "Wydatki",
          value: "0,00 zł‚",
          delta: ready ? "Brak danych" : "Ładowanie...",
          tone: "negative" as const,
        },
      ];

  return (
    <AppShell>
      <section className="space-y-6 rounded-3xl border border-line bg-panel/80 p-6">
        <div>
          <h1 className="text-3xl font-semibold">Dashboard</h1>
          <p className="mt-1 text-sm text-muted">
            Podsumowanie finansów osobistych i najważniejsze operacje.
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-panel/80 p-4">
          <h2 className="font-semibold">Podsumowanie miesiąca</h2>
          <input
            type="month"
            value={`${period.getFullYear()}-${String(period.getMonth() + 1).padStart(2, "0")}`}
            onChange={(event) =>
              setPeriod(new Date(`${event.target.value}-01`))
            }
            className="rounded-xl border border-line bg-panel px-3 py-2"
          />
        </div>{" "}
        <section className="grid gap-4 md:grid-cols-3">
          {summary.map((item) => (
            <StatCard key={item.label} {...item} />
          ))}
        </section>
        <section className="grid gap-4 xl:grid-cols-[2fr_1fr]">
          <div className="rounded-3xl border border-line bg-panel/80 p-6 shadow-glow backdrop-blur">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Ostatnie operacje</h2>
            </div>
            <TransactionTable />
          </div>

          <div className="space-y-4">
            <div className="rounded-3xl border border-line bg-panel/80 p-6 shadow-glow backdrop-blur">
              <h2 className="text-lg font-semibold">Największe wydatki</h2>
              <ExpenseDonutChart
                items={dashboard?.topSpendingCategories ?? []}
              />
            </div>
          </div>
        </section>
      </section>
    </AppShell>
  );
}

function ExpenseDonutChart({
  items,
}: {
  items: DashboardSummary["topSpendingCategories"];
}) {
  const colors = ["#38bdf8", "#f97316", "#facc15", "#a78bfa", "#fb7185"];
  const total = items.reduce((sum, item) => sum + item.amount, 0);
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  let progress = 0;

  return (
    <div className="mt-5 grid gap-6 sm:grid-cols-[190px_1fr] sm:items-center">
      <div className="relative mx-auto h-48 w-48">
        <svg
          viewBox="0 0 140 140"
          className="h-full w-full -rotate-90"
          role="img"
          aria-label="Struktura największych wydatków"
        >
          <circle
            cx="70"
            cy="70"
            r={radius}
            fill="none"
            stroke="rgb(51 65 85 / 0.35)"
            strokeWidth="18"
          />
          {items.map((item, index) => {
            const length = circumference * (item.percentage / 100);
            const circle = (
              <circle
                key={`${item.categoryName}-${index}`}
                cx="70"
                cy="70"
                r={radius}
                fill="none"
                stroke={colors[index % colors.length]}
                strokeWidth="18"
                strokeDasharray={`${length} ${circumference - length}`}
                strokeDashoffset={-progress}
                strokeLinecap="round"
              />
            );
            progress += length;
            return circle;
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xs text-muted">Wydatki</span>
          <strong className="text-lg">{formatCurrency(total)}</strong>
        </div>
      </div>
      <div className="min-w-0 space-y-3">
        {items.map((item, index) => (
          <div
            key={`${item.categoryName}-${index}`}
            className="flex items-center justify-between gap-3 text-sm"
          >
            <span className="flex min-w-0 items-center gap-2">
              <span
                className="h-3 w-3 shrink-0 rounded-full"
                style={{ backgroundColor: colors[index % colors.length] }}
              />
              <span className="truncate">{item.categoryName}</span>
            </span>
            <span className="shrink-0 text-right">
              <strong>{formatCurrency(item.amount)}</strong>
              <span className="ml-2 text-muted">
                {item.percentage.toFixed(0)}%
              </span>
            </span>
          </div>
        ))}
        {!items.length && (
          <p className="text-sm text-muted">
            Brak wydatków w wybranym miesiącu.
          </p>
        )}
      </div>
    </div>
  );
}

function ExpensePieChart({
  items,
}: {
  items: DashboardSummary["topSpendingCategories"];
}) {
  const colors = [
    "#38bdf8",
    "#f97316",
    "#eab308",
    "#a78bfa",
    "#fb7185",
    "#34d399",
  ];
  let offset = 0;
  const segments = items.map((item, index) => {
    const start = offset;
    offset += item.percentage;
    return `${colors[index % colors.length]} ${start}% ${offset}%`;
  });
  return (
    <div className="mt-5 flex flex-wrap items-center gap-6">
      <div
        className="h-44 w-44 shrink-0 rounded-full"
        style={{
          background: segments.length
            ? `conic-gradient(${segments.join(", ")})`
            : "#334155",
        }}
        aria-label="Wykres najwiÄ™kszych wydatkĂłw"
      />
      <div className="min-w-0 flex-1 space-y-3">
        {items.map((item, index) => (
          <div
            key={`${item.categoryName}-${index}`}
            className="flex items-center justify-between gap-3 text-sm"
          >
            <span className="flex min-w-0 items-center gap-2">
              <span
                className="h-3 w-3 shrink-0 rounded-full"
                style={{ backgroundColor: colors[index % colors.length] }}
              />
              <span className="truncate">{item.categoryName}</span>
            </span>
            <span className="shrink-0 text-muted">
              {item.percentage.toFixed(0)}%
            </span>
          </div>
        ))}
        {!items.length && (
          <p className="text-sm text-muted">
            Brak wydatków w wybranym miesiącu.
          </p>
        )}
      </div>
    </div>
  );
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pl-PL", {
    style: "currency",
    currency: "PLN",
    maximumFractionDigits: 2,
  }).format(value);
}
