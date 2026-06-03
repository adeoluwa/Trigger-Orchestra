import useSWR from "swr";
import type { GithubRepo, ApiResponse } from "@trigger-orchestra/shared";
import { api } from "@/lib/api";

export function useGithubRepos() {
  const { data, error, isLoading } = useSWR(
    "/auth/github/repos",
    (url) => api.get<ApiResponse<GithubRepo[]>>(url)
  );
  return {
    repos: data?.data ?? [],
    isLoading,
    error,
    noGithubToken: error?.message?.includes("No GitHub token"),
  };
}
