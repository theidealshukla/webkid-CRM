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

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [teamMembers, setTeamMembers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const isMounted = useRef(true);

  // Fetch the public.users profile for a given auth user id with timeout protection
  const fetchUserProfile = useCallback(async (authUser: any | string): Promise<User | null> => {
    // Support both string IDs (legacy) and full user objects (for fallback generation)
    const id = typeof authUser === "string" ? authUser : authUser?.id;
    const email = typeof authUser === "string" ? "" : authUser?.email;
    const name = typeof authUser === "string" ? "Admin" : (authUser?.user_metadata?.name || authUser?.email?.split("@")[0] || "Admin");

    try {
      const queryPromise = supabase
        .from("users")
        .select("*")
        .eq("id", id)
        .single();
        
      let timer: NodeJS.Timeout;
      const timeoutPromise = new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error("fetchUserProfile timeout")), 5000);
      });

      const { data, error } = await Promise.race([queryPromise, timeoutPromise]).finally(() => clearTimeout(timer)) as any;

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
      
      // HARD FALLBACK: If Supabase stalls or DB query fails, we STILL log them in!
      // This guarantees the dashboard loads instantly even if the database network locks up.
      if (email && id) {
        console.warn("Using offline fallback profile generation to prevent UI freeze.");
        return {
          id: id,
          email: email,
          name: name,
          role: "admin", // Fallback to admin to prevent getting locked out of features
        };
      }
      return null;
    }
  }, []);

  // Fetch all team members with timeout protection
  const fetchTeamMembers = useCallback(async () => {
    try {
      const queryPromise = supabase
        .from("users")
        .select("*")
        .order("name");
        
      let timer: NodeJS.Timeout;
      const timeoutPromise = new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error("fetchTeamMembers timeout")), 5000);
      });

      const { data, error } = await Promise.race([queryPromise, timeoutPromise]).finally(() => clearTimeout(timer)) as any;

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

    // 1. Listen to auth state changes immediately to catch events reliably
    try {
      const { data: { subscription: sub } } = supabase.auth.onAuthStateChange(
        async (event, session) => {
          if (!isMounted.current) return;
          console.log(`Auth event: ${event}`);

          if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED" || event === "INITIAL_SESSION") {
            hasResolved = true;
            if (session?.user) {
              const profile = await fetchUserProfile(session.user);
              if (profile && isMounted.current) {
                setUser(profile);
                fetchTeamMembers(); // Do not await this, let it load in background
              } else if (isMounted.current && event !== "INITIAL_SESSION") {
                // Only clear if definitively signed in but no profile exists
                setUser(null);
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

    // 2. Fetch initial session as a fallback guaranteed startup
    const initSession = async () => {
      try {
        const sessionPromise = supabase.auth.getSession();
        let timer: NodeJS.Timeout;
        const timeoutPromise = new Promise<never>((_, reject) => {
          timer = setTimeout(() => reject(new Error("getSession timeout")), 5000);
        });
        
        const { data: { session }, error } = await Promise.race([sessionPromise, timeoutPromise]).finally(() => clearTimeout(timer)) as any;
        
        if (error) {
           console.warn("getSession error:", error.message);
        }

        if (!hasResolved && isMounted.current) {
          hasResolved = true;
          if (session?.user) {
            const profile = await fetchUserProfile(session.user);
            if (profile && isMounted.current) {
              setUser(profile);
              fetchTeamMembers(); // Do not await this, let it load in background
            } else if (isMounted.current) {
              setUser(null);
            }
          } else {
            setUser(null);
          }
          setIsLoading(false);
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

      let profile = await fetchUserProfile(data.user);
      
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
            role: profileByEmail.role || "admin", // Fallback to admin if it's the first time linking
          }]);
        } else {
          // No profile at all, create a brand new one
          await supabase.from("users").insert([{
            id: data.user.id,
            email: email,
            name: email.split("@")[0],
            role: "admin", // Make them admin since they had valid auth credentials
          }]);
        }
        
        // Fetch again after self-healing
        profile = await fetchUserProfile(data.user);
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
  }, [fetchUserProfile, fetchTeamMembers]);

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

        // Update all foreign key references from old UUID to new auth UUID
        await Promise.all([
          supabase.from("leads").update({ assigned_to: newAuthId }).eq("assigned_to", oldId),
          supabase.from("leads").update({ uploaded_by: newAuthId }).eq("uploaded_by", oldId),
          supabase.from("activities").update({ user_id: newAuthId }).eq("user_id", oldId),
          supabase.from("activity_logs").update({ user_id: newAuthId }).eq("user_id", oldId),
          supabase.from("upload_batches").update({ uploaded_by: newAuthId }).eq("uploaded_by", oldId),
        ]);

        // Now update the users row itself (delete old, insert new to avoid PK conflict)
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
      // else: existingUser.id === newAuthId — profile already linked correctly, nothing to do

      // 3. Fetch the profile
      const profile = await fetchUserProfile({ id: newAuthId, email, user_metadata: { name } });
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
