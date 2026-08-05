"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { getDashboardSummary, type DashboardSummary } from "@/lib/api";
import { readToken } from "@/lib/session";
import { getAccounts, type AccountItem } from "@/lib/accounts-api";
import { getTransactions, type TransactionItem } from "@/lib/transactions-api";
import { getCategories, type CategoryItem } from "@/lib/categories-api";

const months = [
  "Styczeń",
  "Luty",
  "Marzec",
  "Kwiecień",
  "Maj",
  "Czerwiec",
  "Lipiec",
  "Sierpień",
  "Wrzesień",
  "Październik",
  "Listopad",
  "Grudzień",
];

const basicLivingCategories = [
  { label: "Żywność", exact: "Spożywcze" },
  { label: "Chemia", exact: "Chemia" },
  { label: "Zdrowie", parent: "Zdrowie" },
  { label: "Telefon", exact: "Komórka" },
  { label: "Internet", exact: "Internet" },
  { label: "Zwierzęta", parent: "Zwierzęta" },
  { label: "Edukacja", parent: "Edukacja" },
  { label: "Rozrywka", parent: "Rozrywka" },
  { label: "Ubrania", exact: "Odzież i obuwie" },
  { label: "Czynsz obecny", exact: "Czynsz i wynajem" },
];

const housingCostFields = [
  ["Rata kredytu", "mortgage"],
  ["Czynsz / utrzymanie domu", "maintenance"],
  ["Media", "utilities"],
  ["Ubezpieczenie nieruchomości", "insurance"],
  ["Podatek od nieruchomości", "propertyTax"],
  ["Dojazdy", "commute"],
  ["Serwis i naprawy", "repairs"],
  ["Inne zobowiązania", "other"],
] as const;

function currency(value: number) {
  return new Intl.NumberFormat("pl-PL", {
    style: "currency",
    currency: "PLN",
  }).format(value);
}

