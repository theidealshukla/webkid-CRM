import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Derive a predictable storage key from the Supabase URL
const projectRef = supabaseUrl.match(/https:\/\/([^.]+)/)?.[1] || "webkid";
const STORAGE_KEY = `sb-${projectRef}-auth-token`;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    storageKey: STORAGE_KEY,
    detectSessionInUrl: true,
  }
});

/**
 * Safely clear corrupted Supabase auth data from localStorage.
 * Call this when auth initialization fails to recover from bad state.
 */
export function clearSupabaseAuth(): void {
  if (typeof window === "undefined") return;
  try {
    // Remove the known auth key
    window.localStorage.removeItem(STORAGE_KEY);
    // Also clear any legacy/stale Supabase keys
    const keysToRemove: string[] = [];
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i);
      if (key && (key.startsWith("sb-") || key.startsWith("supabase"))) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach((key) => window.localStorage.removeItem(key));
  } catch (e) {
    console.warn("Failed to clear Supabase auth storage:", e);
  }
}
