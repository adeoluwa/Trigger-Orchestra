import { cn } from "@/lib/utils";
import type { DeploymentStatus } from "@trigger-orchestra/shared";

const statusConfig: Record<DeploymentStatus, { label: string; classes: string }> = {
  pending:   { label: "Pending",   classes: "bg-yellow-500/15 text-yellow-400 border-yellow-500/25" },
  queued:    { label: "Queued",    classes: "bg-blue-500/15 text-blue-400 border-blue-500/25" },
  running:   { label: "Running",   classes: "bg-blue-500/15 text-blue-400 border-blue-500/25 animate-pulse" },
  success:   { label: "Success",   classes: "bg-green-500/15 text-green-400 border-green-500/25" },
  failed:    { label: "Failed",    classes: "bg-red-500/15 text-red-400 border-red-500/25" },
  cancelled: { label: "Cancelled", classes: "bg-zinc-500/15 text-zinc-400 border-zinc-500/25" },
};

export function StatusBadge({ status }: { status: DeploymentStatus }) {
  const config = statusConfig[status] ?? statusConfig.pending;
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
