"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { setSession } from "@/lib/auth";
import type { PlanhubLoginResponse } from "@/lib/auth";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: email, password }),
      });

      const raw = await response.json();
      const res: PlanhubLoginResponse =
        "data" in raw && raw.data && typeof raw.data === "object" && "auth_token" in raw.data
          ? raw.data
          : raw;

      if (res.multiple_accounts) {
        setError("Multiple accounts found. Please contact your administrator.");
        return;
      }
      if (res.email_not_verified) {
        setError("Your email address has not been verified.");
        return;
      }
      if (res.optin_out_of_date) {
        setError("Please accept the updated Terms & Conditions on PlanHub first.");
        return;
      }
      if (res.isArchived === "yes") {
        setError("This account has been archived.");
        return;
      }
      if (!res.auth_token) {
        setError("Invalid email or password.");
        return;
      }

      setSession({
        auth_token: res.auth_token,
        userId: res.userId,
        email: res.email,
        userType: res.userType,
        userRole: res.userRole,
        companyId: res.companyId,
        superAdmin: res.superAdmin,
      });

      router.replace("/");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="h-9 w-9 rounded-full bg-[#00B894] flex items-center justify-center shrink-0">
            <span className="text-white font-bold text-sm">p</span>
          </div>
          <span className="font-semibold text-2xl tracking-tight">
            plan<span className="text-[#00B894]">Hub</span>
          </span>
        </div>

        <div className="bg-card border border-border rounded-xl p-8 shadow-sm">
          <h1 className="text-lg font-semibold text-foreground mb-1">Sign in</h1>
          <p className="text-sm text-muted-foreground mb-6">
            Use your PlanHub credentials to continue.
          </p>

          {error && (
            <div className="mb-4 rounded-md bg-destructive/10 border border-destructive/20 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Email
              </label>
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setError("");
                }}
                className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#00B894] focus:border-transparent"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Password
              </label>
              <input
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError("");
                }}
                className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#00B894] focus:border-transparent"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-9 rounded-md bg-[#00B894] text-sm font-medium text-white hover:bg-[#009F7F] transition-colors disabled:opacity-60 disabled:cursor-not-allowed mt-2"
            >
              {loading ? "Signing in…" : "Sign in"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
