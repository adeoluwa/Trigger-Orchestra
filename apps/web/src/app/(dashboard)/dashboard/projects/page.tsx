"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, FolderGit2, GitBranch, ArrowRight, Globe, ChevronDown, ChevronUp, FileCode } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useProjects } from "@/hooks/use-projects";
import { api } from "@/lib/api";
import { formatRelative } from "@/lib/utils";
import type { ApiResponse, Project, CreateProjectRequest } from "@trigger-orchestra/shared";

const YAML_EXAMPLE = `project: "my-app"
repo: "https://github.com/you/my-app"

environments:
  staging:
    branch: "develop"
    platform: "railway"
  live:
    branch: "main"
    platform: "render"`;

function CreateProjectModal({ onCreated, onClose }: { onCreated: () => void; onClose: () => void }) {
  const [name, setName] = useState("");
  const [repoUrl, setRepoUrl] = useState("");
  const [configPath, setConfigPath] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showYaml, setShowYaml] = useState(false);

  async function handleSubmit(e: { preventDefault(): void }) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await api.post<ApiResponse<Project>>("/projects", {
        name,
        repoUrl,
        configPath: configPath || undefined,
      } satisfies CreateProjectRequest);
      onCreated();
      onClose();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to create project";
      setError(
        msg.toLowerCase().includes("config") || msg.toLowerCase().includes("read")
          ? `Could not read trigger.yml from the repository. Make sure the file exists on the default branch before creating a project.`
          : msg
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-xl border border-border bg-card shadow-2xl p-6 flex flex-col gap-5 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-lg bg-primary/15 ring-1 ring-primary/20">
            <FolderGit2 className="size-5 text-primary" />
          </div>
          <div>
            <h2 className="text-base font-semibold">New project</h2>
            <p className="text-xs text-muted-foreground">Connect a repository to start deploying</p>
          </div>
        </div>

        {/* trigger.yml requirement notice */}
        <div className="rounded-lg border border-amber-500/25 bg-amber-500/10 p-3 flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <FileCode className="size-4 text-amber-400 shrink-0" />
            <p className="text-xs font-medium text-amber-300">
              Your repo must have a <code className="font-mono">trigger.yml</code> on its default branch
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowYaml(!showYaml)}
            className="flex items-center gap-1 text-xs text-amber-400/70 hover:text-amber-400 transition-colors w-fit"
          >
            {showYaml ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
            {showYaml ? "Hide example" : "Show example trigger.yml"}
          </button>
          {showYaml && (
            <pre className="rounded-md bg-black/40 p-3 text-xs font-mono text-emerald-300 overflow-x-auto whitespace-pre leading-5">
              {YAML_EXAMPLE}
            </pre>
          )}
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="proj-name">Project name</Label>
            <Input
              id="proj-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="my-awesome-app"
              autoFocus
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="proj-repo">Repository URL</Label>
            <Input
              id="proj-repo"
              type="url"
              value={repoUrl}
              onChange={(e) => setRepoUrl(e.target.value)}
              required
              placeholder="https://github.com/you/repo"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="proj-config">
              Config path <span className="text-muted-foreground/60 font-normal">(optional — defaults to trigger.yml)</span>
            </Label>
            <Input
              id="proj-config"
              value={configPath}
              onChange={(e) => setConfigPath(e.target.value)}
              placeholder="trigger.yml"
            />
          </div>
          {error && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
              {error}
            </div>
          )}
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Creating…" : "Create project"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ProjectCard({ project }: { project: Project }) {
  return (
    <Link href={`/dashboard/projects/${project.id}`}>
      <div className="group relative flex flex-col gap-4 rounded-xl border border-border bg-card p-5 hover:border-primary/30 hover:bg-card/80 transition-all duration-150 h-full cursor-pointer">
        <div className="flex items-start gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 ring-1 ring-primary/20">
            <FolderGit2 className="size-4 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold truncate">{project.name}</p>
            <p className="text-xs text-muted-foreground/50 mt-0.5 truncate font-mono">
              {(() => { try { return new URL(project.repoUrl).hostname } catch { return "—" } })()}
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Globe className="size-3 shrink-0" />
            <span className="truncate font-mono">
              {(() => { try { return new URL(project.repoUrl).pathname.replace(/^\//, '') } catch { return project.repoUrl } })()}
            </span>
          </div>
          {project.configPath && project.configPath !== "trigger.yml" && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <GitBranch className="size-3 shrink-0" />
              <span className="font-mono">{project.configPath}</span>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between mt-auto pt-2 border-t border-border/50">
          <p className="text-xs text-muted-foreground/60">
            Updated {formatRelative(project.updatedAt)}
          </p>
          <ArrowRight className="size-3.5 text-muted-foreground/30 group-hover:text-primary transition-colors" />
        </div>
      </div>
    </Link>
  );
}

function EmptyProjects({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card/50 py-20 text-center">
      <div className="flex size-14 items-center justify-center rounded-xl bg-primary/10 ring-1 ring-primary/20 mb-4">
        <FolderGit2 className="size-7 text-primary" />
      </div>
      <p className="text-sm font-semibold">No projects yet</p>
      <p className="text-xs text-muted-foreground mt-1 max-w-xs">
        Create your first project to connect a repository and start deploying.
      </p>
      <button
        onClick={onCreate}
        className="mt-5 inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/80 transition-colors"
      >
        <Plus className="size-4" /> Create project
      </button>
    </div>
  );
}

export default function ProjectsPage() {
  const { projects, isLoading, mutate } = useProjects();
  const [showModal, setShowModal] = useState(false);

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Projects</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {isLoading ? "Loading…" : `${projects.length} project${projects.length !== 1 ? "s" : ""}`}
          </p>
        </div>
        {projects.length > 0 && (
          <Button onClick={() => setShowModal(true)} size="sm" className="gap-1.5">
            <Plus className="size-4" /> New project
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-40 rounded-xl bg-card border border-border animate-pulse" />
          ))}
        </div>
      ) : projects.length === 0 ? (
        <EmptyProjects onCreate={() => setShowModal(true)} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      )}

      {showModal && (
        <CreateProjectModal
          onCreated={mutate}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  );
}
