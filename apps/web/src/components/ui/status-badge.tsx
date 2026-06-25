import { cn } from "@/lib/utils";
import type { DeploymentStatus } from "@trigger-orchestra/shared";

const statusConfig: Record<DeploymentStatus, { label: string; classes: string }> = {
  queued:    { label: "Queued",     classes: "bg-blue-500/15 text-blue-400 border-blue-500/25" },
  building:  { label: "Building",   classes: "bg-yellow-500/15 text-yellow-400 border-yellow-500/25 animate-pulse" },
  deploying: { label: "Deploying",  classes: "bg-blue-500/15 text-blue-400 border-blue-500/25 animate-pulse" },
  success:   { label: "Success",    classes: "bg-green-500/15 text-green-400 border-green-500/25" },
  failed:    { label: "Failed",     classes: "bg-red-500/15 text-red-400 border-red-500/25" },
  cancelled: { label: "Cancelled",  classes: "bg-zinc-500/15 text-zinc-400 border-zinc-500/25" },
};

export function StatusBadge({ status }: { status: string }) {
  const config = statusConfig[status as DeploymentStatus] ?? {
    label: status,
    classes: "bg-zinc-500/15 text-zinc-400 border-zinc-500/25",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium",
        config.classes
      )}
    >
      {config.label}
    </span>
  );
}
