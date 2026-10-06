// Content mutations (songs, games, conferences, resources) — same signatures as the former server actions.
import { apiSend, formAction, type ActionResult } from "@/lib/api";
import { queryClient } from "@/lib/query";

/**
 * ActionForm / ConfirmButton only refresh when they don't redirect, so after a successful
 * mutation every cached query is marked stale: the page we land on refetches on mount instead of
 * showing the pre-mutation data (no refetch of the page we're leaving, which may now 404).
 */
function staleOnSuccess<A extends unknown[], T>(fn: (...args: A) => Promise<ActionResult<T>>) {
  return async (...args: A) => {
    const res = await fn(...args);
    if (res.ok) await queryClient.invalidateQueries({ refetchType: "none" });
    return res;
  };
}

export const saveSong = staleOnSuccess(formAction<{ id: string }>("POST", "/content/songs"));
export const deleteSong = staleOnSuccess((id: string) => apiSend("DELETE", `/content/songs/${id}`));
/** Called by the player once each time a song starts playing. Returns the new count. */
export const recordSongPlay = staleOnSuccess((id: string) => apiSend<{ plays: number }>("POST", `/content/songs/${id}/play`));

export const saveGame = staleOnSuccess(formAction<{ id: string }>("POST", "/content/games"));
export const deleteGame = staleOnSuccess((id: string) => apiSend("DELETE", `/content/games/${id}`));

export const saveConference = staleOnSuccess(formAction<{ id: string }>("POST", "/content/conferences"));
export const deleteConference = staleOnSuccess((id: string) => apiSend("DELETE", `/content/conferences/${id}`));

export const saveResource = staleOnSuccess(formAction<{ id: string }>("POST", "/content/resources"));
export const deleteResource = staleOnSuccess((id: string) => apiSend("DELETE", `/content/resources/${id}`));
