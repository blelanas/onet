import { keepPreviousData, QueryClient, useQuery } from "@tanstack/react-query";
import { apiGet, ApiError } from "./api";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: false,
      retry: (count, err) => !(err instanceof ApiError && err.status < 500) && count < 2,
    },
  },
});

type Params = Record<string, string | number | boolean | null | undefined>;

/** Fetch an API resource. The key is the path + params, so URL-driven filters just work. */
export function useApi<T>(path: string | null, params?: Params, opts?: { enabled?: boolean; refetchInterval?: number }) {
  return useQuery<T, ApiError>({
    queryKey: [path, params ?? {}],
    queryFn: () => apiGet<T>(path!, params),
    enabled: !!path && (opts?.enabled ?? true),
    // Keep the previous data only while filters/pagination of the SAME endpoint change; a
    // different resource (e.g. another /members/:id) must never show the previous one.
    placeholderData: (prev, prevQuery) => (prevQuery?.queryKey[0] === path ? keepPreviousData(prev) : undefined),
    refetchInterval: opts?.refetchInterval,
  });
}

/** After a mutation: refetch everything that is on screen (the equivalent of router.refresh()). */
export function refreshAll() {
  return queryClient.invalidateQueries();
}
