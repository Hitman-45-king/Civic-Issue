import { createBrowserClient } from "@supabase/ssr";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://demo.civicguard.org";
const supabaseAnon =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  "demo-anon-key-placeholder";

export const isLiveBackendConfigured = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  !process.env.NEXT_PUBLIC_SUPABASE_URL.includes("xyz") &&
  (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY)
);

export const supabase = createBrowserClient(supabaseUrl, supabaseAnon);

export const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export async function authHeader(): Promise<Record<string, string>> {
  try {
    const { data } = await supabase.auth.getSession();
    const token = data?.session?.access_token;
    return token ? { Authorization: `Bearer ${token}` } : {};
  } catch {
    return {};
  }
}

export async function api<T = any>(path: string, init: RequestInit = {}): Promise<T> {
  const h = await authHeader();
  try {
    const res = await fetch(`${API}${path}`, {
      ...init,
      headers: { "Content-Type": "application/json", ...h, ...(init.headers || {}) },
    });
    if (!res.ok) throw new Error(await res.text());
    const ct = res.headers.get("content-type") || "";
    return (ct.includes("json") ? res.json() : res.text()) as T;
  } catch (err) {
    // Re-throw so callers can decide whether to use local fallback
    throw err;
  }
}
