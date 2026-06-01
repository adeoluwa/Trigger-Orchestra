"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, FolderGit2, GitBranch } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog } from "@/components/ui/dialog";
import { useProjects } from "@/hooks/use-projects";
import { api } from "@/lib/api";
import { formatRelative } from "@/lib/utils";
import type { ApiResponse, Project, CreateProjectRequest } from "@trigger-orchestra/shared";

function CreateProjectDialog({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [repoUrl, setRepoUrl] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post<ApiResponse<Project>>("/projects", {
        name,
        description: description || undefined,
        repositoryUrl: repoUrl || undefined,
      } satisfies CreateProjectRequest);
      setOpen(false);
      setName("");
      setDescription("");
      setRepoUrl("");
      onCreated();
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Button onClick={() => setOpen(true)} size="sm" className="gap-1.5">
        <Plus className="size-4" />
        New project
      </Button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <Card className="w-full max-w-md p-6 flex flex-col gap-4">
            <div>
              <h2 className="text-base font-semibold">Create project</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Connect a repository and start deploying.</p>
            </div>
            <form onSubmit={handleSubmit} className="flex flex-col gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="proj-name">Name</Label>
                <Input id="proj-name" value={name} onChange={(e) => setName(e.target.value)} required placeholder="my-app" />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="proj-desc">Description <span className="text-muted-foreground">(optional)</span></Label>
                <Input id="proj-desc" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What does this project do?" />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="proj-repo">Repository URL <span className="text-muted-foreground">(optional)</span></Label>
                <Input id="proj-repo" value={repoUrl} onChange={(e) => setRepoUrl(e.target.value)} placeholder="https://github.com/you/repo" />
              </div>
              <div className="flex justify-end gap-2 mt-1">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={loading}>{loading ? "Creating…" : "Create"}</Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </>
  );
}

export default function ProjectsPage() {
  const { projects, isLoading, mutate } = useProjects();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Projects</h1>
          <p className="text-sm text-muted-foreground">{projects.length} project{projects.length !== 1 ? "s" : ""}</p>
        </div>
        <CreateProjectDialog onCreated={mutate} />
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : projects.length === 0 ? (
        <Card className="p-12 text-center">
          <FolderGit2 className="size-10 mx-auto text-muted-foreground mb-3" />
          <p className="text-sm font-medium">No projects yet</p>
          <p className="text-xs text-muted-foreground mt-1">Create your first project to start deploying.</p>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <Link key={project.id} href={`/dashboard/projects/${project.id}`}>
              <Card className="p-4 flex flex-col gap-3 hover:bg-card/80 transition-colors cursor-pointer h-full">
                <div className="flex items-start gap-3">
                  <div className="rounded-md bg-muted p-2 shrink-0">
                    <FolderGit2 className="size-4 text-muted-foreground" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{project.name}</p>
                    {project.description && (
                      <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{project.description}</p>
                    )}
                  </div>
                </div>
                {project.repositoryName && (
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <GitBranch className="size-3" />
                    <span className="truncate">{project.repositoryOwner}/{project.repositoryName}</span>
                  </div>
                )}
                <p className="text-xs text-muted-foreground mt-auto pt-1">
                  Updated {formatRelative(project.updatedAt)}
                </p>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
