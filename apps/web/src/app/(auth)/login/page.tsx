"use client";

import Link from "next/link";
import { useState } from "react";
import { Github } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";
import { useAuth } from "@/hooks/use-auth";

const GITHUB_OAUTH_URL = `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000/api/v1"}/auth/github`;

export default function LoginPage() {
  const { login, loading, error } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await login({ email, password });
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold tracking-tight">Trigger Orchestra</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Sign in to manage your deployments
        </p>
      </div>

      <Card className="p-6 flex flex-col gap-4">
        {error && (
          <Alert variant="destructive">
            <p className="text-sm">{error}</p>
          </Alert>
        )}

        <a href={GITHUB_OAUTH_URL}>
          <Button variant="outline" className="w-full gap-2">
            <Github className="size-4" />
            Continue with GitHub
          </Button>
        </a>

        <div className="relative flex items-center gap-3 text-xs text-muted-foreground">
          <div className="flex-1 border-t border-border" />
          <span>or</span>
          <div className="flex-1 border-t border-border" />
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </div>
          <Button type="submit" className="w-full mt-1" disabled={loading}>
            {loading ? "Signing in…" : "Sign in"}
          </Button>
        </form>
      </Card>

      <p className="text-center text-sm text-muted-foreground">
        No account?{" "}
        <Link href="/register" className="text-foreground underline underline-offset-4">
          Create one
        </Link>
      </p>
    </div>
  );
}
