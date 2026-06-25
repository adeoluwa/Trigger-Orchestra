"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import {
  GitFork, Star, Lock, Globe, Search, Plus, ExternalLink, AlertCircle,
  FileCode, ChevronDown, ChevronUp, Trash2, X,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useGithubRepos } from "@/hooks/use-github";
import { useProjects } from "@/hooks/use-projects";
import { api } from "@/lib/api";
import { formatRelative, cn } from "@/lib/utils";
import type { ApiResponse, Project, GithubRepo } from "@trigger-orchestra/shared";

/* ── helpers ── */

type EnvRow = { name: string; branch: string; platform: "railway" | "render" };

function buildYaml(repoUrl: string, envs: EnvRow[]): string {
  const repoName = (() => {
    try { return new URL(repoUrl).pathname.replace(/^\//, "").replace(/\.git$/, "") }
    catch { return "my-app" }
  })();
  const lines = [
    `project: "${repoName.split("/").pop() ?? "my-app"}"`,
    `repo: "${repoUrl}"`,
    "",
    "environments:",
  ];
  for (const env of envs) {
    if (!env.name) continue;
    lines.push(`  ${env.name}:`);
    lines.push(`    branch: "${env.branch || "main"}"`);
    lines.push(`    platform: "${env.platform}"`);
  }
  return lines.join("\n");
}

/* ── CreateConfigModal ── */

function CreateConfigModal({
  repo,
  onCreated,
  onClose,
}: {
  repo: GithubRepo;
  onCreated: () => void;
  onClose: () => void;
}) {
  const [envs, setEnvs] = useState<EnvRow[]>([
    { name: "staging", branch: "develop", platform: "railway" },
    { name: "live",    branch: "main",    platform: "render"  },
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"form" | "preview">("form");

  const [owner, repoName] = repo.full_name.split("/");
  const yamlContent = buildYaml(repo.html_url, envs);

  function updateEnv(i: number, field: keyof EnvRow, value: string) {
    setEnvs((prev) => prev.map((e, idx) => idx === i ? { ...e, [field]: value } : e));
  }

  function addEnv() {
    setEnvs((prev) => [...prev, { name: "", branch: "main", platform: "railway" }]);
  }

  function removeEnv(i: number) {
    setEnvs((prev) => prev.filter((_, idx) => idx !== i));
  }

  async function handleCreate() {
    const valid = envs.filter((e) => e.name.trim());
    if (valid.length === 0) { setError("Add at least one environment."); return; }
    setLoading(true);
    setError(null);
    try {
      await api.post(`/auth/github/repos/${owner}/${repoName}/config`, {
        content: buildYaml(repo.html_url, valid),
      });
      onCreated();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create file");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-xl rounded-xl border border-border bg-card shadow-2xl flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-border shrink-0">
          <div className="flex size-9 items-center justify-center rounded-lg bg-primary/15 ring-1 ring-primary/20 shrink-0">
            <FileCode className="size-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-sm font-semibold">Create trigger.yml</h2>
            <p className="text-xs text-muted-foreground truncate">{repo.full_name}</p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="size-4" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 px-5 pt-3 shrink-0">
          {(["form", "preview"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "px-3 py-1.5 rounded-md text-xs font-medium capitalize transition-colors",
                activeTab === tab
                  ? "bg-primary/15 text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {tab === "form" ? "Configure" : "Preview YAML"}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {activeTab === "form" ? (
            <div className="flex flex-col gap-4">
              <p className="text-xs text-muted-foreground">
                Define the environments for this project. Each maps to a branch and a deployment platform.
              </p>

              {envs.map((env, i) => (
                <div key={i} className="grid grid-cols-[1fr_1fr_auto_auto] gap-2 items-end">
                  <div className="flex flex-col gap-1">
                    {i === 0 && <Label className="text-xs">Environment name</Label>}
                    <Input
                      value={env.name}
                      onChange={(e) => updateEnv(i, "name", e.target.value)}
                      placeholder="staging"
                      className="h-8 text-xs"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    {i === 0 && <Label className="text-xs">Branch</Label>}
                    <Input
                      value={env.branch}
                      onChange={(e) => updateEnv(i, "branch", e.target.value)}
                      placeholder="main"
                      className="h-8 text-xs font-mono"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    {i === 0 && <Label className="text-xs">Platform</Label>}
                    <select
                      value={env.platform}
                      onChange={(e) => updateEnv(i, "platform", e.target.value as EnvRow["platform"])}
                      className="h-8 rounded-lg border border-input bg-background px-2 text-xs"
                    >
                      <option value="railway">Railway</option>
                      <option value="render">Render</option>
                    </select>
                  </div>
                  <div className={i === 0 ? "mt-5" : ""}>
                    <button
                      onClick={() => removeEnv(i)}
                      disabled={envs.length === 1}
                      className="flex size-8 items-center justify-center rounded-lg border border-border text-muted-foreground hover:text-destructive hover:border-destructive/40 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                </div>
              ))}

              <button
                onClick={addEnv}
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors w-fit"
              >
                <Plus className="size-3.5" />
                Add environment
              </button>
            </div>
          ) : (
            <pre className="rounded-lg bg-zinc-950 border border-border p-4 text-xs font-mono text-sky-300 leading-5 overflow-x-auto whitespace-pre">
              {yamlContent}
            </pre>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-border shrink-0 flex flex-col gap-3">
          {error && (
            <p className="text-xs text-destructive">{error}</p>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
            <Button size="sm" onClick={handleCreate} disabled={loading} className="gap-1.5">
              <FileCode className="size-3.5" />
              {loading ? "Creating…" : "Create trigger.yml"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function LanguageDot({ language }: { language: string | null }) {
  const colors: Record<string, string> = {
    TypeScript: "bg-blue-400", JavaScript: "bg-yellow-400", Python: "bg-green-400",
    Go: "bg-cyan-400", Rust: "bg-orange-400", Java: "bg-red-400", "C#": "bg-purple-400",
    PHP: "bg-indigo-400", Ruby: "bg-pink-400", Swift: "bg-orange-300",
  };
  if (!language) return null;
  return (
    <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
      <span className={cn("size-2 rounded-full", colors[language] ?? "bg-zinc-400")} />
      {language}
    </span>
  );
}

const YAML_EXAMPLE = `project: "my-app"
repo: "https://github.com/you/my-app"

environments:
  staging:
    branch: "develop"
    platform: "railway"
  live:
    branch: "main"
    platform: "render"`;

function RepoCard({
  repo,
  isConnected,
  onConnect,
  connecting,
  error,
  onCreateConfig,
}: {
  repo: GithubRepo;
  isConnected: boolean;
  onConnect: (repo: GithubRepo) => void;
  connecting: boolean;
  error?: string;
  onCreateConfig: (repo: GithubRepo) => void;
}) {
  const [showYaml, setShowYaml] = useState(false);

  return (
    <div className={cn(
      "group flex flex-col gap-3 rounded-xl border bg-card p-4 transition-all duration-150",
      error ? "border-amber-500/40" : "border-border hover:border-primary/30"
    )}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          {repo.private ? (
            <Lock className="size-3.5 shrink-0 text-muted-foreground" />
          ) : (
            <Globe className="size-3.5 shrink-0 text-muted-foreground" />
          )}
          <a
            href={repo.html_url}
            target="_blank"
            rel="noreferrer"
            className="text-sm font-semibold truncate hover:text-primary transition-colors flex items-center gap-1"
          >
            {repo.name}
            <ExternalLink className="size-3 shrink-0 opacity-0 group-hover:opacity-60 transition-opacity" />
          </a>
        </div>
        {isConnected ? (
          <Badge variant="secondary" className="text-emerald-400 border-emerald-500/25 bg-emerald-500/10 shrink-0 text-[10px]">
            Connected
          </Badge>
        ) : (
          <Button
            size="xs"
            variant="outline"
            className="shrink-0 gap-1"
            disabled={connecting}
            onClick={() => onConnect(repo)}
          >
            <Plus className="size-3" />
            {connecting ? "Adding…" : "Add project"}
          </Button>
        )}
      </div>

      {repo.description && (
        <p className="text-xs text-muted-foreground line-clamp-2">{repo.description}</p>
      )}

      {error && (
        <div className="rounded-lg border border-amber-500/25 bg-amber-500/10 p-2.5 flex flex-col gap-2">
          <div className="flex items-start gap-2">
            <FileCode className="size-3.5 text-amber-400 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-300">{error}</p>
          </div>
          <button
            type="button"
            onClick={() => onCreateConfig(repo)}
            className="flex items-center gap-1.5 text-xs font-medium text-primary bg-primary/10 hover:bg-primary/20 border border-primary/25 rounded-lg px-3 py-1.5 w-fit transition-colors"
          >
            <FileCode className="size-3.5" />
            Create trigger.yml for this repo
          </button>
          <button
            type="button"
            onClick={() => setShowYaml(!showYaml)}
            className="flex items-center gap-1 text-[11px] text-amber-400/70 hover:text-amber-400 transition-colors w-fit"
          >
            {showYaml ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
            {showYaml ? "Hide example" : "What should it look like?"}
          </button>
          {showYaml && (
            <pre className="rounded-md bg-black/40 p-2.5 text-[11px] font-mono text-sky-300 overflow-x-auto whitespace-pre leading-5">
              {YAML_EXAMPLE}
            </pre>
          )}
        </div>
      )}

      <div className="flex items-center gap-3 flex-wrap">
        <LanguageDot language={repo.language} />
        {repo.stargazers_count > 0 && (
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <Star className="size-3" />
            {repo.stargazers_count.toLocaleString()}
          </span>
        )}
        <span className="text-xs text-muted-foreground ml-auto" suppressHydrationWarning>
          Updated {formatRelative(repo.updated_at)}
        </span>
      </div>
    </div>
  );
}

export default function RepositoriesPage() {
  const router = useRouter();
  const { repos, isLoading, noGithubToken } = useGithubRepos();
  const { projects, mutate } = useProjects();
  const [search, setSearch] = useState("");
  const [connecting, setConnecting] = useState<number | null>(null);
  const [connectError, setConnectError] = useState<{ repoId: number; message: string } | null>(null);
  const [configModalRepo, setConfigModalRepo] = useState<GithubRepo | null>(null);
  const [filter, setFilter] = useState<"all" | "public" | "private">("all");

  const connectedUrls = new Set(projects.map((p) => p.repoUrl));

  const filtered = repos.filter((r) => {
    const matchesSearch = r.name.toLowerCase().includes(search.toLowerCase()) ||
      (r.description?.toLowerCase().includes(search.toLowerCase()) ?? false);
    const matchesFilter =
      filter === "all" || (filter === "private" ? r.private : !r.private);
    return matchesSearch && matchesFilter;
  });

  async function handleConnect(repo: GithubRepo) {
    setConnecting(repo.id);
    setConnectError(null);
    try {
      await api.post<ApiResponse<Project>>("/projects", {
        name: repo.name,
        repoUrl: repo.html_url,
      });
      await mutate();
      toast.success(`${repo.name} added successfully`);
      router.push("/dashboard/projects");
    } catch (err) {
      const raw = err instanceof Error ? err.message : "Failed to create project";
      const isConfigError = raw.toLowerCase().includes("config") || raw.toLowerCase().includes("read");
      const message = isConfigError
        ? "trigger.yml not found on the default branch. Add it to your repo first (see example below)."
        : raw;
      toast.error(`Failed to add ${repo.name}: ${message}`);
      setConnectError({
        repoId: repo.id,
        message,
      });
    } finally {
      setConnecting(null);
    }
  }

  if (noGithubToken) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center gap-4">
        <div className="flex size-14 items-center justify-center rounded-xl bg-yellow-500/10 ring-1 ring-yellow-500/20">
          <AlertCircle className="size-7 text-yellow-400" />
        </div>
        <div>
          <p className="text-sm font-semibold">GitHub not connected</p>
          <p className="text-xs text-muted-foreground mt-1">
            Sign out and sign back in using GitHub to browse your repositories.
          </p>
        </div>
        <a
          href="/login"
          className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/80 transition-colors"
        >
          Sign in with GitHub
        </a>
      </div>
    );
  }

  return (
    <>
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Repositories</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {isLoading ? "Loading…" : `${repos.length} repositories from GitHub`}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
          <Input
            placeholder="Search repositories…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-8 text-sm"
          />
        </div>
        <div className="flex gap-1">
          {(["all", "public", "private"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "rounded-lg px-3 py-1.5 text-xs font-medium capitalize transition-colors",
                filter === f
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              )}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-28 rounded-xl bg-card border border-border animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card/50 py-16 text-center">
          <GitFork className="size-8 text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">No repositories match your search.</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {filtered.map((repo) => (
            <RepoCard
              key={repo.id}
              repo={repo}
              isConnected={connectedUrls.has(repo.html_url)}
              onConnect={handleConnect}
              connecting={connecting === repo.id}
              error={connectError?.repoId === repo.id ? connectError.message : undefined}
              onCreateConfig={setConfigModalRepo}
            />
          ))}
        </div>
      )}
    </div>

    {configModalRepo && (
      <CreateConfigModal
        repo={configModalRepo}
        onClose={() => setConfigModalRepo(null)}
        onCreated={() => {
          setConfigModalRepo(null);
          setConnectError(null);
        }}
      />
    )}
    </>
  );
}
