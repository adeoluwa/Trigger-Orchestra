import { useEffect, useState } from "react";
import useSWR from "swr";
import type {
  Deployment,
  DeploymentLog,
  DeploymentStatus,
  DeploymentSummary,
  ApiResponse,
} from "@trigger-orchestra/shared";
import { api } from "@/lib/api";

export function useDeployments(projectId?: string) {
  const url = projectId ? `/deployments/project/${projectId}` : `/deployments`;
  const { data, error, isLoading, mutate } = useSWR(
    url,
    (u) => api.get<ApiResponse<Deployment[]>>(u),
    { refreshInterval: 10000 }
  );
  return {
    deployments: data?.data ?? [],
    total: data?.data?.length ?? 0,
    isLoading,
    error,
    mutate,
  };
}

export function useDeploymentSummary(projectId: string) {
  const { data, error, isLoading, mutate } = useSWR(
    projectId ? `/deployments/project/${projectId}/summary` : null,
    (url) => api.get<ApiResponse<DeploymentSummary>>(url)
  );
  return { summary: data?.data, isLoading, error, mutate };
}

export function useDeployment(id: string, options?: { poll?: boolean }) {
  const { data, error, isLoading, mutate } = useSWR(
    id ? `/deployments/${id}` : null,
    (url) => api.get<ApiResponse<Deployment>>(url),
    { refreshInterval: options?.poll !== false ? 5000 : 0 }
  );
  return { deployment: data?.data, isLoading, error, mutate };
}

const API_BASE =
  typeof window !== "undefined"
    ? (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000/api/v1")
    : "http://localhost:3000/api/v1";

export function useDeploymentStream(deploymentId: string) {
  const [logs, setLogs] = useState<DeploymentLog[]>([]);
  const [liveStatus, setLiveStatus] = useState<DeploymentStatus | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!deploymentId) return;

    const controller = new AbortController();
    let buffer = "";

    async function connect() {
      const token =
        typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;

      try {
        const res = await fetch(
          `${API_BASE}/deployments/${deploymentId}/logs/stream`,
          {
            headers: token ? { Authorization: `Bearer ${token}` } : {},
            signal: controller.signal,
          }
        );

        if (!res.ok || !res.body) return;
        setConnected(true);

        const reader = res.body.getReader();
        const decoder = new TextDecoder();

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const parts = buffer.split("\n\n");
          buffer = parts.pop() ?? "";

          for (const part of parts) {
            const dataLine = part
              .split("\n")
              .find((l) => l.startsWith("data: "));
            if (!dataLine) continue;
            try {
              const data = JSON.parse(dataLine.slice(6));
              if (data.type === "status" || data.type === "done") {
                setLiveStatus(data.status as DeploymentStatus);
                if (data.type === "done") setConnected(false);
              } else {
                setLogs((prev) => [...prev, data as DeploymentLog]);
              }
            } catch {
              // ignore malformed event
            }
          }
        }
      } catch (err: any) {
        if (err?.name !== "AbortError") {
          console.error("[SSE] stream error", err);
        }
      } finally {
        setConnected(false);
      }
    }

    connect();

    return () => {
      controller.abort();
      setConnected(false);
    };
  }, [deploymentId]);

  return { logs, liveStatus, connected };
}
