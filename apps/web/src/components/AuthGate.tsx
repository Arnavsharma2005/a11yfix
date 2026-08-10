import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Github, ShieldCheck } from "lucide-react";
import { getCurrentUser } from "../api/client";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "/api";

interface AuthGateProps {
  children: React.ReactNode;
}

export default function AuthGate({ children }: AuthGateProps) {
  const userQuery = useQuery({
    queryKey: ["currentUser"],
    queryFn: getCurrentUser,
    retry: false
  });

  if (userQuery.isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
        <div className="flex items-center gap-3 rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent" />
          <span className="text-sm font-medium text-zinc-700">Verifying session...</span>
        </div>
      </div>
    );
  }

  if (userQuery.isError) {
    const error = userQuery.error as Error & { status?: number };
    const isUnauthenticated = error.status === 401 || error.message.includes("Sign in") || error.message.includes("401");

    if (isUnauthenticated) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4 text-zinc-950">
          <div className="w-full max-w-md space-y-6 rounded-xl border border-zinc-200 bg-white p-8 text-center shadow-sm">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
              <ShieldCheck className="h-6 w-6" aria-hidden="true" />
            </div>

            <div className="space-y-2">
              <h1 className="text-xl font-semibold tracking-tight">Sign in to A11yFix</h1>
              <p className="text-sm text-zinc-600">
                Authenticate with GitHub to manage sites, run automated WCAG audits, and open pull requests for fixes.
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                window.location.href = `${API_BASE_URL}/auth/github`;
              }}
              className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-zinc-900 px-4 text-sm font-semibold text-white hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:ring-offset-2"
            >
              <Github className="h-4 w-4" aria-hidden="true" />
              Sign in with GitHub
            </button>
          </div>
        </div>
      );
    }
  }

  return <>{children}</>;
}