export default function ReportsPage() {
  const pathname = usePathname();
  const isPlanning = pathname === "/planning";
  const [year, setYear] = useState(new Date().getFullYear());
  const [data, setData] = useState<Array<DashboardSummary | null>>([]);
  const [loading, setLoading] = useState(true);
  const [accounts, setAccounts] = useState<AccountItem[]>([]);
  const [transactions, setTransactions] = useState<TransactionItem[]>([]);
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [rates, setRates] = useState<Record<string, number>>({ PLN: 1 });
  const [ratesDate, setRatesDate] = useState<string | null>(null);
  const [housingCosts, setHousingCosts] = useState<Record<string, number>>({});
  const [bufferPercent, setBufferPercent] = useState(10);

  useEffect(() => {
    let active = true;
    setLoading(true);
    const token = readToken();
    Promise.all([
      Promise.all(
        months.map((_, index) => getDashboardSummary(token, year, index + 1)),
      ),
      getAccounts(),
      getTransactions(1, 5000),
      getCategories(),
    ]).then(
      ([result, loadedAccounts, loadedTransactions, loadedCategories]) => {
        if (active) {
          setData(result);
          setAccounts(loadedAccounts);
          setTransactions(
            loadedTransactions.filter(
              (item) => new Date(item.occurredAt).getFullYear() === year,
            ),
          );
          setCategories(loadedCategories);
          setLoading(false);
        }
      },
    );
    return () => {
      active = false;
    };
  }, [year]);

  useEffect(() => {
    let active = true;
    fetch("https://api.nbp.pl/api/exchangerates/tables/A?format=json")
      .then((response) =>
        response.ok
          ? response.json()
          : Promise.reject(new Error("Nie udało się pobrać kursów walut.")),
      )
      .then(
        (
          tables: Array<{
            effectiveDate: string;
            rates: Array<{ code: string; mid: number }>;
          }>,
        ) => {
          if (!active || !tables[0]) return;
          setRates({
            PLN: 1,
            ...Object.fromEntries(
              tables[0].rates.map((rate) => [rate.code, rate.mid]),
            ),
          });
          setRatesDate(tables[0].effectiveDate);
        },
      )
      .catch(() => {
        if (active) setRates({ PLN: 1 });
      });
    return () => {
      active = false;
    };
  }, []);

  const rows = data.map((item, index) => ({
    month: months[index],
    income: item?.income ?? 0,
    expenses: Math.abs(item?.expenses ?? 0),
    net: (item?.income ?? 0) + (item?.expenses ?? 0),
  }));
  const currentYear = new Date().getFullYear();
  const monthsInAverage = year === currentYear ? new Date().getMonth() + 1 : 12;
  const income = rows.reduce((sum, row) => sum + row.income, 0);
  const expenses = rows.reduce((sum, row) => sum + row.expenses, 0);
  const averageIncome = income / monthsInAverage;
  const max = Math.max(...rows.flatMap((row) => [row.income, row.expenses]), 1);
  const amountsById = new Map(transactions.map((item) => [item.id, item.amount]));
  const categoryById = new Map(categories.map((category) => [category.id, category]));
  const spendingByCategory = Object.entries(
    transactions
      .filter((item) => item.amount < 0 && item.status !== "Ignored")
      .reduce<Record<string, number>>((result, item) => {
        const name =
          categories.find((category) => category.id === item.categoryId)
            ?.name ?? "Bez kategorii";
        const refund = item.refundTransactionId ? amountsById.get(item.refundTransactionId) ?? 0 : 0;
        result[name] = (result[name] ?? 0) + Math.abs(item.amount + refund);
        return result;
      }, {}),
  )
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);
  const basicLivingByCategory = basicLivingCategories.map(({ label, exact, parent }) => {
    const value = transactions
      .filter((item) => item.amount < 0 && item.status !== "Ignored")
      .filter((item) => {
        let category = categoryById.get(item.categoryId ?? "");
        while (category) {
          const categoryName = category.name.toLocaleLowerCase();
          if ((exact && categoryName === exact.toLocaleLowerCase()) || (parent && categoryName === parent.toLocaleLowerCase())) return true;
          category = category.parentId ? categoryById.get(category.parentId) : undefined;
        }
        return false;
      })
      .reduce((sum, item) => {
        const refund = item.refundTransactionId ? amountsById.get(item.refundTransactionId) ?? 0 : 0;
        return sum + Math.abs(item.amount + refund);
      }, 0);
    return [label, value / monthsInAverage] as [string, number];
  });
  const averageBasicLiving = basicLivingByCategory.reduce((sum, [, value]) => sum + value, 0);
  const monthlyHousing = Object.values(housingCosts).reduce((sum, value) => sum + (Number(value) || 0), 0);
  const housingBuffer = monthlyHousing * (Number(bufferPercent) || 0) / 100;
  const remainingAfterHousing = averageIncome - averageBasicLiving - monthlyHousing - housingBuffer;
  const incomeParentIds = new Set(
    categories
      .filter((category) => category.name === "Przychód" && !category.parentId)
      .map((category) => category.id),
  );
  const incomeBySource = Object.entries(
    transactions
      .filter((item) => {
        if (item.amount <= 0 || item.status === "Ignored") return false;
        const category = categoryById.get(item.categoryId ?? "");
        return Boolean(
          category &&
          (incomeParentIds.has(category.parentId ?? "") ||
            incomeParentIds.has(category.id)),
        );
      })
      .reduce<Record<string, number>>((result, item) => {
        const name =
          categoryById.get(item.categoryId ?? "")?.name ?? "Bez kategorii";
        result[name] = (result[name] ?? 0) + item.amount;
        return result;
      }, {}),
  )
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
  const assetValues = accounts.map((account) => ({
    ...account,
    valuePln:
      account.currentBalance * (rates[account.currency.toUpperCase()] ?? 1),
  }));
  const assetsTotal = assetValues.reduce(
    (sum, account) => sum + account.valuePln,
    0,
  );

  return (
    <AppShell>
      <section className="space-y-6 rounded-3xl border border-line bg-panel/80 p-6">
        {!isPlanning && (
          <>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-semibold">Raporty</h1>
            <p className="mt-1 text-sm text-muted">
              Analizuj przychody i wydatki w ujęciu rocznym.
            </p>
          </div>
          <select
            value={year}
            onChange={(event) => setYear(Number(event.target.value))}
            className="rounded-xl border border-line bg-panel px-3 py-2"
          >
            {Array.from({ length: 5 }, (_, index) => year - 2 + index).map(
              (value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ),
            )}
          </select>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-emerald-400/30 bg-emerald-400/10 p-4">
            <span className="text-sm text-muted">Przychody w roku</span>
            <strong className="mt-2 block text-2xl text-emerald-300">
              {currency(income)}
            </strong>
          </div>
          <div className="rounded-2xl border border-rose-400/30 bg-rose-400/10 p-4">
            <span className="text-sm text-muted">Wydatki w roku</span>
            <strong className="mt-2 block text-2xl text-rose-300">
              {currency(expenses)}
            </strong>
          </div>
          <div className="rounded-2xl border border-line bg-white/5 p-4">
            <span className="text-sm text-muted">Bilans netto</span>
            <strong
              className={`mt-2 block text-2xl ${income - expenses >= 0 ? "text-emerald-300" : "text-rose-300"}`}
            >
              {currency(income - expenses)}
            </strong>
          </div>
        </div>
          </>
        )}
        {isPlanning && (
        <div className="rounded-2xl border border-accent/30 bg-accent/[0.04] p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold">Budżet mieszkaniowy</h2>
              <p className="mt-1 text-sm text-muted">Średnie miesięczne koszty na podstawie ostatnich 12 miesięcy oraz planowanych kosztów po zakupie nieruchomości.</p>
            </div>
            <label className="flex items-center gap-2 text-sm text-muted">
              Rok
              <select
                value={year}
                onChange={(event) => setYear(Number(event.target.value))}
                className="rounded-xl border border-line bg-panel px-3 py-2 text-white"
              >
                {Array.from({ length: 5 }, (_, index) => year - 2 + index).map((value) => (
                  <option key={value} value={value}>{value}</option>
                ))}
              </select>
            </label>
          </div>
          <div className="mt-5 grid gap-4 xl:grid-cols-3">
            <div className="rounded-2xl border border-line bg-white/5 p-4">
              <h3 className="font-semibold">1. Dochód</h3>
              <div className="mt-4 flex items-end justify-between gap-3">
                <span className="text-sm text-muted">Średni dochód netto / miesiąc</span>
                <strong className="text-xl text-emerald-300">{currency(averageIncome)}</strong>
              </div>
              <p className="mt-2 text-xs text-muted">Suma dochodów podzielona przez {monthsInAverage} {monthsInAverage === 1 ? "miesiąc" : "miesięcy"} uwzględnionych w bieżącym okresie.</p>
            </div>
            <div className="rounded-2xl border border-line bg-white/5 p-4 xl:col-span-2">
              <div className="flex items-center justify-between gap-3">
                <h3 className="font-semibold">2. Podstawowe koszty życia</h3>
                <strong className="text-xl text-rose-300">{currency(averageBasicLiving)}</strong>
              </div>
              <p className="mt-1 text-xs text-muted">Średnia miesięczna z {monthsInAverage} {monthsInAverage === 1 ? "miesiąca" : "miesięcy"}, według kategorii.</p>
              <div className="mt-4 grid gap-x-6 gap-y-2 sm:grid-cols-2">
                {basicLivingByCategory.map(([name, value]) => (
                  <div key={name} className="flex items-center justify-between gap-3 border-b border-line/60 py-1.5 text-sm">
                    <span className="text-muted">{name}</span>
                    <span>{currency(value)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="mt-4 rounded-2xl border border-line bg-white/5 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="font-semibold">3. Planowane koszty mieszkaniowe</h3>
                <p className="mt-1 text-xs text-muted">Wpisz przewidywane miesięczne koszty po zakupie.</p>
              </div>
              <label className="flex items-center gap-2 text-sm text-muted">
                Bufor bezpieczeństwa
                <input type="number" min="0" max="100" value={bufferPercent} onChange={(event) => setBufferPercent(Number(event.target.value))} className="w-20 rounded-xl border border-line bg-panel px-3 py-2 text-white" />%
              </label>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {housingCostFields.map(([label, key]) => (
                <label key={key} className="text-sm text-muted">
                  {label}
                  <div className="mt-1 flex items-center rounded-xl border border-line bg-panel px-3">
                    <input type="number" min="0" step="0.01" value={housingCosts[key] ?? ""} onChange={(event) => setHousingCosts((current) => ({ ...current, [key]: Number(event.target.value) }))} placeholder="0" className="w-full bg-transparent py-2 text-white outline-none" />
                    <span className="text-xs">zł</span>
                  </div>
                </label>
              ))}
            </div>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-line bg-white/5 p-4"><span className="text-sm text-muted">Koszty mieszkaniowe</span><strong className="mt-2 block text-xl text-rose-300">{currency(monthlyHousing)}</strong></div>
            <div className="rounded-2xl border border-line bg-white/5 p-4"><span className="text-sm text-muted">Bufor ({bufferPercent}%)</span><strong className="mt-2 block text-xl text-amber-300">{currency(housingBuffer)}</strong></div>
            <div className={`rounded-2xl border p-4 ${remainingAfterHousing >= 0 ? "border-emerald-400/30 bg-emerald-400/10" : "border-rose-400/30 bg-rose-400/10"}`}><span className="text-sm text-muted">Pozostaje po zakupie</span><strong className={`mt-2 block text-xl ${remainingAfterHousing >= 0 ? "text-emerald-300" : "text-rose-300"}`}>{currency(remainingAfterHousing)}</strong></div>
          </div>
        </div>
        )}
        {!isPlanning && (
          <>
        <div className="rounded-2xl border border-line bg-white/5 p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Zestawienie roczne</h2>
            <div className="flex gap-2 text-xs text-muted">
              <span>
                <i className="mr-1 inline-block h-2 w-2 rounded-full bg-emerald-400" />
                Przychody
              </span>
              <span>
                <i className="mr-1 inline-block h-2 w-2 rounded-full bg-rose-400" />
                Wydatki
              </span>
            </div>
          </div>
          {loading ? (
            <p className="mt-5 text-sm text-muted">Ładowanie raportu...</p>
          ) : (
            <div className="mt-6 flex h-80 gap-3">
              <div className="flex flex-col justify-between pb-8 text-xs text-muted">
                <span>{currency(max)}</span>
                <span>{currency(max * 0.75)}</span>
                <span>{currency(max * 0.5)}</span>
                <span>{currency(max * 0.25)}</span>
                <span>0 PLN</span>
              </div>
              <div className="relative flex flex-1 items-end justify-between gap-2 border-b border-line bg-[linear-gradient(to_bottom,transparent_24.8%,rgba(148,163,184,.12)_25%,transparent_25.3%,transparent_49.8%,rgba(148,163,184,.12)_50%,transparent_50.3%,transparent_74.8%,rgba(148,163,184,.12)_75%,transparent_75.3%)] px-2">
                {rows.map((row) => (
                  <div
                    key={row.month}
                    className="flex h-full min-w-0 flex-1 items-end justify-center gap-1"
                  >
                    <div
                      title={`${row.month}: ${currency(row.income)}`}
                      className="w-1/2 max-w-7 rounded-t bg-emerald-400 transition hover:bg-emerald-300"
                      style={{
                        height: `${Math.max((row.income / max) * 100, row.income ? 1 : 0)}%`,
                      }}
                    />
                    <div
                      title={`${row.month}: ${currency(row.expenses)}`}
                      className="w-1/2 max-w-7 rounded-t bg-rose-400 transition hover:bg-rose-300"
                      style={{
                        height: `${Math.max((row.expenses / max) * 100, row.expenses ? 1 : 0)}%`,
                      }}
                    />
                    <span className="absolute bottom-[-1.7rem] truncate text-[10px] text-muted">
                      {row.month.slice(0, 3)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        <div className="overflow-x-auto rounded-2xl border border-line">
          <table className="w-full min-w-[680px] text-left text-sm">
            <thead className="bg-white/5 text-muted">
              <tr>
                <th className="px-4 py-3">Miesiąc</th>
                <th className="px-4 py-3">Przychody</th>
                <th className="px-4 py-3">Wydatki</th>
                <th className="px-4 py-3">Bilans netto</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.month} className="border-t border-line/70">
                  <td className="px-4 py-3">{row.month}</td>
                  <td className="px-4 py-3 text-emerald-300">
                    {currency(row.income)}
                  </td>
                  <td className="px-4 py-3 text-rose-300">
                    {currency(row.expenses)}
                  </td>
                  <td
                    className={`px-4 py-3 ${row.net >= 0 ? "text-emerald-300" : "text-rose-300"}`}
                  >
                    {currency(row.net)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="grid gap-6 xl:grid-cols-2">
          <ReportList
            title="Wydatki według kategorii"
            items={spendingByCategory}
            tone="negative"
            empty="Brak wydatków w wybranym roku."
          />
          <ReportList
            title="5 największych przychodów według kategorii"
            items={incomeBySource}
            tone="positive"
            empty="Brak przychodów w podkategoriach Przychód."
          />
        </div>
        <div className="grid gap-6 xl:grid-cols-2">
          <AssetDonut
            accounts={assetValues}
            total={assetsTotal}
            ratesDate={ratesDate}
          />
          <CashFlowReport rows={rows} />
        </div>
          </>
        )}
      </section>
    </AppShell>
  );
}

function ReportList({
  title,
  items,
  tone,
  empty,
}: {
  title: string;
  items: Array<[string, number]>;
  tone: "positive" | "negative";
  empty: string;
}) {
  const max = Math.max(...items.map((item) => item[1]), 1);
  return (
    <div className="rounded-2xl border border-line bg-white/5 p-5">
      <h2 className="text-lg font-semibold">{title}</h2>
      <div className="mt-4 space-y-3">
        {items.map(([name, value]) => (
          <div key={name}>
            <div className="mb-1 flex justify-between gap-3 text-sm">
              <span className="truncate">{name}</span>
              <span
                className={
                  tone === "positive" ? "text-emerald-300" : "text-rose-300"
                }
              >
                {currency(value)}
              </span>
            </div>
            <div className="h-2 rounded-full bg-white/10">
              <div
                className={`h-2 rounded-full ${tone === "positive" ? "bg-emerald-400" : "bg-rose-400"}`}
                style={{ width: `${(value / max) * 100}%` }}
              />
            </div>
          </div>
        ))}
        {!items.length && <p className="text-sm text-muted">{empty}</p>}
      </div>
    </div>
  );
}

function AssetDonut({
  accounts,
  total,
  ratesDate,
}: {
  accounts: Array<{
    id: string;
    name: string;
    currency: string;
    valuePln: number;
  }>;
  total: number;
  ratesDate: string | null;
}) {
  const colors = [
    "#38bdf8",
    "#34d399",
    "#facc15",
    "#a78bfa",
    "#fb7185",
    "#f97316",
  ];
  let offset = 0;
  return (
    <div className="rounded-2xl border border-line bg-white/5 p-5">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Raport kont i aktywów</h2>
        <strong className="text-accent">{currency(total)}</strong>
      </div>
      <div className="mt-5 grid gap-6 sm:grid-cols-[220px_1fr] sm:items-center">
        <div className="relative mx-auto h-52 w-52">
          <svg viewBox="0 0 140 140" className="h-full w-full -rotate-90">
            <circle
              cx="70"
              cy="70"
              r="52"
              fill="none"
              stroke="rgb(51 65 85 / .35)"
              strokeWidth="20"
            />
            {accounts.map((account, index) => {
              const length = total
                ? (2 * Math.PI * 52 * account.valuePln) / total
                : 0;
              const circle = (
                <circle
                  key={account.id}
                  cx="70"
                  cy="70"
                  r="52"
                  fill="none"
                  stroke={colors[index % colors.length]}
                  strokeWidth="20"
                  strokeDasharray={`${length} ${2 * Math.PI * 52 - length}`}
                  strokeDashoffset={-offset}
                />
              );
              offset += length;
              return circle;
            })}
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-xs text-muted">Aktywa</span>
            <strong>{currency(total)}</strong>
          </div>
        </div>
        <div className="space-y-3">
          {accounts.map((account, index) => (
            <div
              key={account.id}
              className="flex items-center justify-between gap-3 text-sm"
            >
              <span className="flex min-w-0 items-center gap-2">
                <i
                  className="h-3 w-3 shrink-0 rounded-full"
                  style={{ backgroundColor: colors[index % colors.length] }}
                />{" "}
                <span className="truncate">{account.name}</span>
                <span className="text-muted">{account.currency}</span>
              </span>
              <strong>{currency(account.valuePln)}</strong>
            </div>
          ))}
          {!accounts.length && (
            <p className="text-sm text-muted">Brak aktywnych kont.</p>
          )}
        </div>
      </div>
    </div>
  );
}

function CashFlowReport({
  rows,
}: {
  rows: Array<{ month: string; income: number; expenses: number; net: number }>;
}) {
  const max = Math.max(...rows.flatMap((row) => [row.income, row.expenses]), 1);
  return (
    <div className="rounded-2xl border border-line bg-white/5 p-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Przepływy pieniężne</h2>
          <p className="mt-1 text-xs text-muted">
            Miesięczne wpływy, wydatki i bilans netto
          </p>
        </div>
        <span className="text-xs text-muted">PLN</span>
      </div>
      <div className="mt-5 space-y-3">
        {rows.map((row) => (
          <div key={row.month}>
            <div className="mb-1 flex items-center justify-between gap-3 text-xs">
              <span className="w-20 text-muted">{row.month}</span>
              <span
                className={row.net >= 0 ? "text-emerald-300" : "text-rose-300"}
              >
                {row.net >= 0 ? "+" : ""}
                {currency(row.net)}
              </span>
            </div>
            <div className="flex h-2 gap-1">
              <div
                className="rounded-full bg-emerald-400"
                style={{ width: `${(row.income / max) * 100}%` }}
              />
              <div
                className="rounded-full bg-rose-400"
                style={{ width: `${(row.expenses / max) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>
      <div className="mt-4 flex gap-4 text-xs text-muted">
        <span>
          <i className="mr-1 inline-block h-2 w-2 rounded-full bg-emerald-400" />
          Wpływy
        </span>
        <span>
          <i className="mr-1 inline-block h-2 w-2 rounded-full bg-rose-400" />
          Wydatki
        </span>
      </div>
    </div>
  );
}
