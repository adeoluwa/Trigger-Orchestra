"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Save, Trash2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useProject } from "@/hooks/use-projects";
import { updateProject, deleteProject } from "@/hooks/use-projects";

export default function ProjectSettingsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { project, isLoading, mutate } = useProject(id);

  const [name, setName] = useState("");
  const [repoUrl, setRepoUrl] = useState("");
  const [configPath, setConfigPath] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);

  // Populate form once project loads
  if (project && !initialized) {
    setName(project.name);
    setRepoUrl(project.repoUrl);
    setConfigPath(project.configPath ?? "");
    setInitialized(true);
  }

  async function handleSave(e: { preventDefault(): void }) {
    e.preventDefault();
    setSaving(true);
    setSaveError(null);
    try {
      await updateProject(id, {
        name: name || undefined,
        repoUrl: repoUrl || undefined,
        configPath: configPath || undefined,
      });
      await mutate();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      await deleteProject(id);
      router.push("/dashboard/projects");
    } finally {
      setDeleting(false);
    }
  }

  if (isLoading) {
    return <div className="h-64 rounded-xl bg-card border border-border animate-pulse" />;
  }
  if (!project) return <p className="text-sm text-muted-foreground">Project not found.</p>;

  return (
    <div className="flex flex-col gap-8 max-w-xl">
      <div className="flex items-center gap-3">
        <Link href={`/dashboard/projects/${id}`}>
          <Button variant="ghost" size="icon-sm">
            <ArrowLeft className="size-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Project settings</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{project.name}</p>
        </div>
      </div>

      {/* General settings */}
      <section className="flex flex-col gap-4 rounded-xl border border-border bg-card p-5">
        <h2 className="text-sm font-semibold">General</h2>
        <form onSubmit={handleSave} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="s-name">Project name</Label>
            <Input
              id="s-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="my-app"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="s-repo">Repository URL</Label>
            <Input
              id="s-repo"
              type="url"
              value={repoUrl}
              onChange={(e) => setRepoUrl(e.target.value)}
              placeholder="https://github.com/you/repo"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="s-config">
              Config path
              <span className="ml-1 text-muted-foreground/60 font-normal">(defaults to trigger.yml)</span>
            </Label>
            <Input
              id="s-config"
              value={configPath}
              onChange={(e) => setConfigPath(e.target.value)}
              placeholder="trigger.yml"
            />
          </div>
          {saveError && <p className="text-xs text-destructive">{saveError}</p>}
          <div className="flex justify-end">
            <Button type="submit" size="sm" className="gap-1.5" disabled={saving}>
              <Save className="size-3.5" />
              {saving ? "Saving…" : "Save changes"}
            </Button>
          </div>
        </form>
      </section>

      {/* Environments info */}
      {project.environments && project.environments.length > 0 && (
        <section className="flex flex-col gap-3 rounded-xl border border-border bg-card p-5">
          <h2 className="text-sm font-semibold">Environments</h2>
          <p className="text-xs text-muted-foreground">
            Environments are defined in your <code className="font-mono text-primary">{project.configPath || "trigger.yml"}</code> file and auto-synced when the project is updated.
          </p>
          <div className="flex flex-col gap-2">
            {project.environments.map((env) => (
              <div key={env.id} className="flex items-center justify-between rounded-lg border border-border bg-background px-3 py-2">
                <span className="text-sm font-medium">{env.name}</span>
                <span className="text-xs text-muted-foreground font-mono">{env.id.slice(0, 8)}…</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Danger zone */}
      <section className="flex flex-col gap-4 rounded-xl border border-destructive/30 bg-destructive/5 p-5">
        <div className="flex items-center gap-2">
          <AlertTriangle className="size-4 text-destructive" />
          <h2 className="text-sm font-semibold text-destructive">Danger zone</h2>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Delete this project</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Permanently deletes all deployments, secrets, and environments.
            </p>
          </div>
          {confirmDelete ? (
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setConfirmDelete(false)}>
                Cancel
              </Button>
              <Button
                size="sm"
                className="bg-destructive text-white hover:bg-destructive/80 gap-1.5"
                disabled={deleting}
                onClick={handleDelete}
              >
                <Trash2 className="size-3.5" />
                {deleting ? "Deleting…" : "Confirm delete"}
              </Button>
            </div>
          ) : (
            <Button
              variant="outline"
              size="sm"
              className="border-destructive/40 text-destructive hover:bg-destructive/10"
              onClick={() => setConfirmDelete(true)}
            >
              Delete project
            </Button>
          )}
        </div>
      </section>
    </div>
  );
}
