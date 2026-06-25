"use client";

import Link from "next/link";
import {
  FolderGit2, Rocket, CheckCircle, XCircle, ArrowRight,
  RefreshCw, TrendingUp, Activity, GitFork,
} from "lucide-react";
import { StatusBadge } from "@/components/ui/status-badge";
import { useProjects } from "@/hooks/use-projects";
import { useDeployments } from "@/hooks/use-deployments";
import { useAuth } from "@/hooks/use-auth";
import { useMounted } from "@/hooks/use-mounted";
import { formatRelative, cn } from "@/lib/utils";
import type { DeploymentStatus } from "@trigger-orchestra/shared";

const statusBorderColor: Record<DeploymentStatus, string> = {
  success:   "border-l-emerald-500",
  failed:    "border-l-red-500",
  deploying: "border-l-blue-500",
  building:  "border-l-yellow-500",
  queued:    "border-l-blue-400",
  cancelled: "border-l-zinc-500",
};

/* ── Stat card ── */
function StatCard({
  label, value, icon: Icon, accent, sublabel,
}: {
  label: string; value: number | string;
  icon: React.ElementType; accent: string; sublabel?: string;
}) {
  return (
    <div className="relative overflow-hidden rounded-xl border border-border bg-card p-5 flex flex-col gap-3 hover:border-border/80 transition-colors">
      <div className={cn("flex size-9 items-center justify-center rounded-lg", accent)}>
        <Icon className="size-4 text-white" />
      </div>
      <div>
        <p className="text-2xl font-bold tracking-tight">{value}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
        {sublabel && <p className="text-xs text-muted-foreground/60 mt-1">{sublabel}</p>}
      </div>
      <div className={cn("absolute -right-4 -top-4 size-16 rounded-full opacity-10 blur-xl", accent)} />
    </div>
  );
}

/* ── Mini bar chart — last 7 days deploy frequency ── */
function DeployChart({ deployments }: { deployments: ReturnType<typeof useDeployments>["deployments"] }) {
  const mounted = useMounted();
  if (!mounted) return <div className="h-20 rounded-lg bg-muted/40 animate-pulse" />;

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return d.toDateString();
  });

  const counts = days.map((day) => ({
    day,
    label: new Date(day).toLocaleDateString("en", { weekday: "short" }),
    total: deployments.filter((d) => new Date(d.createdAt).toDateString() === day).length,
    success: deployments.filter((d) => new Date(d.createdAt).toDateString() === day && d.status === "success").length,
    failed: deployments.filter((d) => new Date(d.createdAt).toDateString() === day && d.status === "failed").length,
  }));

  const max = Math.max(...counts.map((c) => c.total), 1);

  return (
    <div className="flex items-end gap-1.5 h-20">
      {counts.map(({ label, total, success, failed }) => (
        <div key={label} className="flex-1 flex flex-col items-center gap-1">
          <div className="w-full flex flex-col-reverse gap-px" style={{ height: 60 }}>
            {total === 0 ? (
              <div className="w-full rounded-sm bg-muted/40" style={{ height: 3 }} />
            ) : (
              <>
                {success > 0 && (
                  <div
                    className="w-full rounded-sm bg-emerald-500/70 transition-all"
                    style={{ height: `${(success / max) * 60}px` }}
                    title={`${success} successful`}
                  />
                )}
                {failed > 0 && (
                  <div
                    className="w-full rounded-sm bg-red-500/70 transition-all"
                    style={{ height: `${(failed / max) * 60}px` }}
                    title={`${failed} failed`}
                  />
                )}
              </>
            )}
          </div>
          <span className="text-[10px] text-muted-foreground">{label}</span>
        </div>
      ))}
    </div>
  );
}

/* ── Empty state ── */
function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card/50 py-14 text-center">
      <div className="flex size-14 items-center justify-center rounded-xl bg-primary/10 ring-1 ring-primary/20 mb-4">
        <Rocket className="size-7 text-primary" />
      </div>
      <p className="text-sm font-medium">No deployments yet</p>
      <p className="text-xs text-muted-foreground mt-1 max-w-xs">
        Create a project and trigger your first deployment.
      </p>
      <Link
        href="/dashboard/projects"
        className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/80 transition-colors"
      >
        Create a project <ArrowRight className="size-3" />
      </Link>
    </div>
  );
}

