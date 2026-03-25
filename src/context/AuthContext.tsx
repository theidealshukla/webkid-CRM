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

  // Fetch the public.users profile for a given auth user id
  const fetchUserProfile = useCallback(async (authUserId: string): Promise<User | null> => {
    try {
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("id", authUserId)
        .single();

      if (error || !data) return null;

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

  // Check existing session on mount with timeout + corruption protection
  useEffect(() => {
    isMounted.current = true;
    let subscription: { unsubscribe: () => void } | null = null;

    const init = async () => {
      try {
        // Use a timeout to prevent getSession() from hanging on corrupt tokens
        const sessionPromise = supabase.auth.getSession();
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("getSession timed out")), 8000)
        );

        const { data: { session } } = await Promise.race([sessionPromise, timeoutPromise]);

        if (session?.user && isMounted.current) {
          const profile = await fetchUserProfile(session.user.id);
          if (profile && isMounted.current) {
            setUser(profile);
            await fetchTeamMembers();
          } else if (isMounted.current) {
            // Auth user exists but no profile row — sign them out
            await supabase.auth.signOut();
            setUser(null);
          }
        }
      } catch (e) {
        console.error("Auth init error:", e);
        // If session retrieval fails (corrupt token, timeout, etc.), clear storage and recover
        clearSupabaseAuth();
        try {
          await supabase.auth.signOut();
        } catch {
          // signOut may also fail if token is corrupt, that's okay
        }
        if (isMounted.current) {
          setUser(null);
        }
      }

      if (isMounted.current) {
        setIsLoading(false);
      }
    };

    init();

    // Listen to auth state changes with error protection
    try {
      const { data: { subscription: sub } } = supabase.auth.onAuthStateChange(
        async (event, session) => {
          if (!isMounted.current) return;

          if (event === "TOKEN_REFRESHED" && !session) {
            // Token refresh failed — corrupted session, clear and sign out
            console.warn("Token refresh failed, clearing auth state");
            clearSupabaseAuth();
            setUser(null);
            setIsLoading(false);
            return;
          }

          if (event === "SIGNED_IN" && session?.user) {
            const profile = await fetchUserProfile(session.user.id);
            if (profile && isMounted.current) {
              setUser(profile);
              await fetchTeamMembers();
            }
          } else if (event === "SIGNED_OUT") {
            if (isMounted.current) {
              setUser(null);
              setTeamMembers([]);
            }
          }
        }
      );
      subscription = sub;
    } catch (e) {
      console.error("Failed to set up auth listener:", e);
      if (isMounted.current) {
        setIsLoading(false);
      }
    }

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

      let profile = await fetchUserProfile(data.user.id);
      
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
        profile = await fetchUserProfile(data.user.id);
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
