"use client";

import Link from "next/link";
import { Rocket } from "lucide-react";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { useDeployments } from "@/hooks/use-deployments";
import { formatRelative } from "@/lib/utils";
import type { DeploymentStatus } from "@trigger-orchestra/shared";
import { useState } from "react";

const ALL_STATUSES: DeploymentStatus[] = ["pending", "queued", "running", "success", "failed", "cancelled"];

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
        {["all", ...ALL_STATUSES].map((s) => (
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
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : filtered.length === 0 ? (
        <Card className="p-12 text-center">
          <Rocket className="size-10 mx-auto text-muted-foreground mb-3" />
          <p className="text-sm font-medium">No deployments</p>
        </Card>
      ) : (
        <div className="flex flex-col gap-2">
          {filtered.map((d) => (
            <Link key={d.id} href={`/dashboard/deployments/${d.id}`}>
              <Card className="px-4 py-3 flex items-center gap-4 hover:bg-card/80 transition-colors cursor-pointer">
                <StatusBadge status={d.status} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{d.commitMessage ?? "Manual trigger"}</p>
                  <p className="text-xs text-muted-foreground">
                    {d.provider} · {d.branch ?? "—"} · {d.commitSha?.slice(0, 7) ?? "—"}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs text-muted-foreground">{formatRelative(d.createdAt)}</p>
                  {d.providerDeploymentUrl && (
                    <a
                      href={d.providerDeploymentUrl}
                      target="_blank"
                      rel="noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="text-xs underline underline-offset-4 text-muted-foreground"
                    >
                      View on {d.provider}
                    </a>
                  )}
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
