"use client";

import { use } from "react";
import Link from "next/link";
import { ArrowLeft, GitBranch, Globe, Rocket } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs } from "@/components/ui/tabs";
import { StatusBadge } from "@/components/ui/status-badge";
import { useProject } from "@/hooks/use-projects";
import { useDeployments } from "@/hooks/use-deployments";
import { formatRelative } from "@/lib/utils";
import { api } from "@/lib/api";
import type { ApiResponse, Deployment, TriggerDeploymentRequest } from "@trigger-orchestra/shared";
import { useState } from "react";

function TriggerDialog({ projectId, onTriggered }: { projectId: string; onTriggered: () => void }) {
  const [open, setOpen] = useState(false);
  const [provider, setProvider] = useState<"railway" | "render">("railway");
  const [branch, setBranch] = useState("main");
  const [loading, setLoading] = useState(false);

  async function handleTrigger() {
    setLoading(true);
    try {
      await api.post<ApiResponse<Deployment>>("/deployments", {
        projectId,
        provider,
        branch,
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <Card className="w-full max-w-sm p-6 flex flex-col gap-4">
            <h2 className="text-base font-semibold">Trigger Deployment</h2>
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium">Provider</label>
                <select
                  className="rounded-md border border-input bg-background px-3 py-1.5 text-sm"
                  value={provider}
                  onChange={(e) => setProvider(e.target.value as "railway" | "render")}
                >
                  <option value="railway">Railway</option>
                  <option value="render">Render</option>
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium">Branch</label>
                <input
                  className="rounded-md border border-input bg-background px-3 py-1.5 text-sm"
                  value={branch}
                  onChange={(e) => setBranch(e.target.value)}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={handleTrigger} disabled={loading}>
                {loading ? "Triggering…" : "Deploy"}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </>
  );
}

export default function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { project, isLoading } = useProject(id);
  const { deployments, mutate } = useDeployments(id);

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading…</p>;
  if (!project) return <p className="text-sm text-muted-foreground">Project not found.</p>;

  const recent = deployments.slice(0, 10);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/projects">
          <Button variant="ghost" size="icon-sm">
            <ArrowLeft className="size-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-xl font-semibold">{project.name}</h1>
          {project.description && (
            <p className="text-sm text-muted-foreground">{project.description}</p>
          )}
        </div>
        <TriggerDialog projectId={id} onTriggered={mutate} />
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        {project.repositoryUrl && (
          <Card className="p-3 flex items-center gap-2 text-sm">
            <Globe className="size-4 text-muted-foreground shrink-0" />
            <a href={project.repositoryUrl} target="_blank" rel="noreferrer" className="truncate underline underline-offset-4 text-xs">
              {project.repositoryOwner}/{project.repositoryName}
            </a>
          </Card>
        )}
        {project.defaultBranch && (
          <Card className="p-3 flex items-center gap-2 text-sm">
            <GitBranch className="size-4 text-muted-foreground shrink-0" />
            <span className="text-xs">{project.defaultBranch}</span>
          </Card>
        )}
        <Card className="p-3 flex items-center gap-2 text-sm">
          <span className="text-xs text-muted-foreground">
            {project.environments?.length ?? 0} environment{project.environments?.length !== 1 ? "s" : ""}
          </span>
        </Card>
      </div>

      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium">Recent Deployments</h2>
        <Link href={`/dashboard/projects/${id}/deployments`} className="text-xs text-muted-foreground underline underline-offset-4">
          View all
        </Link>
      </div>

      {recent.length === 0 ? (
        <Card className="p-8 text-center text-sm text-muted-foreground">
          No deployments yet. Click Deploy to trigger one.
        </Card>
      ) : (
        <div className="flex flex-col gap-2">
          {recent.map((d) => (
            <Link key={d.id} href={`/dashboard/deployments/${d.id}`}>
              <Card className="px-4 py-3 flex items-center gap-4 hover:bg-card/80 transition-colors cursor-pointer">
                <StatusBadge status={d.status} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{d.commitMessage ?? "Manual trigger"}</p>
                  <p className="text-xs text-muted-foreground">{d.provider} · {d.branch ?? "—"}</p>
                </div>
                <span className="text-xs text-muted-foreground shrink-0">{formatRelative(d.createdAt)}</span>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
