import useSWR from "swr";
import type { Deployment, DeploymentLog, ApiResponse, PaginatedResponse } from "@trigger-orchestra/shared";
import { api } from "@/lib/api";

export function useDeployments(projectId?: string) {
  const url = projectId
    ? `/deployments?projectId=${projectId}`
    : "/deployments";
  const { data, error, isLoading, mutate } = useSWR(
    url,
    (u) => api.get<ApiResponse<PaginatedResponse<Deployment>>>(u),
    { refreshInterval: 5000 }
  );
  return {
    deployments: data?.data?.data ?? [],
    total: data?.data?.total ?? 0,
    isLoading,
    error,
    mutate,
  };
}

export function useDeployment(id: string) {
  const { data, error, isLoading, mutate } = useSWR(
    id ? `/deployments/${id}` : null,
    (url) => api.get<ApiResponse<Deployment>>(url),
    { refreshInterval: 3000 }
  );
  return { deployment: data?.data, isLoading, error, mutate };
}

export function useDeploymentLogs(deploymentId: string) {
  const { data, error, isLoading } = useSWR(
    deploymentId ? `/deployments/${deploymentId}/logs` : null,
    (url) => api.get<ApiResponse<DeploymentLog[]>>(url),
    { refreshInterval: 2000 }
  );
  return { logs: data?.data ?? [], isLoading, error };
}
