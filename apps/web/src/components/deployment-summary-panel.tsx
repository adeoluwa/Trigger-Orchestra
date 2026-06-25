"use client";

import Link from "next/link";
import { GitBranch, ArrowRight, AlertTriangle, Webhook, ShieldCheck } from "lucide-react";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { useDeploymentSummary } from "@/hooks/use-deployments";
import { formatRelative } from "@/lib/utils";

function formatDuration(ms: number | null): string | null {
  if (ms == null || ms < 0) return null;
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return rem ? `${m}m ${rem}s` : `${m}m`;
}

export function DeploymentSummaryPanel({ projectId }: { projectId: string }) {
  const { summary, isLoading } = useDeploymentSummary(projectId);

  if (isLoading) {
    return <div className="h-40 rounded-xl bg-card border border-border animate-pulse" />;
  }
  if (!summary || summary.environments.length === 0) return null;

  return (
    <section className="flex flex-col gap-4 rounded-xl border border-border bg-card p-5">
      <div>
        <h2 className="text-sm font-semibold">Deployment summary</h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          What deploys where — each branch maps to one environment, platform, and service.
        </p>
      </div>

      <div className="flex flex-col gap-2.5">
        {summary.environments.map((env) => {
          const duration = formatDuration(env.lastDeployment?.durationMs ?? null);
          return (
            <div
              key={env.environmentId}
              className="rounded-lg border border-border bg-background p-3 flex flex-col gap-2.5"
            >
              {/* Environment + flags */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-medium">{env.name}</span>
                {env.isProduction && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium bg-amber-500/15 text-amber-400">
                    production
                  </span>
                )}
                {env.requiresStagingGate && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium bg-purple-500/15 text-purple-300 inline-flex items-center gap-1">
                    <ShieldCheck className="size-3" />
                    staging gate
                  </span>
                )}
                {!env.autoDeploy && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium bg-muted text-muted-foreground">
                    manual only
                  </span>
                )}
              </div>

              {/* branch -> platform -> service */}
              <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                <span className="inline-flex items-center gap-1 font-mono text-foreground">
                  <GitBranch className="size-3.5" />
                  {env.branch || <span className="text-muted-foreground italic">no branch</span>}
                </span>
                <ArrowRight className="size-3 shrink-0" />
                <span className="capitalize text-foreground">{env.platform}</span>
                <span>·</span>
                {env.configured ? (
                  <span className="font-mono truncate max-w-[200px]" title={env.platformServiceId ?? ""}>
                    {env.platformServiceId}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-amber-400">
                    <AlertTriangle className="size-3" />
                    no service linked
                  </span>
                )}
              </div>

              {/* ambiguous branch warning */}
              {env.ambiguousBranch && (
                <p className="text-[11px] text-amber-400 inline-flex items-center gap-1">
                  <AlertTriangle className="size-3 shrink-0" />
                  Branch <span className="font-mono">{env.branch}</span> is mapped to more than one
                  environment — a push will only deploy the first match.
                </p>
              )}

              {/* last deployment (mini run report) */}
              {env.lastDeployment ? (
                <Link
                  href={`/dashboard/deployments/${env.lastDeployment.id}`}
                  className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  <StatusBadge status={env.lastDeployment.status} />
                  <span className="font-mono">{env.lastDeployment.commitSha.slice(0, 7)}</span>
                  <span className="truncate flex-1 min-w-0">{env.lastDeployment.commitMessage}</span>
                  {duration && <span className="shrink-0">{duration}</span>}
                  <span className="shrink-0">{formatRelative(env.lastDeployment.startedAt)}</span>
                </Link>
              ) : (
                <p className="text-xs text-muted-foreground/60">No deployments yet.</p>
              )}
            </div>
          );
        })}
      </div>

      {/* Webhook */}
      <div className="flex items-start gap-2 text-[11px] text-muted-foreground border-t border-border pt-3">
        <Webhook className="size-3.5 shrink-0 mt-0.5" />
        <span>
          GitHub pushes to the branches above auto-deploy via{" "}
          <span className="font-mono break-all">{summary.webhookUrl}</span>
        </span>
      </div>
    </section>
  );
}
