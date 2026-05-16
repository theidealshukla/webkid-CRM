"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import type { User } from "@/types";
import { supabase, clearSupabaseAuth } from "@/config/supabase";

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signup: (email: string, password: string, name: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  teamMembers: User[];
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Simple sleep helper for retry delays
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [teamMembers, setTeamMembers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const isMounted = useRef(true);

  // Fetch the public.users profile for a given auth user id.
  // Returns null on any DB error — callers must handle null without guessing the role.
  // The old "member fallback" was removed: assigning role:"member" on a DB timeout
  // silently downgrades an admin every time Supabase has a slow cold start.
  const fetchUserProfile = useCallback(async (authUser: any | string): Promise<User | null> => {
    const id = typeof authUser === "string" ? authUser : authUser?.id;
    if (!id) return null;

    try {
      // Bug A fix: race against a 5s timeout so a hung Supabase query never
      // blocks isLoading from clearing (no timeout = spinner stuck forever).
      const { data, error } = await Promise.race([
        supabase.from("users").select("*").eq("id", id).single(),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("Profile fetch timed out")), 5000)
        ),
      ]);

      if (error || !data) {
        throw new Error("Profile fetch issue: " + (error?.message || "No data"));
      }

      return {
        id: data.id,
        email: data.email,
        name: data.name,
        role: data.role || "member",
      };
    } catch (e) {
      console.error("fetchUserProfile error:", e);
      return null;
    }
  }, []);

  // Fetch profile with one automatic retry (handles Supabase cold-start latency).
  // Does NOT fall back to a guessed role — returns null if both attempts fail.
  const fetchUserProfileWithRetry = useCallback(async (authUser: any | string): Promise<User | null> => {
    let profile = await fetchUserProfile(authUser);
    if (!profile) {
      await sleep(2000); // brief pause before retry
      profile = await fetchUserProfile(authUser);
    }
    return profile;
  }, [fetchUserProfile]);

  // Fetch all team members
  const fetchTeamMembers = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .order("name");

      if (!error && data && isMounted.current) {
        setTeamMembers(
          data.map((u: { id: string; email: string; name: string; role: string }) => ({
            id: u.id,
            email: u.email,
            name: u.name,
            role: (u.role || "member") as "admin" | "member",
          }))
        );
      }
    } catch (e) {
      console.error("fetchTeamMembers error:", e);
    }
  }, []);

  // Check existing session on mount
  useEffect(() => {
    isMounted.current = true;
    let subscription: { unsubscribe: () => void } | null = null;
    let hasResolved = false;

    // Bug B fix: absolute safety net — no matter what goes wrong in the async
    // chain, isLoading clears after 15s so the user is never permanently stuck.
    // 15s = 2 profile fetch attempts × 5s timeout + 2s sleep between retries + buffer.
    const maxLoadingTimer = setTimeout(() => {
      if (isMounted.current) {
        console.warn("Auth: max loading time reached, forcing isLoading=false");
        setIsLoading(false);
      }
    }, 15000);

    // 1. Listen to auth state changes immediately to catch events reliably
    try {
      const { data: { subscription: sub } } = supabase.auth.onAuthStateChange(
        async (event, session) => {
          if (!isMounted.current) return;
          console.log(`Auth event: ${event}`);

          if (event === "TOKEN_REFRESHED") {
            // JWT was silently renewed — the user's role/profile hasn't changed.
            // Skip re-fetching: a DB timeout here would cause a role downgrade.
            hasResolved = true;
            if (isMounted.current) setIsLoading(false);
          } else if (event === "SIGNED_IN" || event === "INITIAL_SESSION") {
            hasResolved = true;
            if (session?.user) {
              const profile = await fetchUserProfileWithRetry(session.user);
              if (profile && isMounted.current) {
                setUser(profile);
                fetchTeamMembers(); // background, no await
              } else if (isMounted.current) {
                // Bug C fix: profile fetch failed for an authenticated session.
                // Use auth metadata as a minimal fallback so the user isn't locked
                // out by a DB cold-start or transient connectivity issue.
                // Role defaults to "member" — admin can still reload once DB recovers.
                const fallback: User = {
                  id: session.user.id,
                  email: session.user.email ?? "",
                  name: (session.user.user_metadata?.name as string | undefined)
                    ?? session.user.email?.split("@")[0]
                    ?? "User",
                  role: "member",
                };
                console.warn("Auth: profile fetch failed, using auth metadata fallback");
                setUser(fallback);
                fetchTeamMembers();
              }
            } else if (isMounted.current) {
              setUser(null);
            }
            if (isMounted.current) setIsLoading(false);
          } else if (event === "SIGNED_OUT") {
            hasResolved = true;
            if (isMounted.current) {
              setUser(null);
              setTeamMembers([]);
              setIsLoading(false);
            }
          }
        }
      );
      subscription = sub;
    } catch (e) {
      console.error("Failed to set up auth listener:", e);
    }

    // 2. Fetch initial session as a guaranteed startup fallback
    const initSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) console.warn("getSession error:", error.message);

        if (!hasResolved && isMounted.current) {
          hasResolved = true;
          if (session?.user) {
            const profile = await fetchUserProfileWithRetry(session.user);
            if (profile && isMounted.current) {
              setUser(profile);
              fetchTeamMembers();
            } else if (isMounted.current) {
              // Same fallback as above for the initSession path
              const fallback: User = {
                id: session.user.id,
                email: session.user.email ?? "",
                name: (session.user.user_metadata?.name as string | undefined)
                  ?? session.user.email?.split("@")[0]
                  ?? "User",
                role: "member",
              };
              console.warn("Auth: profile fetch failed in initSession, using fallback");
              setUser(fallback);
              fetchTeamMembers();
            }
          } else {
            if (isMounted.current) setUser(null);
          }
          if (isMounted.current) setIsLoading(false);
        }
      } catch (e) {
        console.error("Auth init exception:", e);
        if (!hasResolved && isMounted.current) {
          hasResolved = true;
          setUser(null);
          setIsLoading(false);
        }
      }
    };

    initSession();

    return () => {
      isMounted.current = false;
      clearTimeout(maxLoadingTimer);
      subscription?.unsubscribe();
    };
  }, [fetchUserProfileWithRetry, fetchTeamMembers]);

  const login = useCallback(async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        return { success: false, error: error.message };
      }

      if (!data.user) {
        return { success: false, error: "Login failed. Please try again." };
      }

      let profile = await fetchUserProfileWithRetry(data.user);

      // Auto-heal missing or disconnected profiles
      if (!profile) {
        const { data: profileByEmail } = await supabase
          .from("users")
          .select("*")
          .eq("email", email)
          .single();

        if (profileByEmail) {
          // Profile exists with different ID — migrate it
          const oldId = profileByEmail.id;
          const newId = data.user.id;

          await Promise.all([
            supabase.from("leads").update({ assigned_to: newId }).eq("assigned_to", oldId),
            supabase.from("leads").update({ uploaded_by: newId }).eq("uploaded_by", oldId),
            supabase.from("activities").update({ user_id: newId }).eq("user_id", oldId),
            supabase.from("activity_logs").update({ user_id: newId }).eq("user_id", oldId),
            supabase.from("upload_batches").update({ uploaded_by: newId }).eq("uploaded_by", oldId),
          ]);

          await supabase.from("users").delete().eq("id", oldId);
          await supabase.from("users").insert([{
            id: newId,
            email: profileByEmail.email,
            name: profileByEmail.name || email.split("@")[0],
            role: profileByEmail.role || "member",
          }]);
        } else {
          // No profile at all, create a brand new one
          await supabase.from("users").insert([{
            id: data.user.id,
            email: email,
            name: email.split("@")[0],
            role: "member", // default to member; admin must be granted explicitly
          }]);
        }

        // Fetch again after self-healing
        profile = await fetchUserProfileWithRetry(data.user);
      }

      if (profile) {
        setUser(profile);
        await fetchTeamMembers();
        return { success: true };
      }

      return { success: false, error: "Failed to sync user profile. Please contact support." };
    } catch (e: any) {
      console.error("Login error:", e);
      return { success: false, error: e.message || "An unexpected error occurred." };
    }
  }, [fetchUserProfileWithRetry, fetchTeamMembers]);

  const signup = useCallback(async (email: string, password: string, name: string): Promise<{ success: boolean; error?: string }> => {
    try {
      // 1. Create auth user in Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (authError) {
        return { success: false, error: authError.message };
      }

      if (!authData.user) {
        return { success: false, error: "Signup failed. Please try again." };
      }

      const newAuthId = authData.user.id;

      // 2. Check if a public.users row already exists with this email
      const { data: existingUser } = await supabase
        .from("users")
        .select("id, name, role")
        .eq("email", email)
        .single();

      if (existingUser && existingUser.id !== newAuthId) {
        // Existing profile found with a different UUID — migrate all FK references
        const oldId = existingUser.id;

        await Promise.all([
          supabase.from("leads").update({ assigned_to: newAuthId }).eq("assigned_to", oldId),
          supabase.from("leads").update({ uploaded_by: newAuthId }).eq("uploaded_by", oldId),
          supabase.from("activities").update({ user_id: newAuthId }).eq("user_id", oldId),
          supabase.from("activity_logs").update({ user_id: newAuthId }).eq("user_id", oldId),
          supabase.from("upload_batches").update({ uploaded_by: newAuthId }).eq("uploaded_by", oldId),
        ]);

        await supabase.from("users").delete().eq("id", oldId);
        await supabase.from("users").insert([{
          id: newAuthId,
          email,
          name: name || existingUser.name || "User",
          role: existingUser.role || "member",
        }]);

      } else if (!existingUser) {
        // No existing profile — create a fresh one
        const { error: profileError } = await supabase
          .from("users")
          .insert([{
            id: newAuthId,
            email,
            name,
            role: "member",
          }]);

        if (profileError) {
          console.error("Profile creation error:", profileError);
          await supabase.auth.signOut();
          return { success: false, error: "Failed to create user profile. Please try again." };
        }
      }
      // else: existingUser.id === newAuthId — profile already linked correctly

      // 3. Fetch the profile
      const profile = await fetchUserProfileWithRetry({ id: newAuthId, email, user_metadata: { name } });
      if (profile) {
        setUser(profile);
        await fetchTeamMembers();
        return { success: true };
      }

      return { success: false, error: "Profile created but failed to load. Please login." };
    } catch (e: any) {
      console.error("Signup error:", e);
      return { success: false, error: e.message || "An unexpected error occurred." };
    }
  }, [fetchUserProfileWithRetry, fetchTeamMembers]);

  const logout = useCallback(async () => {
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.error("Logout error:", e);
    }
    // Always clear storage to prevent stale token issues
    clearSupabaseAuth();
    setUser(null);
    setTeamMembers([]);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        signup,
        logout,
        teamMembers,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