/* ── Page ── */
export default function DashboardPage() {
  const { user } = useAuth();
  const { projects } = useProjects();
  const { deployments, isLoading } = useDeployments();

  const successful = deployments.filter((d) => d.status === "success").length;
  const failed     = deployments.filter((d) => d.status === "failed").length;
  const running    = deployments.filter((d) => ["queued","building","deploying"].includes(d.status)).length;
  const successRate = deployments.length
    ? Math.round((successful / deployments.length) * 100)
    : 0;
  const recent = deployments.slice(0, 10);
  const firstName = user?.name?.split(" ")[0] ?? "there";

  return (
    <div className="flex flex-col gap-8">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Hey, {firstName} 👋</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Here&apos;s what&apos;s happening across your projects.
          </p>
        </div>
        {running > 0 && (
          <div className="flex items-center gap-2 rounded-lg bg-blue-500/10 border border-blue-500/20 px-3 py-1.5 text-xs text-blue-400">
            <RefreshCw className="size-3 animate-spin" />
            {running} in progress
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Projects"          value={projects.length}    icon={FolderGit2}    accent="bg-violet-500" />
        <StatCard label="Total Deployments" value={deployments.length} icon={Rocket}        accent="bg-blue-500"   />
        <StatCard
          label="Successful"
          value={successful}
          icon={CheckCircle}
          accent="bg-emerald-500"
          sublabel={deployments.length > 0 ? `${successRate}% success rate` : undefined}
        />
        <StatCard label="Failed" value={failed} icon={XCircle} accent="bg-red-500" />
      </div>

      {/* Two-column layout: chart + quick links */}
      <div className="grid gap-4 lg:grid-cols-3">

        {/* Deploy frequency chart */}
        <div className="lg:col-span-2 rounded-xl border border-border bg-card p-5 flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <Activity className="size-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold">Deploy frequency</h2>
            <span className="ml-auto text-xs text-muted-foreground">Last 7 days</span>
          </div>
          <DeployChart deployments={deployments} />
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-emerald-500/70" />Successful</span>
            <span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-red-500/70" />Failed</span>
          </div>
        </div>

        {/* Quick links */}
        <div className="rounded-xl border border-border bg-card p-5 flex flex-col gap-3">
          <h2 className="text-sm font-semibold mb-1">Quick actions</h2>
          {[
            { href: "/dashboard/projects",     icon: FolderGit2, label: "View projects",      sub: `${projects.length} total` },
            { href: "/dashboard/repositories", icon: GitFork,    label: "Browse repos",        sub: "GitHub" },
            { href: "/dashboard/deployments",  icon: Rocket,     label: "All deployments",     sub: `${deployments.length} total` },
            { href: "/dashboard/secrets",      icon: XCircle,    label: "Manage secrets",      sub: "Per project" },
          ].map(({ href, icon: Icon, label, sub }) => (
            <Link key={href} href={href}>
              <div className="group flex items-center gap-3 rounded-lg border border-border bg-background px-3 py-2.5 hover:border-primary/30 hover:bg-card transition-all">
                <Icon className="size-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate">{label}</p>
                  <p className="text-[11px] text-muted-foreground">{sub}</p>
                </div>
                <ArrowRight className="size-3.5 text-muted-foreground/30 group-hover:text-primary transition-colors" />
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Recent deployments */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="size-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold">Recent Deployments</h2>
          </div>
          {recent.length > 0 && (
            <Link
              href="/dashboard/deployments"
              className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
            >
              View all <ArrowRight className="size-3" />
            </Link>
          )}
        </div>

        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-14 rounded-lg bg-card animate-pulse border border-border" />
            ))}
          </div>
        ) : recent.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="flex flex-col gap-2">
            {recent.map((d) => (
              <Link key={d.id} href={`/dashboard/deployments/${d.id}`}>
                <div className={cn(
                  "group flex items-center gap-4 rounded-lg border border-border bg-card px-4 py-3",
                  "border-l-2 hover:bg-card/80 transition-all duration-150",
                  statusBorderColor[d.status]
                )}>
                  <StatusBadge status={d.status} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {d.commitMessage ?? "Manual trigger"}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      <span className="capitalize">{d.platform}</span>
                      {d.commitSha && <> · <span className="font-mono">{d.commitSha.slice(0, 7)}</span></>}
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0 tabular-nums">
                    {formatRelative(d.createdAt)}
                  </span>
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
