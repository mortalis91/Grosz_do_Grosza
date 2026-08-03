"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getDashboardSummary, type DashboardSummary } from "@/lib/api";
import { getTransactions, type TransactionItem } from "@/lib/transactions-api";
import { readToken } from "@/lib/session";
import { AppShell } from "@/components/app-shell";
import { StatCard } from "@/components/stat-card";
import { TransactionTable } from "@/features/transactions/transaction-table";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";

export function DashboardClient() {
  const router = useRouter();
  const [dashboard, setDashboard] = useState<DashboardSummary | null>(null);
  const [transactions, setTransactions] = useState<TransactionItem[]>([]);
  const [ready, setReady] = useState(false);
  const [period, setPeriod] = useState(() => new Date());
  const [periodPickerOpen, setPeriodPickerOpen] = useState(false);
  const [chartRange, setChartRange] = useState("3 mies.");
  const monthNames = ["Sty", "Lut", "Mar", "Kwi", "Maj", "Cze", "Lip", "Sie", "Wrz", "Paź", "Lis", "Gru"];

  useEffect(() => {
    const token = readToken();
    if (!token) {
      router.replace("/auth");
      return;
    }
    Promise.all([
      getDashboardSummary(token, period.getFullYear(), period.getMonth() + 1),
      getTransactions(1, 5000),
    ]).then(([result, loadedTransactions]) => {
      setDashboard(result);
      setTransactions(loadedTransactions);
      setReady(true);
    });
  }, [router, period]);

  const summary = dashboard
    ? [
        {
          label: "Całkowity bilans",
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
      <section className="min-w-0 space-y-6 rounded-3xl border border-line bg-panel/80 p-6">
        <div>
          <h1 className="text-3xl font-semibold">Dashboard</h1>
          <p className="mt-1 text-sm text-muted">
            Podsumowanie finansów osobistych i najważniejsze operacje.
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-panel/80 p-4">
          <h2 className="font-semibold">Podsumowanie miesiąca</h2>
          <div className="relative inline-flex items-center gap-2 rounded-xl border border-line bg-panel p-1">
            <button
              type="button"
              onClick={() => setPeriod(new Date(period.getFullYear(), period.getMonth() - 1, 1))}
              className="rounded-lg p-2 text-muted transition hover:bg-white/10 hover:text-white"
              aria-label="Poprzedni miesiąc"
              title="Poprzedni miesiąc"
            >
              <ChevronLeft size={17} />
            </button>
            <button type="button" onClick={() => setPeriodPickerOpen((open) => !open)} className="flex min-w-40 items-center justify-center gap-2 rounded-lg px-2 py-2 text-sm font-medium capitalize hover:bg-white/10">
              <CalendarDays size={17} className="text-accent" />
              {period.toLocaleDateString("pl-PL", { month: "long", year: "numeric" })}
            </button>
            <button
              type="button"
              onClick={() => setPeriod(new Date(period.getFullYear(), period.getMonth() + 1, 1))}
              className="rounded-lg p-2 text-muted transition hover:bg-white/10 hover:text-white"
              aria-label="Następny miesiąc"
              title="Następny miesiąc"
            >
              <ChevronRight size={17} />
            </button>
            {periodPickerOpen && <div className="absolute right-0 top-full z-30 mt-2 w-72 rounded-2xl border border-line bg-panel p-4 shadow-2xl">
              <div className="mb-4 flex items-center justify-between"><button type="button" onClick={() => setPeriod(new Date(period.getFullYear() - 1, period.getMonth(), 1))} className="rounded-lg p-2 text-muted hover:bg-white/10 hover:text-white" aria-label="Poprzedni rok"><ChevronLeft size={18} /></button><strong>{period.getFullYear()}</strong><button type="button" onClick={() => setPeriod(new Date(period.getFullYear() + 1, period.getMonth(), 1))} className="rounded-lg p-2 text-muted hover:bg-white/10 hover:text-white" aria-label="Następny rok"><ChevronRight size={18} /></button></div>
              <div className="grid grid-cols-3 gap-2">{monthNames.map((name, index) => <button key={name} type="button" onClick={() => { setPeriod(new Date(period.getFullYear(), index, 1)); setPeriodPickerOpen(false); }} className={`rounded-lg px-3 py-2 text-sm transition ${period.getMonth() === index ? "bg-accent text-black" : "text-muted hover:bg-white/10 hover:text-white"}`}>{name}</button>)}</div>
            </div>}
          </div>
        </div>{" "}
        <section className="grid gap-4 md:grid-cols-3">
          {summary.map((item) => (
            <StatCard key={item.label} {...item} />
          ))}
        </section>
        <section className="grid min-w-0 gap-4">
          <div className="min-w-0">
            <IncomeExpenseChart transactions={transactions} range={chartRange} onRangeChange={setChartRange} />
          </div>
          <div className="grid min-w-0 gap-4 xl:grid-cols-[0.8fr_1.2fr]">
          <div className="min-w-0">
            <div className="h-full rounded-3xl border border-line bg-panel/80 p-6 shadow-glow backdrop-blur">
              <h2 className="text-lg font-semibold">Największe wydatki</h2>
              <ExpenseDonutChart
                items={dashboard?.topSpendingCategories ?? []}
              />
            </div>
          </div>
          <div className="min-w-0 rounded-3xl border border-line bg-panel/80 p-6 shadow-glow backdrop-blur">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Ostatnie operacje</h2>
            </div>
            <TransactionTable />
          </div>
          </div>
        </section>
      </section>
    </AppShell>
  );
}

function IncomeExpenseChart({ transactions, range, onRangeChange }: { transactions: TransactionItem[]; range: string; onRangeChange: (range: string) => void }) {
  const [hoveredPoint, setHoveredPoint] = useState<number | null>(null);
  const ranges = ["1d", "3d", "1 tyg.", "2 tyg.", "1 mies.", "2 mies.", "3 mies.", "6 mies.", "1 rok", "Wszystko"];
  const rangeConfig: Record<string, { days: number | null; months?: number; unit: "day" | "month" }> = {
    "1d": { days: 1, unit: "day" }, "3d": { days: 3, unit: "day" }, "1 tyg.": { days: 7, unit: "day" }, "2 tyg.": { days: 14, unit: "day" },
    "1 mies.": { days: null, months: 1, unit: "month" }, "2 mies.": { days: null, months: 2, unit: "month" }, "3 mies.": { days: null, months: 3, unit: "month" }, "6 mies.": { days: null, months: 6, unit: "month" }, "1 rok": { days: null, months: 12, unit: "month" }, "Wszystko": { days: null, unit: "month" },
  };
  const config = rangeConfig[range] ?? rangeConfig["3 mies."];
  const end = new Date();
  const start = config.months
    ? new Date(end.getFullYear(), end.getMonth() - config.months + 1, 1)
    : config.days
      ? new Date(end.getTime() - (config.days - 1) * 86400000)
      : new Date(Math.min(...transactions.map((item) => new Date(item.occurredAt).getTime()), end.getTime()));
  const buckets = new Map<string, { label: string; income: number; expenses: number; time: number }>();
  if (config.unit === "day" && config.days) {
    for (let index = 0; index < config.days; index += 1) {
      const date = new Date(start);
      date.setDate(start.getDate() + index);
      buckets.set(date.toISOString().slice(0, 10), { label: date.toLocaleDateString("pl-PL", { day: "numeric", month: "short" }), income: 0, expenses: 0, time: date.getTime() });
    }
  }
  transactions.forEach((item) => {
    // Transakcje oznaczone jako nieistotne nie wpływają na wykres finansowy.
    if (item.status === "Ignored") return;
    const date = new Date(item.occurredAt);
    if (date < start || date > end) return;
    const bucketDate = new Date(date);
    if (config.unit === "month") bucketDate.setDate(1);
    const key = config.unit === "month" ? `${bucketDate.getFullYear()}-${bucketDate.getMonth()}` : bucketDate.toISOString().slice(0, 10);
    const label = config.unit === "month" ? bucketDate.toLocaleDateString("pl-PL", { month: "long", year: "numeric" }) : bucketDate.toLocaleDateString("pl-PL", { day: "numeric", month: "short" });
    const bucket = buckets.get(key) ?? { label, income: 0, expenses: 0, time: bucketDate.getTime() };
    if (item.amount >= 0) bucket.income += item.amount; else bucket.expenses += Math.abs(item.amount);
    buckets.set(key, bucket);
  });
  const points = Array.from(buckets.values()).sort((a, b) => a.time - b.time);
  const dataMax = Math.max(...points.flatMap((point) => [point.income, point.expenses]), 0);
  // Oś opiera się na maksimum z agregatów wybranego zakresu. Zaokrąglamy
  // granicę tylko do pełnych tysięcy, aby pojedynczy zapas i "ładny" krok
  // nie podbijały skali np. z 16 tys. do 40 tys. zł.
  const chartMax = Math.max(1000, Math.ceil(dataMax / 1000) * 1000);
  const yTicks = Array.from(
    { length: chartMax / 1000 + 1 },
    (_, index) => chartMax - index * 1000,
  );
  const chartMinWidth = Math.max(720, points.length * 64);
  // Zakresy dzienne do dwóch tygodni mieszczą się bez przewijania.
  const needsHorizontalScroll = points.length > 14;
  return (
    <section className="min-w-0 overflow-hidden rounded-3xl border border-line bg-panel/80 p-6 shadow-glow backdrop-blur">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Przychody vs Wydatki</h2>
        <div className="flex gap-4 text-sm text-muted"><span className="inline-flex items-center gap-2"><span className="h-3 w-3 rounded-full bg-emerald-400" />Przychody</span><span className="inline-flex items-center gap-2"><span className="h-3 w-3 rounded-full bg-rose-400" />Wydatki</span></div>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">{ranges.map((item) => <button key={item} type="button" onClick={() => onRangeChange(item)} className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${range === item ? "border-accent bg-accent text-black" : "border-line bg-white/5 text-muted hover:border-accent/50 hover:text-white"}`}>{item}</button>)}</div>
      <div className="mt-6 flex min-w-0">
        <div className="flex h-[300px] w-20 shrink-0 flex-col justify-between border-r border-line pr-2 text-right text-[11px] text-muted">
          {yTicks.map((tick) => <span key={tick}>{tick % 5000 === 0 || tick === chartMax || tick === 0 ? formatAxisValue(tick) : ""}</span>)}
        </div>
        <div className={`min-w-0 flex-1 ${needsHorizontalScroll ? 'overflow-x-auto' : 'overflow-x-hidden'}`}>
          <div className="relative flex h-[300px] items-end gap-2 border-b border-line px-4" style={{ minWidth: `${chartMinWidth}px` }}>
            <div className="pointer-events-none absolute left-0 top-0 h-[260px]" style={{ width: `${Math.max(chartMinWidth, 1600)}px` }}>
              {yTicks.map((_, index) => <div key={index} className="absolute inset-x-0 border-t border-line/70" style={{ top: `${index / Math.max(yTicks.length - 1, 1) * 100}%` }} />)}
            </div>
            {points.map((point, index) => <div key={`${point.time}-${point.label}`} className="relative flex min-w-16 flex-1 flex-col items-center justify-end gap-1" onMouseEnter={() => setHoveredPoint(index)} onMouseLeave={() => setHoveredPoint(null)}><div className="flex h-[260px] items-end gap-1"><div className="w-3 rounded-t bg-emerald-400" style={{ height: `${Math.max(point.income ? 3 : 0, point.income / chartMax * 260)}px` }} /><div className="w-3 rounded-t bg-rose-400" style={{ height: `${Math.max(point.expenses ? 3 : 0, point.expenses / chartMax * 260)}px` }} /></div><span className="max-w-20 truncate text-[10px] text-muted">{point.label}</span>{hoveredPoint === index && <div className="pointer-events-none absolute bottom-8 z-20 min-w-36 -translate-x-1/2 rounded-lg border border-line bg-slate-900 px-3 py-2 text-left text-xs shadow-xl"><div className="mb-1 font-medium text-white">{point.label}</div><div className="text-emerald-300">Przychody: {formatCurrency(point.income)}</div><div className="text-rose-300">Wydatki: {formatCurrency(point.expenses)}</div></div>}</div>)}
          </div>
        </div>
      </div>
    </section>
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
    <div className="mt-5 flex flex-col gap-6">
      <div className="relative mx-auto h-48 w-48 shrink-0">
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
              <span className="break-words">{item.categoryName}</span>
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

function formatAxisValue(value: number) {
  if (Math.abs(value) >= 1000) {
    return `${new Intl.NumberFormat("pl-PL", { maximumFractionDigits: 1 }).format(value / 1000)} tys. zł`;
  }
  return `${new Intl.NumberFormat("pl-PL", { maximumFractionDigits: 0 }).format(value)} zł`;
}
