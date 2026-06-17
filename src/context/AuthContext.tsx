"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
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

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [teamMembers, setTeamMembers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch all team members
  const fetchTeamMembers = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .order("name");

      if (!error && data) {
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

  const fetchUserProfile = useCallback(async (authUser: any): Promise<User | null> => {
    const id = typeof authUser === "string" ? authUser : authUser?.id;
    if (!id) return null;

    // Retry up to 2 times before giving up (handles transient network blips)
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const { data, error } = await Promise.race([
          supabase.from("users").select("*").eq("id", id).single(),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error("Profile fetch timed out")), 10000)
          ),
        ]);

        if (error) throw new Error("Profile fetch issue: " + error.message);
        if (!data) throw new Error("Profile fetch issue: No data");

        return {
          id: data.id,
          email: data.email,
          name: data.name,
          role: data.role || "member",
        };
      } catch (e) {
        console.error(`fetchUserProfile error (attempt ${attempt}):`, e);
        if (attempt < 2) {
          // Brief pause before retry
          await new Promise(r => setTimeout(r, 1500));
        }
      }
    }
    return null;
  }, []);

  useEffect(() => {
    let subscription: { unsubscribe: () => void } | null = null;
    let isMounted = true;
    // Debounce flag: prevents duplicate SIGNED_IN / INITIAL_SESSION events
    // (HMR, token refresh, and Supabase realtime can fire these in rapid succession)
    let handlingAuth = false;

    const initialize = async () => {
      try {
        const { data: { subscription: sub } } = supabase.auth.onAuthStateChange(
          async (event, session) => {
            if (!isMounted) return;
            console.log(`Auth event: ${event}`);

            if (event === "TOKEN_REFRESHED") {
              // Ignore token refreshes — the session is still valid.
              setIsLoading(false);
              return;
            }

            if (event === "SIGNED_IN" || event === "INITIAL_SESSION") {
              // Guard against concurrent handling of duplicate events
              if (handlingAuth) return;
              handlingAuth = true;

              try {
                if (session?.user) {
                  const profile = await fetchUserProfile(session.user);
                  if (!isMounted) return;

                  if (profile) {
                    setUser(profile);
                    fetchTeamMembers(); // background fetch, non-blocking
                  } else {
                    // Profile truly not found after retries — only log out if we
                    // have no existing user state (don't evict an already-working session)
                    console.error("Auth profile fetch failed after retries.");
                    setUser(prev => {
                      if (prev) {
                        // Keep the existing user rather than forcing a logout on a
                        // transient Supabase hiccup
                        console.warn("Keeping existing user session due to profile fetch failure.");
                        return prev;
                      }
                      // No existing user — safe to sign out
                      supabase.auth.signOut();
                      return null;
                    });
                  }
                } else {
                  setUser(null);
                }
              } finally {
                if (isMounted) setIsLoading(false);
                // Release the lock after a short delay to swallow any immediate
                // duplicate events from the same auth action
                setTimeout(() => { handlingAuth = false; }, 2000);
              }
            } else if (event === "SIGNED_OUT") {
              handlingAuth = false;
              setUser(null);
              setTeamMembers([]);
              setIsLoading(false);
            }
          }
        );
        subscription = sub;
      } catch (e) {
        console.error("Failed to set up auth listener:", e);
        if (isMounted) setIsLoading(false);
      }
    };

    initialize();

    return () => {
      isMounted = false;
      subscription?.unsubscribe();
    };
  }, [fetchUserProfile, fetchTeamMembers]);

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

      const profile = await fetchUserProfile(data.user);
      
      if (profile) {
        setUser(profile);
        await fetchTeamMembers();
        return { success: true };
      } else {
        await supabase.auth.signOut();
        return { success: false, error: "User profile not found. Please contact an admin." };
      }
    } catch (e: any) {
      console.error("Login error:", e);
      return { success: false, error: e.message || "An unexpected error occurred." };
    }
  }, [fetchUserProfile, fetchTeamMembers]);

  const signup = useCallback(async (email: string, password: string, name: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (authError) return { success: false, error: authError.message };
      if (!authData.user) return { success: false, error: "Signup failed. Please try again." };

      const newAuthId = authData.user.id;

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

      const profile = await fetchUserProfile(newAuthId);
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
  }, [fetchUserProfile, fetchTeamMembers]);

  const logout = useCallback(async () => {
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.error("Logout error:", e);
    }
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
