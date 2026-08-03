"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/sidebar";
import { clearToken, readToken } from "@/lib/session";
import { CircleUserRound, Settings } from "lucide-react";

export function AppShell({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const router = useRouter();
  const [userOpen, setUserOpen] = useState(false);
  function logout() {
    clearToken();
    router.push("/auth");
  }
  function userEmail() {
    try {
      const token = readToken();
      if (!token) return "Użytkownik";
      const payload = JSON.parse(
        atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")),
      );
      return (
        payload.email ?? payload.unique_name ?? payload.name ?? "Użytkownik"
      );
    } catch {
      return "Użytkownik";
    }
  }

  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-[1900px] px-3 pt-3 lg:px-3 lg:pt-4">
        <div className="mb-3 flex min-h-16 items-center justify-between gap-3 rounded-2xl border border-line bg-panel/80 px-4 py-3">
          <Link
            href="/dashboard"
            aria-label="Grosz do Grosza"
            title="Grosz do Grosza"
            className="flex min-w-0 items-center"
          >
            <img
              src="/logo_label.png"
              alt="Grosz do Grosza"
              className="h-12 w-auto max-w-[280px] object-contain"
            />
          </Link>
          <div className="flex items-center gap-3">
            <Link
              href="/settings"
              aria-label="Ustawienia"
              title="Ustawienia"
              className="rounded-xl border border-line p-3 text-muted transition hover:border-accent/60 hover:text-white"
            >
              <Settings className="h-5 w-5" />
            </Link>
            <div className="relative">
              <button
                type="button"
                onClick={() => setUserOpen((open) => !open)}
                aria-label="Menu użytkownika"
                title="Menu użytkownika"
                className="flex h-10 w-10 items-center justify-center rounded-full border border-accent/30 bg-accent/10 text-accent transition hover:bg-accent/20"
              >
                <CircleUserRound className="h-6 w-6" />
              </button>
              {userOpen && (
                <div className="absolute right-0 top-12 z-30 w-72 overflow-hidden rounded-2xl border border-line bg-panel shadow-2xl">
                  <div className="border-b border-line px-4 py-4">
                    <p className="text-xs text-muted">Konto</p>
                    <p className="mt-1 truncate font-medium">{userEmail()}</p>
                  </div>
                  <Link
                    href="/settings"
                    onClick={() => setUserOpen(false)}
                    className="block px-4 py-3 text-sm transition hover:bg-white/10"
                  >
                    Ustawienia
                  </Link>
                  <button
                    type="button"
                    onClick={logout}
                    className="block w-full border-t border-line px-4 py-3 text-left text-sm text-rose-300 transition hover:bg-white/10"
                  >
                    Wyloguj się
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      <div className="mx-auto grid max-w-[1900px] gap-3 px-3 pb-3 lg:grid-cols-[220px_1fr] lg:px-3 lg:pb-4">
        <Sidebar />
        <main className="min-w-0 space-y-6">{children}</main>
      </div>
    </div>
  );
}
