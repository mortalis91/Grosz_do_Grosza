"use client";

import type React from "react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { saveToken } from "@/lib/session";
import { Eye, EyeOff, LogIn, UserPlus } from "lucide-react";

type Mode = "login" | "register";
const baseUrl =
  process.env.NEXT_PUBLIC_BACKEND_API_URL ?? "http://localhost:5211";

export function AuthCard() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("login");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    const data = new FormData(event.currentTarget);
    const password = String(data.get("password") ?? "");
    if (
      mode === "register" &&
      password !== String(data.get("confirmPassword") ?? "")
    ) {
      setMessage("Hasła muszą być takie same.");
      setBusy(false);
      return;
    }
    const payload =
      mode === "login"
        ? { email: String(data.get("email") ?? ""), password }
        : {
            email: String(data.get("email") ?? ""),
            password,
            displayName: String(data.get("displayName") ?? ""),
            defaultCurrency: String(data.get("defaultCurrency") ?? "PLN"),
          };
    try {
      const response = await fetch(`${baseUrl}/api/v1/auth/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        setMessage(
          mode === "login"
            ? "Nieprawidłowy e-mail lub hasło."
            : "Nie udało się utworzyć konta. Sprawdź dane.",
        );
        return;
      }
      const result = (await response.json()) as { accessToken: string };
      saveToken(result.accessToken);
      router.push("/dashboard");
    } catch {
      setMessage("Nie można połączyć się z serwerem API.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-3xl border border-line bg-panel/90 p-6 shadow-glow backdrop-blur">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold">
            {mode === "login" ? "Zaloguj się" : "Utwórz konto"}
          </h2>
          <p className="mt-1 text-sm text-muted">
            {mode === "login"
              ? "Wprowadź dane, aby przejść do aplikacji."
              : "Utwórz konto, aby rozpocząć pracę z finansami."}
          </p>
        </div>
      </div>
      <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
        {mode === "register" && (
          <label className="flex flex-col gap-1 text-sm text-muted">
            Nazwa wyświetlana
            <input
              name="displayName"
              autoComplete="name"
              className="w-full rounded-2xl border border-line bg-white/5 px-4 py-3 outline-none placeholder:text-muted"
              required
            />
          </label>
        )}
        <label className="flex flex-col gap-1 text-sm text-muted">
          E-mail
          <input
            name="email"
            type="email"
            autoComplete="email"
            className="w-full rounded-2xl border border-line bg-white/5 px-4 py-3 outline-none"
            required
          />
        </label>
        <label className="flex flex-col gap-1 text-sm text-muted">
          Hasło
          <input
            name="password"
            type="password"
            minLength={8}
            autoComplete={
              mode === "login" ? "current-password" : "new-password"
            }
            className="w-full rounded-2xl border border-line bg-white/5 px-4 py-3 outline-none"
            required
          />
          <span className="text-xs text-muted">Minimum 8 znaków.</span>
        </label>
        {mode === "register" && (
          <label className="flex flex-col gap-1 text-sm text-muted">
            Powtórz hasło
            <input
              name="confirmPassword"
              type="password"
              minLength={8}
              autoComplete="new-password"
              className="w-full rounded-2xl border border-line bg-white/5 px-4 py-3 outline-none"
              required
            />
          </label>
        )}
        {mode === "register" && (
          <label className="flex flex-col gap-1 text-sm text-muted">
            Waluta domyślna
            <input
              name="defaultCurrency"
              defaultValue="PLN"
              maxLength={3}
              className="w-full rounded-2xl border border-line bg-white/5 px-4 py-3 outline-none"
            />
          </label>
        )}
        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-2xl bg-gradient-to-r from-accent to-accent2 px-4 py-3 font-medium text-black transition disabled:opacity-60"
        >
          {busy
            ? "Przetwarzanie..."
            : mode === "login"
              ? "Zaloguj się"
              : "Utwórz konto"}
        </button>
      </form>
      <div className="mt-5 border-t border-line pt-4 text-center text-sm text-muted">
        {mode === "login" ? "Nie masz jeszcze konta?" : "Masz już konto?"}{" "}
        <button
          type="button"
          className="text-accent hover:underline"
          onClick={() => {
            setMode(mode === "login" ? "register" : "login");
            setMessage("");
          }}
        >
          {mode === "login" ? "Zarejestruj się" : "Zaloguj się"}
        </button>
      </div>
      {message && (
        <p
          role="alert"
          className="mt-4 rounded-xl border border-rose-400/40 bg-rose-400/10 px-3 py-2 text-sm text-rose-300"
        >
          {message}
        </p>
      )}
    </div>
  );
}
