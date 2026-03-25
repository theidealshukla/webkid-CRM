"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import type { User } from "@/types";
import { supabase } from "@/config/supabase";

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
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

  const login = useCallback(async (email: string, password: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error || !data.user) {
        console.error("Login error:", error?.message);
        return false;
      }

      const profile = await fetchUserProfile(data.user.id);
      if (profile) {
        setUser(profile);
        await fetchTeamMembers();
        return true;
      }
      return false;
    } catch (e) {
      console.error("Login error:", e);
      return false;
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
