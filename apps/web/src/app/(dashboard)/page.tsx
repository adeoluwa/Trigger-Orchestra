"use client";

import { FolderGit2, Rocket, CheckCircle, XCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { useProjects } from "@/hooks/use-projects";
import { useDeployments } from "@/hooks/use-deployments";
import { formatRelative } from "@/lib/utils";
import Link from "next/link";

function StatCard({ label, value, icon: Icon }: { label: string; value: number; icon: React.ElementType }) {
  return (
    <Card className="p-5 flex items-center gap-4">
      <div className="rounded-lg bg-muted p-2.5">
        <Icon className="size-5 text-muted-foreground" />
      </div>
      <div>
        <p className="text-2xl font-bold">{value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>
    </Card>
  );
}

export default function DashboardPage() {
  const { projects, isLoading: loadingProjects } = useProjects();
  const { deployments, isLoading: loadingDeployments } = useDeployments();

  const successful = deployments.filter((d) => d.status === "success").length;
  const failed = deployments.filter((d) => d.status === "failed").length;
  const recent = deployments.slice(0, 8);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold">Overview</h1>
        <p className="text-sm text-muted-foreground">Your deployment activity at a glance</p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Projects" value={projects.length} icon={FolderGit2} />
        <StatCard label="Total Deployments" value={deployments.length} icon={Rocket} />
        <StatCard label="Successful" value={successful} icon={CheckCircle} />
        <StatCard label="Failed" value={failed} icon={XCircle} />
      </div>

      <div>
        <h2 className="text-sm font-medium mb-3">Recent Deployments</h2>
        {loadingDeployments ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : recent.length === 0 ? (
          <Card className="p-8 text-center text-sm text-muted-foreground">
            No deployments yet.{" "}
            <Link href="/dashboard/projects" className="underline underline-offset-4 text-foreground">
              Create a project
            </Link>{" "}
            to get started.
          </Card>
        ) : (
          <div className="flex flex-col gap-2">
            {recent.map((d) => (
              <Link key={d.id} href={`/dashboard/deployments/${d.id}`}>
                <Card className="px-4 py-3 flex items-center gap-4 hover:bg-card/80 transition-colors cursor-pointer">
                  <StatusBadge status={d.status} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{d.commitMessage ?? "—"}</p>
                    <p className="text-xs text-muted-foreground">
                      {d.provider} · {d.branch ?? "—"}
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0">
                    {formatRelative(d.createdAt)}
                  </span>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
