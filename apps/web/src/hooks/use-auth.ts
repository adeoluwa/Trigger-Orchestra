"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { User, AuthResponse, ApiResponse, LoginRequest, RegisterRequest } from "@trigger-orchestra/shared";
import { api } from "@/lib/api";
import { saveTokens, saveUser, clearTokens, getStoredUser } from "@/lib/auth";

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
      const res = await api.post<ApiResponse<AuthResponse>>("/auth/login", data);
      saveTokens(res.data!.tokens.accessToken, res.data!.tokens.refreshToken);
      saveUser(res.data!.user);
      setUser(res.data!.user);
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
      const res = await api.post<ApiResponse<AuthResponse>>("/auth/register", data);
      saveTokens(res.data!.tokens.accessToken, res.data!.tokens.refreshToken);
      saveUser(res.data!.user);
      setUser(res.data!.user);
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
