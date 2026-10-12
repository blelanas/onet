// Events mutations — same signatures as the former server actions, now calling the API.
import { apiSend, formAction } from "@/lib/api";

export const saveEvent = formAction<{ id: string }>("POST", "/events");
export const deleteEvent = (id: string) => apiSend("DELETE", `/events/${id}`);
export const saveEventCheckIn = formAction<{ count: number }>("POST", (v) => `/events/${v.id}/checkin`);

// Programmes (series) and their editions.
export const saveSeries = formAction<{ id: string }>("POST", "/series");
export const deleteSeries = (id: string) => apiSend("DELETE", `/series/${id}`);
export const createEdition = formAction<{ id: string; editionNumber: number; seasonYear: number; title: string; copiedTeams: number }>("POST", (v) => `/series/${v.seriesId}/editions`);

// Edition teams (each team has a group chat kept in sync by the API).
export const saveTeam = formAction<{ id: string; conversationId: string | null }>("POST", (v) => `/events/${v.eventId}/teams`);
export const deleteTeam = (teamId: string) => apiSend("DELETE", `/events/teams/${teamId}`);
