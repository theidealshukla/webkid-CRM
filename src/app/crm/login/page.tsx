"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Mail, Lock, User, AlertCircle, ArrowRight, Eye, EyeOff } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

export default function LoginPage() {
  const [isSignup, setIsSignup] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { login, signup } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    if (isSignup) {
      if (!name.trim()) {
        setError("Please enter your full name");
        setIsLoading(false);
        return;
      }
      if (password.length < 6) {
        setError("Password must be at least 6 characters");
        setIsLoading(false);
        return;
      }
      const result = await signup(email, password, name.trim());
      if (result.success) {
        router.push("/crm");
      } else {
        setError(result.error || "Signup failed");
      }
    } else {
      const result = await login(email, password);
      if (result.success) {
        router.push("/crm");
      } else {
        setError(result.error || "Invalid email or password");
      }
    }

    setIsLoading(false);
  };

  const switchMode = () => {
    setIsSignup(!isSignup);
    setError("");
    setName("");
    setPassword("");
  };

  return (
    <div className="min-h-screen relative overflow-hidden flex items-center justify-center p-4">
      {/* Animated gradient background */}
      <div
        className="absolute inset-0"
        style={{
          background: "linear-gradient(135deg, #0f0f23 0%, #1a1a3e 25%, #0d0d2b 50%, #1a0a2e 75%, #0f0f23 100%)",
        }}
      />

      {/* Floating orbs */}
      <div
        className="absolute w-[500px] h-[500px] rounded-full opacity-20 blur-[120px]"
        style={{
          background: "radial-gradient(circle, #6366f1, transparent 70%)",
          top: "-10%",
          right: "-5%",
          animation: "float 8s ease-in-out infinite",
        }}
      />
      <div
        className="absolute w-[400px] h-[400px] rounded-full opacity-15 blur-[100px]"
        style={{
          background: "radial-gradient(circle, #8b5cf6, transparent 70%)",
          bottom: "-10%",
          left: "-5%",
          animation: "float 10s ease-in-out infinite reverse",
        }}
      />
      <div
        className="absolute w-[300px] h-[300px] rounded-full opacity-10 blur-[80px]"
        style={{
          background: "radial-gradient(circle, #a78bfa, transparent 70%)",
          top: "40%",
          left: "30%",
          animation: "float 12s ease-in-out infinite",
        }}
      />

      {/* Card */}
      <div
        className="relative w-full max-w-[420px] animate-fade-in"
        style={{ animationDuration: "0.6s" }}
      >
        <div
          className="rounded-3xl p-8 md:p-10 shadow-2xl"
          style={{
            background: "rgba(255, 255, 255, 0.04)",
            backdropFilter: "blur(40px)",
            WebkitBackdropFilter: "blur(40px)",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            boxShadow: "0 32px 64px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.05)",
          }}
        >
          {/* Brand */}
          <div className="flex justify-center mb-8">
            <div
              className="h-16 w-16 rounded-2xl flex items-center justify-center"
              style={{
                background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
                boxShadow: "0 8px 32px rgba(99, 102, 241, 0.4)",
              }}
            >
              <span className="text-white font-bold text-2xl tracking-tight">W</span>
            </div>
          </div>

          <h1
            className="text-2xl font-bold text-center text-white mb-1"
            style={{ fontFamily: "'Clash Display', 'Inter', sans-serif" }}
          >
            {isSignup ? "Create Account" : "Welcome Back"}
          </h1>
          <p className="text-sm text-center mb-8" style={{ color: "rgba(255, 255, 255, 0.45)" }}>
            {isSignup ? "Sign up to get started with Webkid CRM" : "Sign in to your CRM account"}
          </p>

          {/* Error */}
          {error && (
            <div
              className="flex items-center gap-2.5 p-3.5 mb-6 rounded-xl text-sm animate-fade-in"
              style={{
                background: "rgba(239, 68, 68, 0.1)",
                border: "1px solid rgba(239, 68, 68, 0.2)",
                color: "#fca5a5",
              }}
            >
              <AlertCircle className="h-4 w-4 flex-shrink-0" style={{ color: "#f87171" }} />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {isSignup && (
              <div className="relative group">
                <User
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 transition-colors duration-200"
                  style={{ color: "rgba(255, 255, 255, 0.3)" }}
                />
                <input
                  type="text"
                  placeholder="Full name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 rounded-xl text-sm text-white placeholder:text-white/30 outline-none transition-all duration-200"
                  style={{
                    background: "rgba(255, 255, 255, 0.05)",
                    border: "1px solid rgba(255, 255, 255, 0.08)",
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = "rgba(99, 102, 241, 0.5)";
                    e.target.style.boxShadow = "0 0 0 3px rgba(99, 102, 241, 0.1)";
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = "rgba(255, 255, 255, 0.08)";
                    e.target.style.boxShadow = "none";
                  }}
                  required
                  autoComplete="name"
                />
              </div>
            )}

            <div className="relative group">
              <Mail
                className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 transition-colors duration-200"
                style={{ color: "rgba(255, 255, 255, 0.3)" }}
              />
              <input
                type="email"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-11 pr-4 py-3 rounded-xl text-sm text-white placeholder:text-white/30 outline-none transition-all duration-200"
                style={{
                  background: "rgba(255, 255, 255, 0.05)",
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = "rgba(99, 102, 241, 0.5)";
                  e.target.style.boxShadow = "0 0 0 3px rgba(99, 102, 241, 0.1)";
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = "rgba(255, 255, 255, 0.08)";
                  e.target.style.boxShadow = "none";
                }}
                required
                autoComplete="email"
              />
            </div>

            <div className="relative group">
              <Lock
                className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 transition-colors duration-200"
                style={{ color: "rgba(255, 255, 255, 0.3)" }}
              />
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-11 pr-11 py-3 rounded-xl text-sm text-white placeholder:text-white/30 outline-none transition-all duration-200"
                style={{
                  background: "rgba(255, 255, 255, 0.05)",
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = "rgba(99, 102, 241, 0.5)";
                  e.target.style.boxShadow = "0 0 0 3px rgba(99, 102, 241, 0.1)";
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = "rgba(255, 255, 255, 0.08)";
                  e.target.style.boxShadow = "none";
                }}
                required
                minLength={6}
                autoComplete={isSignup ? "new-password" : "current-password"}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 p-0.5 rounded transition-colors"
                style={{ color: "rgba(255, 255, 255, 0.3)" }}
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2 transition-all duration-300 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
              style={{
                background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
                boxShadow: "0 4px 16px rgba(99, 102, 241, 0.3)",
              }}
              onMouseEnter={(e) => {
                if (!isLoading) {
                  e.currentTarget.style.boxShadow = "0 8px 32px rgba(99, 102, 241, 0.5)";
                  e.currentTarget.style.transform = "translateY(-1px)";
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = "0 4px 16px rgba(99, 102, 241, 0.3)";
                e.currentTarget.style.transform = "translateY(0)";
              }}
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  {isSignup ? "Creating account..." : "Signing in..."}
                </span>
              ) : (
                <>
                  {isSignup ? "Create Account" : "Sign In"}
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3 my-6">
            <div className="flex-1 h-px" style={{ background: "rgba(255, 255, 255, 0.06)" }} />
            <span className="text-xs" style={{ color: "rgba(255, 255, 255, 0.25)" }}>
              {isSignup ? "Already have an account?" : "Don't have an account?"}
            </span>
            <div className="flex-1 h-px" style={{ background: "rgba(255, 255, 255, 0.06)" }} />
          </div>

          <button
            onClick={switchMode}
            className="w-full py-3 rounded-xl text-sm font-medium transition-all duration-200 cursor-pointer"
            style={{
              color: "rgba(255, 255, 255, 0.6)",
              background: "rgba(255, 255, 255, 0.03)",
              border: "1px solid rgba(255, 255, 255, 0.06)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(255, 255, 255, 0.06)";
              e.currentTarget.style.color = "rgba(255, 255, 255, 0.9)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "rgba(255, 255, 255, 0.03)";
              e.currentTarget.style.color = "rgba(255, 255, 255, 0.6)";
            }}
          >
            {isSignup ? "Sign In Instead" : "Create an Account"}
          </button>
        </div>

        {/* Footer */}
        <p
          className="text-center mt-6 text-xs"
          style={{ color: "rgba(255, 255, 255, 0.2)" }}
        >
          Powered by <span style={{ color: "rgba(255, 255, 255, 0.4)" }}>Webkid.ai</span>
        </p>
      </div>

      <style jsx>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px) scale(1); }
          50% { transform: translateY(-30px) scale(1.05); }
        }
      `}</style>
    </div>
  );
}
