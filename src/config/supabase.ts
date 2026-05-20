import { createBrowserClient } from "@supabase/ssr";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Use createBrowserClient which automatically handles cookie-based sessions
// and avoids the detectSessionInUrl loop issues
export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey);

/**
 * Safely clear corrupted Supabase auth data from localStorage/cookies.
 * Call this when auth initialization fails to recover from bad state.
 */
export function clearSupabaseAuth(): void {
  if (typeof window === "undefined") return;
  try {
    // Clear any legacy/stale Supabase keys from localStorage just in case
    const keysToRemove: string[] = [];
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i);
      if (key && (key.startsWith("sb-") || key.startsWith("supabase") || key.startsWith("crm_role_"))) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach((key) => window.localStorage.removeItem(key));
  } catch (e) {
    console.warn("Failed to clear Supabase auth storage:", e);
  }
}
