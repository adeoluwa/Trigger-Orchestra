"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { User, AuthResponse, LoginRequest, RegisterRequest } from "@trigger-orchestra/shared";
import { api } from "@/lib/api";
import { saveTokens, saveUser, clearTokens, getStoredUser } from "@/lib/auth";

function extractPayload(body: Record<string, unknown>): AuthResponse {
  // Backend wraps in { success, data: { user, accessToken, refreshToken } }
  const payload = (body.data ?? body) as AuthResponse;
  return payload;
}

export function useAuth() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const stored = getStoredUser();
    if (stored) setUser(stored);
  }, []);

  const login = useCallback(async (data: LoginRequest) => {
    setLoading(true);
    setError(null);
    try {
      const body = await api.post<Record<string, unknown>>("/auth/login", data);
      const payload = extractPayload(body);
      if (!payload.accessToken) throw new Error("Invalid server response");
      saveTokens(payload.accessToken, payload.refreshToken);
      saveUser(payload.user);
      setUser(payload.user);
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }, [router]);

  const register = useCallback(async (data: RegisterRequest) => {
    setLoading(true);
    setError(null);
    try {
      const body = await api.post<Record<string, unknown>>("/auth/register", data);
      const payload = extractPayload(body);
      if (!payload.accessToken) throw new Error("Invalid server response");
      saveTokens(payload.accessToken, payload.refreshToken);
      saveUser(payload.user);
      setUser(payload.user);
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  }, [router]);

  const logout = useCallback(() => {
    clearTokens();
    setUser(null);
    router.push("/login");
  }, [router]);

  return { user, loading, error, login, register, logout };
}
