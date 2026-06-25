"use client";

import Link from "next/link";
import { Rocket, ArrowRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { useDeployments } from "@/hooks/use-deployments";
import { formatRelative } from "@/lib/utils";
import type { Deployment, DeploymentStatus } from "@trigger-orchestra/shared";
import { useState } from "react";

const ALL_STATUSES: DeploymentStatus[] = ["queued", "building", "deploying", "success", "failed", "cancelled"];

function DeploymentCard({ d }: { d: Deployment }) {
  return (
    <Link href={`/dashboard/deployments/${d.id}`}>
      <div className="group relative flex flex-col gap-4 rounded-xl border border-border bg-card p-5 hover:border-primary/30 hover:bg-card/80 transition-all duration-150 h-full cursor-pointer">
        <div className="flex items-start gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 ring-1 ring-primary/20">
            <Rocket className="size-4 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold truncate">{d.commitMessage ?? "Manual trigger"}</p>
            <p className="text-xs text-muted-foreground/50 mt-0.5 truncate font-mono">
              {d.platform}{d.commitSha ? ` · ${d.commitSha.slice(0, 7)}` : ""}
            </p>
          </div>
          <span className="shrink-0">
            <StatusBadge status={d.status} />
          </span>
        </div>

        <div className="flex items-center justify-between mt-auto pt-2 border-t border-border/50">
          <p className="text-xs text-muted-foreground/60">{formatRelative(d.createdAt)}</p>
          <ArrowRight className="size-3.5 text-muted-foreground/30 group-hover:text-primary transition-colors" />
        </div>
      </div>
    </Link>
  );
}

export default function DeploymentsPage() {
  const { deployments, isLoading } = useDeployments();
  const [filter, setFilter] = useState<DeploymentStatus | "all">("all");

  const filtered = filter === "all" ? deployments : deployments.filter((d) => d.status === filter);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold">Deployments</h1>
        <p className="text-sm text-muted-foreground">{deployments.length} total</p>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {(["all", ...ALL_STATUSES] as const).map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s as DeploymentStatus | "all")}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              filter === s
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            {s === "all" ? "All" : s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-40 rounded-xl bg-card border border-border animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card className="p-12 text-center">
          <Rocket className="size-10 mx-auto text-muted-foreground mb-3" />
          <p className="text-sm font-medium">No deployments</p>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((d) => (
            <DeploymentCard key={d.id} d={d} />
          ))}
        </div>
      )}
    </div>
  );
}
