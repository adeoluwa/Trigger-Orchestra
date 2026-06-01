"use client";

import { use, useEffect, useRef } from "react";
import Link from "next/link";
import { ArrowLeft, ExternalLink, GitCommit, GitBranch } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { useDeployment, useDeploymentLogs } from "@/hooks/use-deployments";
import { formatDate, formatRelative, cn } from "@/lib/utils";

const logLevelClass: Record<string, string> = {
  info: "text-foreground",
  warn: "text-yellow-400",
  error: "text-red-400",
};

export default function DeploymentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { deployment, isLoading } = useDeployment(id);
  const { logs } = useDeploymentLogs(id);
  const logsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs.length]);

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading…</p>;
  if (!deployment) return <p className="text-sm text-muted-foreground">Deployment not found.</p>;

  const isLive = deployment.status === "running" || deployment.status === "queued" || deployment.status === "pending";

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
            <StatusBadge status={deployment.status} />
            <span className="text-sm font-medium truncate">
              {deployment.commitMessage ?? "Manual trigger"}
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            {deployment.provider} · {formatRelative(deployment.createdAt)}
          </p>
        </div>
        {deployment.providerDeploymentUrl && (
          <a href={deployment.providerDeploymentUrl} target="_blank" rel="noreferrer">
            <Button variant="outline" size="sm" className="gap-1.5 shrink-0">
              <ExternalLink className="size-3.5" />
              Open on {deployment.provider}
            </Button>
          </a>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 text-xs">
        {deployment.branch && (
          <Card className="p-3 flex items-center gap-2">
            <GitBranch className="size-3.5 text-muted-foreground shrink-0" />
            <span>{deployment.branch}</span>
          </Card>
        )}
        {deployment.commitSha && (
          <Card className="p-3 flex items-center gap-2">
            <GitCommit className="size-3.5 text-muted-foreground shrink-0" />
            <span className="font-mono">{deployment.commitSha.slice(0, 7)}</span>
          </Card>
        )}
        {deployment.startedAt && (
          <Card className="p-3 flex flex-col gap-0.5">
            <span className="text-muted-foreground">Started</span>
            <span>{formatDate(deployment.startedAt)}</span>
          </Card>
        )}
        {deployment.finishedAt && (
          <Card className="p-3 flex flex-col gap-0.5">
            <span className="text-muted-foreground">Finished</span>
            <span>{formatDate(deployment.finishedAt)}</span>
          </Card>
        )}
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-medium">Logs</h2>
          {isLive && (
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
            logs.map((log) => (
              <div key={log.id} className={cn("flex gap-3", logLevelClass[log.level] ?? "text-foreground")}>
                <span className="text-zinc-600 shrink-0 select-none">
                  {new Date(log.createdAt).toLocaleTimeString()}
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
