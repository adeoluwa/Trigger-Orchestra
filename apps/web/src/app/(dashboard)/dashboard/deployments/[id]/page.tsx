"use client";

import { use, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ExternalLink, GitCommit, XCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { useDeployment, useDeploymentStream } from "@/hooks/use-deployments";
import { formatDate, formatRelative, cn } from "@/lib/utils";
import { api } from "@/lib/api";
import type { ApiResponse } from "@trigger-orchestra/shared";

const ACTIVE_STATUSES = new Set(["queued", "building", "deploying"]);

const logLevelClass: Record<string, string> = {
  info: "text-foreground",
  warn: "text-yellow-400",
  error: "text-red-400",
};

export default function DeploymentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  const { logs, liveStatus, connected } = useDeploymentStream(id);
  const { deployment, isLoading, mutate } = useDeployment(id, { poll: !connected });

  const logsEndRef = useRef<HTMLDivElement>(null);
  const [cancelling, setCancelling] = useState(false);

  // Refresh deployment record once SSE stream closes after completion
  useEffect(() => {
    if (liveStatus && !ACTIVE_STATUSES.has(liveStatus)) {
      mutate();
    }
  }, [liveStatus]);

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs.length]);

  async function handleCancel() {
    setCancelling(true);
    try {
      await api.post<ApiResponse<unknown>>(`/deployments/${id}/cancel`, {});
      toast.success("Deployment cancelled.");
      mutate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to cancel deployment.");
    } finally {
      setCancelling(false);
    }
  }

  if (isLoading && !deployment) return <p className="text-sm text-muted-foreground">Loading…</p>;
  if (!deployment) return <p className="text-sm text-muted-foreground">Deployment not found.</p>;

  const status = liveStatus ?? deployment.status;
  const isLive = ACTIVE_STATUSES.has(status);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/deployments">
          <Button variant="ghost" size="icon-sm">
            <ArrowLeft className="size-4" />
          </Button>
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2.5 flex-wrap">
            <StatusBadge status={status} />
            <span className="text-sm font-medium truncate">
              {deployment.commitMessage ?? "Manual trigger"}
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            {deployment.platform} · {formatRelative(deployment.createdAt)}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {isLive && (
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 text-destructive hover:text-destructive"
              onClick={handleCancel}
              disabled={cancelling}
            >
              <XCircle className="size-3.5" />
              {cancelling ? "Cancelling…" : "Cancel"}
            </Button>
          )}
          {deployment.platformDeploymentId && (
            <a
              href={`https://dashboard.${deployment.platform}.com/deploys/${deployment.platformDeploymentId}`}
              target="_blank"
              rel="noreferrer"
            >
              <Button variant="outline" size="sm" className="gap-1.5">
                <ExternalLink className="size-3.5" />
                Open on {deployment.platform}
              </Button>
            </a>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {deployment.commitSha && (
          <Card className="p-3 flex flex-col gap-0.5">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground/50">Commit</p>
            <p className="text-xs font-mono flex items-center gap-1.5">
              <GitCommit className="size-3 text-muted-foreground shrink-0" />
              {deployment.commitSha.slice(0, 7)}
            </p>
          </Card>
        )}
        <Card className="p-3 flex flex-col gap-0.5">
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground/50">Platform</p>
          <p className="text-xs capitalize">{deployment.platform}</p>
        </Card>
        {deployment.startedAt && (
          <Card className="p-3 flex flex-col gap-0.5">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground/50">Started</p>
            <p className="text-xs">{formatDate(deployment.startedAt)}</p>
          </Card>
        )}
        {deployment.completedAt && (
          <Card className="p-3 flex flex-col gap-0.5">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground/50">Finished</p>
            <p className="text-xs">{formatDate(deployment.completedAt)}</p>
          </Card>
        )}
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-medium">Logs</h2>
          {connected && (
            <span className="flex items-center gap-1.5 text-xs text-blue-400">
              <span className="size-1.5 rounded-full bg-blue-400 animate-pulse" />
              Live
            </span>
          )}
        </div>
        <Card className="bg-zinc-950 border-zinc-800 p-4 font-mono text-xs leading-5 min-h-48 max-h-[60vh] overflow-y-auto">
          {logs.length === 0 ? (
            <span className="text-zinc-500">{isLive ? "Waiting for logs…" : "No logs recorded."}</span>
          ) : (
            logs.map((log, i) => (
              <div key={log.id ?? i} className={cn("flex gap-3", logLevelClass[log.level] ?? "text-foreground")}>
                <span className="text-zinc-600 shrink-0 select-none">
                  {new Date(log.timestamp).toLocaleTimeString()}
                </span>
                <span className="break-all">{log.message}</span>
              </div>
            ))
          )}
          <div ref={logsEndRef} />
        </Card>
      </div>
    </div>
  );
}
