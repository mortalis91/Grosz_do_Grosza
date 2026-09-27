import { readToken } from "@/lib/session";

const baseUrl =
  process.env.NEXT_PUBLIC_BACKEND_API_URL ?? "http://localhost:5000";

export async function authFetch(path: string, init: RequestInit = {}) {
  const token = readToken();
  const headers = new Headers(init.headers);
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  if (
    !headers.has("Content-Type") &&
    init.body &&
    !(init.body instanceof FormData)
  ) {
    headers.set("Content-Type", "application/json");
  }

  return fetch(`${baseUrl}${path}`, {
    ...init,
    headers,
    cache: "no-store",
  });
}
