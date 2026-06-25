"use client";

import { use, useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Plus, Trash2, ClipboardPaste, X, Eye, EyeOff, Pencil, Check } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useSecrets } from "@/hooks/use-secrets";
import { useProject } from "@/hooks/use-projects";
import { api } from "@/lib/api";
import type { ApiResponse, CreateSecretRequest } from "@trigger-orchestra/shared";

/** Parse .env file content into key-value pairs, skipping comments and blank lines. */
function parseEnv(raw: string): Array<{ key: string; value: string }> {
  return raw
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#"))
    .flatMap((line) => {
      const eqIdx = line.indexOf("=");
      if (eqIdx === -1) return [];
      const key = line.slice(0, eqIdx).trim();
      if (!key) return [];
      let value = line.slice(eqIdx + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      } else {
        const commentIdx = value.indexOf(" #");
        if (commentIdx !== -1) value = value.slice(0, commentIdx).trim();
      }
      return [{ key, value }];
    });
}

function AddSecretForm({
  projectId,
  environments,
  onAdded,
}: {
  projectId: string;
  environments: { id: string; name: string }[];
  onAdded: () => void;
}) {
  const [mode, setMode] = useState<"single" | "bulk">("single");
  const [selectedEnvIds, setSelectedEnvIds] = useState<string[]>([]);

  useEffect(() => {
    if (environments.length > 0 && selectedEnvIds.length === 0) {
      setSelectedEnvIds(environments.map((e) => e.id));
    }
  }, [environments]);

  function toggleEnv(id: string) {
    setSelectedEnvIds((prev) =>
      prev.includes(id) ? prev.filter((e) => e !== id) : [...prev, id]
    );
  }

  const [key, setKey] = useState("");
  const [value, setValue] = useState("");
  const [loading, setLoading] = useState(false);

  const [envText, setEnvText] = useState("");
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkError, setBulkError] = useState<string | null>(null);

  async function handleSingleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (selectedEnvIds.length === 0) {
      toast.error("Select at least one environment.");
      return;
    }
    setLoading(true);
    try {
      await Promise.all(
        selectedEnvIds.map((environmentId) =>
          api.post<ApiResponse<unknown>>("/secrets", {
            key,
            value,
            projectId,
            environmentId,
          } satisfies CreateSecretRequest)
        )
      );
      toast.success(`Secret "${key}" saved to ${selectedEnvIds.length} environment${selectedEnvIds.length > 1 ? "s" : ""}.`);
      setKey("");
      setValue("");
      onAdded();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save secret.");
    } finally {
      setLoading(false);
    }
  }

  async function handleBulkSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBulkError(null);
    if (selectedEnvIds.length === 0) {
      setBulkError("Select at least one environment.");
      return;
    }
    const pairs = parseEnv(envText);
    if (pairs.length === 0) {
      setBulkError("No valid KEY=VALUE pairs found.");
      return;
    }
    setBulkLoading(true);
    try {
      await Promise.all(
        selectedEnvIds.flatMap((environmentId) =>
          pairs.map(({ key: k, value: v }) =>
            api.post<ApiResponse<unknown>>("/secrets", {
              key: k,
              value: v,
              projectId,
              environmentId,
            } satisfies CreateSecretRequest)
          )
        )
      );
      toast.success(
        `${pairs.length} secret${pairs.length > 1 ? "s" : ""} imported to ${selectedEnvIds.length} environment${selectedEnvIds.length > 1 ? "s" : ""}.`
      );
      setEnvText("");
      onAdded();
    } catch {
      setBulkError("One or more secrets failed to save. Check for duplicates.");
    } finally {
      setBulkLoading(false);
    }
  }

  const parsed = parseEnv(envText);

  return (
    <Card className="p-4 flex flex-col gap-4">
      {environments.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No environments found. Create one in project settings first.
        </p>
      ) : (
        <div className="flex flex-col gap-1.5">
          <Label>Add to environments</Label>
          <div className="flex flex-wrap gap-2">
            {environments.map((env) => {
              const checked = selectedEnvIds.includes(env.id);
              return (
                <button
                  key={env.id}
                  type="button"
                  onClick={() => toggleEnv(env.id)}
                  className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                    checked
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background text-muted-foreground border-border hover:border-primary/50"
                  }`}
                >
                  {env.name}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="flex gap-1 self-start bg-muted rounded-md p-1">
        <button
          type="button"
          onClick={() => setMode("single")}
          className={`text-xs px-3 py-1 rounded transition-colors ${
            mode === "single"
              ? "bg-background shadow text-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <span className="flex items-center gap-1.5">
            <Plus className="size-3" />
            Single
          </span>
        </button>
        <button
          type="button"
          onClick={() => setMode("bulk")}
          className={`text-xs px-3 py-1 rounded transition-colors ${
            mode === "bulk"
              ? "bg-background shadow text-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <span className="flex items-center gap-1.5">
            <ClipboardPaste className="size-3" />
            Paste .env
          </span>
        </button>
      </div>

      {mode === "single" ? (
        <form onSubmit={handleSingleSubmit} className="flex gap-3 items-end">
          <div className="flex flex-col gap-1.5 flex-1">
            <Label htmlFor="secret-key">Key</Label>
            <Input
              id="secret-key"
              value={key}
              onChange={(e) => setKey(e.target.value.toUpperCase())}
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
          <Button type="submit" size="sm" className="gap-1.5 shrink-0" disabled={loading || selectedEnvIds.length === 0}>
            <Plus className="size-4" />
            {loading ? "Adding…" : "Add"}
          </Button>
        </form>
      ) : (
        <form onSubmit={handleBulkSubmit} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="env-paste">Paste .env content</Label>
            <Textarea
              id="env-paste"
              value={envText}
              onChange={(e) => {
                setEnvText(e.target.value);
                setBulkError(null);
              }}
              placeholder={"DATABASE_URL=postgres://user:pass@host/db\nREDIS_URL=redis://localhost:6379\nSECRET_KEY=my-secret"}
              className="font-mono text-sm min-h-[120px] resize-y"
            />
          </div>

          {envText.trim() && (
            <div className="rounded-md border border-border bg-muted/40 px-3 py-2 flex flex-col gap-1">
              <p className="text-xs text-muted-foreground mb-1">
                {parsed.length} variable{parsed.length !== 1 ? "s" : ""} detected
              </p>
              {parsed.map(({ key: k }) => (
                <span key={k} className="font-mono text-xs text-foreground">{k}</span>
              ))}
              {parsed.length === 0 && (
                <span className="text-xs text-muted-foreground italic">No valid KEY=VALUE pairs found</span>
              )}
            </div>
          )}

          {bulkError && (
            <p className="text-xs text-destructive flex items-center gap-1">
              <X className="size-3" />
              {bulkError}
            </p>
          )}

          <Button
            type="submit"
            size="sm"
            className="gap-1.5 self-start"
            disabled={bulkLoading || parsed.length === 0 || selectedEnvIds.length === 0}
          >
            <ClipboardPaste className="size-4" />
            {bulkLoading
              ? "Importing…"
              : `Import ${parsed.length > 0 ? parsed.length : ""} Secret${parsed.length !== 1 ? "s" : ""}${selectedEnvIds.length > 1 ? ` → ${selectedEnvIds.length} envs` : ""}`}
          </Button>
        </form>
      )}
    </Card>
  );
}

function SecretRow({
  secretKey,
  id,
  projectId,
  environmentId,
  onDeleted,
  onEdited,
}: {
  secretKey: string;
  id: string;
  projectId: string;
  environmentId: string;
  onDeleted: () => void;
  onEdited: () => void;
}) {
  const [deleting, setDeleting] = useState(false);
  const [revealed, setRevealed] = useState<string | null>(null);
  const [revealing, setRevealing] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleReveal() {
    if (revealed !== null) {
      setRevealed(null);
      return;
    }
    setRevealing(true);
    try {
      const res = await api.get<ApiResponse<{ value: string }>>(`/secrets/${id}/reveal`);
      setRevealed(res.data?.value ?? "");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to reveal secret.");
    } finally {
      setRevealing(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      await api.delete(`/secrets/${id}?projectId=${projectId}`);
      toast.success(`Secret "${secretKey}" deleted.`);
      onDeleted();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete secret.");
    } finally {
      setDeleting(false);
    }
  }

  async function handleSaveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editValue) return;
    setSaving(true);
    try {
      await api.post<ApiResponse<unknown>>("/secrets", {
        key: secretKey,
        value: editValue,
        projectId,
        environmentId,
      });
      toast.success(`Secret "${secretKey}" updated.`);
      setEditing(false);
      setEditValue("");
      setRevealed(null);
      onEdited();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update secret.");
    } finally {
      setSaving(false);
    }
  }

  if (editing) {
    return (
      <form onSubmit={handleSaveEdit} className="flex items-center gap-2 px-4 py-2.5 border-b border-border last:border-0">
        <span className="font-mono text-sm flex-1">{secretKey}</span>
        <Input
          autoFocus
          type="password"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          placeholder="New value"
          className="font-mono text-sm h-7 w-48"
          required
        />
        <Button type="submit" size="icon-sm" variant="ghost" disabled={saving} title="Save">
          <Check className="size-3.5 text-emerald-500" />
        </Button>
        <Button
          type="button"
          size="icon-sm"
          variant="ghost"
          onClick={() => { setEditing(false); setEditValue(""); }}
          title="Cancel"
        >
          <X className="size-3.5" />
        </Button>
      </form>
    );
  }

  return (
    <div className="flex items-center gap-3 px-4 py-3 border-b border-border last:border-0">
      <span className="font-mono text-sm flex-1">{secretKey}</span>
      <span className="font-mono text-xs text-muted-foreground select-all">
        {revealed !== null ? revealed : "••••••••"}
      </span>
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={handleReveal}
          disabled={revealing}
          className="text-muted-foreground hover:text-foreground"
          title={revealed ? "Hide" : "Reveal"}
        >
          {revealed ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => setEditing(true)}
          className="text-muted-foreground hover:text-foreground"
          title="Edit"
        >
          <Pencil className="size-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={handleDelete}
          disabled={deleting}
          className="text-muted-foreground hover:text-destructive"
          title="Delete"
        >
          <Trash2 className="size-3.5" />
        </Button>
      </div>
    </div>
  );
}

export default function SecretsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { project } = useProject(id);
  const environments = project?.environments ?? [];

  const [viewEnvId, setViewEnvId] = useState<string | null>(null);

  useEffect(() => {
    if (environments.length > 0 && viewEnvId === null) {
      setViewEnvId(environments[0].id);
    }
  }, [environments]);

  const { secrets, isLoading, mutate } = useSecrets(viewEnvId);

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

      <AddSecretForm projectId={id} environments={environments} onAdded={mutate} />

      {/* Environment tabs for listing */}
      {environments.length > 1 && (
        <div className="flex gap-1 border-b border-border">
          {environments.map((env) => (
            <button
              key={env.id}
              type="button"
              onClick={() => setViewEnvId(env.id)}
              className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                viewEnvId === env.id
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {env.name}
            </button>
          ))}
        </div>
      )}

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : secrets.length === 0 ? (
        <Card className="p-8 text-center text-sm text-muted-foreground">
          No secrets yet. Add one above.
        </Card>
      ) : (
        <Card className="divide-y divide-border overflow-hidden p-0">
          {secrets.map((s) => (
            <SecretRow
              key={s.id}
              secretKey={s.key}
              id={s.id}
              projectId={id}
              environmentId={s.environmentId ?? viewEnvId ?? ""}
              onDeleted={mutate}
              onEdited={mutate}
            />
          ))}
        </Card>
      )}
    </div>
  );
}
