"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import type { User } from "@/types";
import { supabase } from "@/config/supabase";

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

  // Fetch the public.users profile for a given auth user id
  const fetchUserProfile = useCallback(async (authUserId: string): Promise<User | null> => {
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
  }, []);

  // Fetch all team members
  const fetchTeamMembers = useCallback(async () => {
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
  }, []);

  // Check existing session on mount
  useEffect(() => {
    const init = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const profile = await fetchUserProfile(session.user.id);
          if (profile) {
            setUser(profile);
            await fetchTeamMembers();
          } else {
            // Auth user exists but no profile row — sign them out
            await supabase.auth.signOut();
            setUser(null);
          }
        }
      } catch (e) {
        console.error("Auth init error:", e);
      }
      setIsLoading(false);
    };
    init();

    // Listen to auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === "SIGNED_IN" && session?.user) {
          const profile = await fetchUserProfile(session.user.id);
          if (profile) {
            setUser(profile);
            await fetchTeamMembers();
          }
        } else if (event === "SIGNED_OUT") {
          setUser(null);
          setTeamMembers([]);
        }
      }
    );

    return () => subscription.unsubscribe();
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

      const profile = await fetchUserProfile(data.user.id);
      if (profile) {
        setUser(profile);
        await fetchTeamMembers();
        return { success: true };
      }
      
      return { success: false, error: "No user profile found. Contact your admin." };
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
    await supabase.auth.signOut();
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
