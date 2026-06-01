"use client";

import Link from "next/link";
import { KeyRound } from "lucide-react";
import { Card } from "@/components/ui/card";
import { useProjects } from "@/hooks/use-projects";

export default function SecretsPage() {
  const { projects, isLoading } = useProjects();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold">Secrets</h1>
        <p className="text-sm text-muted-foreground">Manage environment variables per project</p>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : projects.length === 0 ? (
        <Card className="p-12 text-center">
          <KeyRound className="size-10 mx-auto text-muted-foreground mb-3" />
          <p className="text-sm font-medium">No projects yet</p>
          <p className="text-xs text-muted-foreground mt-1">
            <Link href="/dashboard/projects" className="underline underline-offset-4">Create a project</Link> to manage its secrets.
          </p>
        </Card>
      ) : (
        <div className="flex flex-col gap-2">
          {projects.map((p) => (
            <Link key={p.id} href={`/dashboard/projects/${p.id}/secrets`}>
              <Card className="px-4 py-3 flex items-center gap-3 hover:bg-card/80 transition-colors cursor-pointer">
                <KeyRound className="size-4 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{p.name}</p>
                  {p.description && <p className="text-xs text-muted-foreground truncate">{p.description}</p>}
                </div>
                <span className="text-xs text-muted-foreground shrink-0">Manage secrets →</span>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
