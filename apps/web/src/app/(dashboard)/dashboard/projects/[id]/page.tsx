"use client";

import { use, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Globe, Rocket, ArrowRight, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { useProject } from "@/hooks/use-projects";
import { useDeployments } from "@/hooks/use-deployments";
import { formatRelative } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";
import type { ApiResponse, Deployment, TriggerDeploymentRequest } from "@trigger-orchestra/shared";

function TriggerDialog({
  projectId,
  environments,
  onTriggered,
}: {
  projectId: string;
  environments: { id: string; name: string }[];
  onTriggered: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [environmentId, setEnvironmentId] = useState(environments[0]?.id ?? "");
  const [loading, setLoading] = useState(false);

  async function handleTrigger() {
    if (!environmentId) return;
    setLoading(true);
    try {
      await api.post<ApiResponse<Deployment>>("/deployments", {
        projectId,
        environmentId,
      } satisfies TriggerDeploymentRequest);
      setOpen(false);
      onTriggered();
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Button size="sm" className="gap-1.5" onClick={() => setOpen(true)}>
        <Rocket className="size-4" />
        Deploy
      </Button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-xl border border-border bg-card shadow-2xl p-6 flex flex-col gap-5">
            <div className="flex items-center gap-3">
              <div className="flex size-9 items-center justify-center rounded-lg bg-primary/15 ring-1 ring-primary/20">
                <Rocket className="size-5 text-primary" />
              </div>
              <div>
                <h2 className="text-base font-semibold">Trigger Deployment</h2>
                <p className="text-xs text-muted-foreground">Select an environment to deploy to</p>
              </div>
            </div>

            {environments.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No environments found. Create one in your project settings first.
              </p>
            ) : (
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium">Environment</label>
                <select
                  className="rounded-lg border border-input bg-background px-3 py-2 text-sm"
                  value={environmentId}
                  onChange={(e) => setEnvironmentId(e.target.value)}
                >
                  {environments.map((env) => (
                    <option key={env.id} value={env.id}>{env.name}</option>
                  ))}
                </select>
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button
                onClick={handleTrigger}
                disabled={loading || environments.length === 0}
              >
                {loading ? "Triggering…" : "Deploy now"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

const statusBorderColor: Record<string, string> = {
  success:   "border-l-emerald-500",
  failed:    "border-l-red-500",
  running:   "border-l-blue-500",
  queued:    "border-l-blue-400",
  pending:   "border-l-yellow-500",
  cancelled: "border-l-zinc-500",
};

export default function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { project, isLoading } = useProject(id);
  const { deployments, mutate } = useDeployments(id);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 rounded-lg bg-card animate-pulse" />
        <div className="h-24 rounded-xl bg-card animate-pulse" />
      </div>
    );
  }
  if (!project) return <p className="text-sm text-muted-foreground">Project not found.</p>;

  const recent = deployments.slice(0, 10);
  const environments = project.environments ?? [];

  return (
    <div className="flex flex-col gap-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/dashboard/projects">
          <Button variant="ghost" size="icon-sm">
            <ArrowLeft className="size-4" />
          </Button>
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold tracking-tight truncate">{project.name}</h1>
          <a
            href={project.repoUrl}
            target="_blank"
            rel="noreferrer"
            className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 w-fit transition-colors"
          >
            <Globe className="size-3" />
            {(() => { try { return new URL(project.repoUrl).pathname.replace(/^\//, "") } catch { return project.repoUrl } })()}
          </a>
        </div>
        <Link href={`/dashboard/projects/${id}/settings`}>
          <Button variant="outline" size="icon-sm" title="Settings">
            <Settings className="size-4" />
          </Button>
        </Link>
        <TriggerDialog projectId={id} environments={environments} onTriggered={mutate} />
      </div>

      {/* Meta cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Card className="p-3 flex flex-col gap-0.5">
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground/50">Repository</p>
          <a
            href={project.repoUrl}
            target="_blank"
            rel="noreferrer"
            className="text-xs font-mono truncate hover:underline"
          >
            {project.repoUrl}
          </a>
        </Card>
        <Card className="p-3 flex flex-col gap-0.5">
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground/50">Config</p>
          <p className="text-xs font-mono">{project.configPath || "trigger.yml"}</p>
        </Card>
        <Card className="p-3 flex flex-col gap-0.5">
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground/50">Environments</p>
          <p className="text-xs">{environments.length} environment{environments.length !== 1 ? "s" : ""}</p>
        </Card>
      </div>

      {/* Deployments */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold">Recent Deployments</h2>
          <Link
            href={`/dashboard/deployments`}
            className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
          >
            View all <ArrowRight className="size-3" />
          </Link>
        </div>

        {recent.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card/50 py-12 text-center">
            <Rocket className="size-8 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">No deployments yet — click Deploy to trigger one.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {recent.map((d) => (
              <Link key={d.id} href={`/dashboard/deployments/${d.id}`}>
                <div className={cn(
                  "group flex items-center gap-4 rounded-lg border border-border bg-card px-4 py-3",
                  "border-l-2 hover:bg-card/80 transition-all duration-150",
                  statusBorderColor[d.status] ?? "border-l-zinc-500"
                )}>
                  <StatusBadge status={d.status} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{d.commitMessage ?? "Manual trigger"}</p>
                    <p className="text-xs text-muted-foreground">
                      {d.provider && <span className="capitalize">{d.provider}</span>}
                      {d.branch && <> · <span className="font-mono">{d.branch}</span></>}
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0">{formatRelative(d.createdAt)}</span>
                  <ArrowRight className="size-3.5 text-muted-foreground/30 group-hover:text-muted-foreground transition-colors shrink-0" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
