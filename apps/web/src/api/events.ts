// Events mutations — same signatures as the former server actions, now calling the API.
import type { AttendanceStatus } from "@onet/shared";
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

// Group attendance of an event: one roll call per team and per session ("YYYY-MM-DD").
export const saveEventAttendance = (eventId: string, input: { date: string; teamId: string; entries: { memberId: string; status: AttendanceStatus; note?: string }[] }) =>
  apiSend<{ saved: number; present: number }>("POST", `/events/${eventId}/attendance`, input);
