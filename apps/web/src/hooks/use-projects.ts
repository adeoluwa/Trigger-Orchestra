import useSWR from "swr";
import type { Project, ApiResponse, PaginatedResponse } from "@trigger-orchestra/shared";
import { api } from "@/lib/api";

const fetcher = (url: string) => api.get<ApiResponse<PaginatedResponse<Project>>>(url);

export function useProjects() {
  const { data, error, isLoading, mutate } = useSWR("/projects", fetcher);
  return {
    projects: data?.data?.data ?? [],
    total: data?.data?.total ?? 0,
    isLoading,
    error,
    mutate,
  };
}

export function useProject(id: string) {
  const { data, error, isLoading, mutate } = useSWR(
    id ? `/projects/${id}` : null,
    (url) => api.get<ApiResponse<Project>>(url)
  );
  return { project: data?.data, isLoading, error, mutate };
}

export async function updateProject(id: string, body: { name?: string; repoUrl?: string; configPath?: string }) {
  return api.patch<ApiResponse<Project>>(`/projects/${id}`, body);
}

export async function deleteProject(id: string) {
  return api.delete(`/projects/${id}`);
}
