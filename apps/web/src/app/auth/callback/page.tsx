"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Workflow } from "lucide-react";
import { saveTokens, saveUser } from "@/lib/auth";
import { api } from "@/lib/api";
import type { ApiResponse, User } from "@trigger-orchestra/shared";

export default function AuthCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = searchParams.get("token");
    const refreshToken = searchParams.get("refreshToken");

    if (!token || !refreshToken) {
      setError("Missing tokens in callback URL.");
      return;
    }

    // Save tokens first so the next API call is authenticated
    saveTokens(token, refreshToken);

    // Fetch the user profile with the new token
    api
      .get<ApiResponse<User>>("/auth/me")
      .then((res) => {
        if (res.data) {
          saveUser(res.data);
        }
        router.replace("/dashboard");
      })
      .catch(() => {
        // Even if /me fails, we have the tokens — proceed to dashboard
        router.replace("/dashboard");
      });
  }, [router, searchParams]);

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3">
        <p className="text-sm text-destructive">{error}</p>
        <a href="/login" className="text-xs text-muted-foreground underline underline-offset-4">
          Back to login
        </a>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4">
      <div className="flex size-12 items-center justify-center rounded-xl bg-primary/15 ring-1 ring-primary/20">
        <Workflow className="size-6 text-primary animate-pulse" />
      </div>
      <p className="text-sm text-muted-foreground">Completing sign in…</p>
    </div>
  );
}
