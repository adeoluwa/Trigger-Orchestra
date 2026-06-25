import useSWR from "swr";
import type { Secret, ApiResponse } from "@trigger-orchestra/shared";
import { api } from "@/lib/api";

export function useSecrets(environmentId: string | null) {
  const { data, error, isLoading, mutate } = useSWR(
    environmentId ? `/secrets/environment/${environmentId}` : null,
    (u) => api.get<ApiResponse<Secret[]>>(u)
  );
  return { secrets: data?.data ?? [], isLoading, error, mutate };
}
