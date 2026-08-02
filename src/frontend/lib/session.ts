const tokenKey = "grosz_do_grosza_token";

export function saveToken(token: string) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(tokenKey, token);
}

export function readToken() {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(tokenKey);
}

export function clearToken() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(tokenKey);
}
