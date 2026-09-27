"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  LayoutDashboard,
  Tags,
  WalletCards,
  ArrowLeftRight,
  PiggyBank,
} from "lucide-react";

const items = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Konta", href: "/accounts", icon: WalletCards },
  { label: "Transakcje", href: "/transactions", icon: ArrowLeftRight },
  { label: "Kategorie", href: "/categories", icon: Tags },
  { label: "Budżety", href: "/budgets", icon: PiggyBank },
  { label: "Raporty", href: "/reports", icon: BarChart3 },
];

export function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="rounded-3xl border border-line bg-panel/80 p-5 shadow-glow backdrop-blur lg:sticky lg:top-6 lg:h-[calc(100vh-3rem)]">
      <div className="flex h-full flex-col">
        <nav className="mt-2 space-y-2">
          {items.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className={`flex items-center justify-between rounded-2xl border px-4 py-3 text-sm transition ${
                pathname === item.href ||
                (item.href === "/dashboard" && pathname === "/")
                  ? "border-accent/40 bg-accent/10 text-white"
                  : "border-line bg-white/5 text-muted hover:border-accent/30 hover:bg-white/10 hover:text-white"
              }`}
            >
              <span className="flex items-center gap-3">
                <item.icon size={18} strokeWidth={1.8} />
                {item.label}
              </span>
            </Link>
          ))}
        </nav>

        <div className="mt-auto rounded-2xl border border-line bg-white/5 p-4 text-sm text-muted">
          Backend: <span className="text-white">ASP.NET Core 10</span>
          <br />
          Frontend: <span className="text-white">Next.js 15</span>
        </div>
      </div>
    </aside>
  );
}
