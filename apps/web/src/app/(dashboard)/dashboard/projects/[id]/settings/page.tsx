"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Save, Trash2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useProject } from "@/hooks/use-projects";
import { updateProject, deleteProject } from "@/hooks/use-projects";
import { api } from "@/lib/api";
import type { ApiResponse, Environment } from "@trigger-orchestra/shared";

type PlatformService = { id: string; name: string; projectName?: string };
type PlatformAccount = { id: string; name: string };

function EnvironmentRow({ env, projectName, onSaved }: { env: Environment; projectName: string; onSaved: () => void }) {
  const [serviceId, setServiceId] = useState(env.platformServiceId ?? "");
  const [branch, setBranch] = useState(env.branch ?? "");
  const [saving, setSaving] = useState(false);

  // browse-existing state
  const [services, setServices] = useState<PlatformService[] | null>(null);
  const [loadingServices, setLoadingServices] = useState(false);

  // create-new state
  const [showCreate, setShowCreate] = useState(false);
  const [newServiceName, setNewServiceName] = useState("");
  const [accounts, setAccounts] = useState<PlatformAccount[] | null>(null);
  const [loadingAccounts, setLoadingAccounts] = useState(false);
  const [platformAccountId, setPlatformAccountId] = useState("");
  const [buildCommand, setBuildCommand] = useState("");
  const [startCommand, setStartCommand] = useState("");
  const [provisioning, setProvisioning] = useState(false);

  async function fetchServices() {
    setLoadingServices(true);
    try {
      const platform = env.platform === "railway" ? "railway" : "render";
      const res = await api.get<ApiResponse<PlatformService[]>>(`/projects/integrations/${platform}/services`);
      setServices(res.data ?? []);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to fetch services.");
    } finally {
      setLoadingServices(false);
    }
  }

  async function fetchAccounts() {
    setLoadingAccounts(true);
    try {
      const path = env.platform === "railway"
        ? "/projects/integrations/railway/projects"
        : "/projects/integrations/render/owners";
      const res = await api.get<ApiResponse<PlatformAccount[]>>(path);
      setAccounts(res.data ?? []);
      if (res.data && res.data.length > 0) setPlatformAccountId(res.data[0].id);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to fetch accounts.");
    } finally {
      setLoadingAccounts(false);
    }
  }

  async function handleProvision() {
    if (!newServiceName.trim() || !platformAccountId) {
      toast.error("Service name and account are required.");
      return;
    }
    setProvisioning(true);
    try {
      const res = await api.post<ApiResponse<Environment>>(`/projects/environments/${env.id}/provision`, {
        name: newServiceName.trim(),
        platformAccountId,
        ...(buildCommand.trim() && { buildCommand: buildCommand.trim() }),
        ...(startCommand.trim() && { startCommand: startCommand.trim() }),
      });
      const newId = (res.data as any)?.platformServiceId ?? "";
      setServiceId(newId);
      setShowCreate(false);
      setNewServiceName("");
      setBuildCommand("");
      setStartCommand("");
      toast.success("Service created and linked.");
      onSaved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create service.");
    } finally {
      setProvisioning(false);
    }
  }

  function openCreate() {
    setShowCreate(true);
    setNewServiceName(`${projectName}-${env.name}`);

    setAccounts(null);
    setPlatformAccountId("");
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await api.patch<ApiResponse<Environment>>(`/projects/environments/${env.id}`, {
        platformServiceId: serviceId.trim() || null,
        branch: branch.trim() || undefined,
      });
      toast.success(`Environment "${env.name}" saved.`);
      onSaved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save environment.");
    } finally {
      setSaving(false);
    }
  }

  const accountLabel = env.platform === "railway" ? "Railway project" : "Render workspace";

  return (
    <form onSubmit={handleSave} className="rounded-lg border border-border bg-background p-3 flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium flex-1">{env.name}</span>
        <span className="text-[10px] uppercase tracking-widest text-muted-foreground/50 font-mono">{env.platform}</span>
        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
          env.status === "deployed" ? "bg-emerald-500/15 text-emerald-400" :
          env.status === "deploying" ? "bg-blue-500/15 text-blue-400" :
          env.status === "failed" ? "bg-red-500/15 text-red-400" :
          "bg-muted text-muted-foreground"
        }`}>{env.status}</span>
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <div className="flex flex-col gap-1">
          <Label className="text-xs">Branch</Label>
          <Input
            value={branch}
            onChange={(e) => setBranch(e.target.value)}
            placeholder="main"
            className="h-7 text-xs font-mono"
          />
        </div>

        <div className="flex flex-col gap-1">
          <Label className="text-xs">Platform service ID</Label>
          <div className="flex gap-1">
            {services && services.length > 0 ? (
              <select
                className="flex-1 h-7 rounded-md border border-input bg-background px-2 text-xs font-mono"
                value={serviceId}
                onChange={(e) => setServiceId(e.target.value)}
              >
                <option value="">— pick a service —</option>
                {services.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.projectName ? `${s.projectName} / ${s.name}` : s.name}
                  </option>
                ))}
              </select>
            ) : (
              <Input
                value={serviceId}
                onChange={(e) => setServiceId(e.target.value)}
                placeholder={env.platform === "railway" ? "Railway service ID" : "srv-xxxxxxxx"}
                className="h-7 text-xs font-mono flex-1"
              />
            )}
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-7 text-xs px-2 shrink-0"
              onClick={fetchServices}
              disabled={loadingServices}
              title="Browse existing services"
            >
              {loadingServices ? "…" : services ? "↺" : "Browse"}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-7 text-xs px-2 shrink-0"
              onClick={openCreate}
              disabled={showCreate}
              title="Create a new service on this platform"
            >
              + New
            </Button>
          </div>
          {services?.length === 0 && (
            <p className="text-[11px] text-muted-foreground">No services found on this account.</p>
          )}
        </div>
      </div>

      {showCreate && (
        <div className="rounded-md border border-dashed border-border bg-muted/30 p-3 flex flex-col gap-2">
          <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-widest">
            Create new {env.platform} service
          </p>

          <div className="flex flex-col gap-1">
            <Label className="text-xs">Service name</Label>
            <Input
              value={newServiceName}
              onChange={(e) => setNewServiceName(e.target.value)}
              placeholder="my-app-staging"
              className="h-7 text-xs"
            />
          </div>

          <div className="flex flex-col gap-1">
            <Label className="text-xs">{accountLabel}</Label>
            <div className="flex gap-1">
              {accounts && accounts.length > 0 ? (
                <select
                  className="flex-1 h-7 rounded-md border border-input bg-background px-2 text-xs font-mono"
                  value={platformAccountId}
                  onChange={(e) => setPlatformAccountId(e.target.value)}
                >
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                </select>
              ) : (
                <Input
                  value={platformAccountId}
                  onChange={(e) => setPlatformAccountId(e.target.value)}
                  placeholder={env.platform === "railway" ? "Railway project ID" : "wrk-xxxxxxxx"}
                  className="h-7 text-xs font-mono flex-1"
                />
              )}
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-7 text-xs px-2 shrink-0"
                onClick={fetchAccounts}
                disabled={loadingAccounts}
                title={`Browse your ${accountLabel.toLowerCase()}s`}
              >
                {loadingAccounts ? "…" : accounts ? "↺" : "Browse"}
              </Button>
            </div>
          </div>

          {env.platform === "render" && (
            <>
              <div className="flex flex-col gap-1">
                <Label className="text-xs">Build command</Label>
                <Input
                  value={buildCommand}
                  onChange={(e) => setBuildCommand(e.target.value)}
                  placeholder="npm install &amp;&amp; npm run build"
                  className="h-7 text-xs font-mono"
                />
              </div>
              <div className="flex flex-col gap-1">
                <Label className="text-xs">Start command</Label>
                <Input
                  value={startCommand}
                  onChange={(e) => setStartCommand(e.target.value)}
                  placeholder="npm start"
                  className="h-7 text-xs font-mono"
                />
              </div>
            </>
          )}

          <div className="flex gap-2 justify-end pt-1">
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-7 text-xs"
              onClick={() => setShowCreate(false)}
              disabled={provisioning}
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              className="h-7 text-xs gap-1"
              onClick={handleProvision}
              disabled={provisioning || !newServiceName.trim() || !platformAccountId}
            >
              {provisioning ? "Creating…" : "Create & link"}
            </Button>
          </div>
        </div>
      )}

      <div className="flex justify-end">
        <Button type="submit" size="sm" variant="outline" className="gap-1.5 h-7 text-xs" disabled={saving || !serviceId || showCreate}>
          <Save className="size-3" />
          {saving ? "Saving…" : "Save"}
        </Button>
      </div>
    </form>
  );
}

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

      {/* Environments */}
      {project.environments && project.environments.length > 0 && (
        <section className="flex flex-col gap-4 rounded-xl border border-border bg-card p-5">
          <div>
            <h2 className="text-sm font-semibold">Environments</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Set the platform service ID for each environment so deployments know which service to target.
            </p>
          </div>

          <div className="flex flex-col gap-3">
            {project.environments.map((env) => (
              <EnvironmentRow key={env.id} env={env} projectName={project.name} onSaved={mutate} />
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
