"use client";

import { use, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Plus, Trash2, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSecrets } from "@/hooks/use-secrets";
import { api } from "@/lib/api";
import type { ApiResponse, CreateSecretRequest } from "@trigger-orchestra/shared";

function AddSecretForm({ projectId, onAdded }: { projectId: string; onAdded: () => void }) {
  const [key, setKey] = useState("");
  const [value, setValue] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post<ApiResponse<unknown>>("/secrets", {
        key,
        value,
        projectId,
      } satisfies CreateSecretRequest);
      setKey("");
      setValue("");
      onAdded();
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="p-4">
      <form onSubmit={handleSubmit} className="flex gap-3 items-end">
        <div className="flex flex-col gap-1.5 flex-1">
          <Label htmlFor="secret-key">Key</Label>
          <Input
            id="secret-key"
            value={key}
            onChange={(e) => setKey(e.target.value)}
            placeholder="DATABASE_URL"
            className="font-mono text-sm"
            required
          />
        </div>
        <div className="flex flex-col gap-1.5 flex-1">
          <Label htmlFor="secret-val">Value</Label>
          <Input
            id="secret-val"
            type="password"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="••••••••"
            className="font-mono text-sm"
            required
          />
        </div>
        <Button type="submit" size="sm" className="gap-1.5 shrink-0" disabled={loading}>
          <Plus className="size-4" />
          {loading ? "Adding…" : "Add"}
        </Button>
      </form>
    </Card>
  );
}

function SecretRow({ secretKey, id, onDeleted }: { secretKey: string; id: string; onDeleted: () => void }) {
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    setDeleting(true);
    try {
      await api.delete(`/secrets/${id}`);
      onDeleted();
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="flex items-center justify-between px-4 py-3 border-b border-border last:border-0">
      <span className="font-mono text-sm">{secretKey}</span>
      <div className="flex items-center gap-3">
        <span className="font-mono text-xs text-muted-foreground">••••••••</span>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={handleDelete}
          disabled={deleting}
          className="text-muted-foreground hover:text-destructive"
        >
          <Trash2 className="size-3.5" />
        </Button>
      </div>
    </div>
  );
}

export default function SecretsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { secrets, isLoading, mutate } = useSecrets(id);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <Link href={`/dashboard/projects/${id}`}>
          <Button variant="ghost" size="icon-sm">
            <ArrowLeft className="size-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-xl font-semibold">Secrets</h1>
          <p className="text-sm text-muted-foreground">Environment variables for this project</p>
        </div>
      </div>

      <AddSecretForm projectId={id} onAdded={mutate} />

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : secrets.length === 0 ? (
        <Card className="p-8 text-center text-sm text-muted-foreground">
          No secrets yet. Add one above.
        </Card>
      ) : (
        <Card className="divide-y divide-border overflow-hidden p-0">
          {secrets.map((s) => (
            <SecretRow key={s.id} secretKey={s.key} id={s.id} onDeleted={mutate} />
          ))}
        </Card>
      )}
    </div>
  );
}
