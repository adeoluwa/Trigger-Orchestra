import useSWR from "swr";
import type { Secret, ApiResponse } from "@trigger-orchestra/shared";
import { api } from "@/lib/api";

export function useSecrets(projectId: string, environmentId?: string) {
  const url = environmentId
    ? `/secrets?projectId=${projectId}&environmentId=${environmentId}`
    : `/secrets?projectId=${projectId}`;
  const { data, error, isLoading, mutate } = useSWR(
    projectId ? url : null,
    (u) => api.get<ApiResponse<Secret[]>>(u)
  );
  return { secrets: data?.data ?? [], isLoading, error, mutate };
}
