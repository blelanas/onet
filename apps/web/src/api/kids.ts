// Kids of the programmes: edition kids, team assignment and the kid card.
import { apiSend, formAction } from "@/lib/api";

export const addKid = formAction<{ registrationId: string; memberId: string }>("POST", (v) => `/events/${v.eventId}/kids`);
export const addExistingKid = (eventId: string, memberId: string, teamId?: string | null) => apiSend<{ registrationId: string; memberId: string }>("POST", `/events/${eventId}/kids`, { memberId, teamId: teamId || undefined });
export const setKidTeam = (eventId: string, registrationId: string, teamId: string | null) => apiSend<{ teamId: string | null }>("POST", `/events/${eventId}/kids/${registrationId}/team`, { teamId });
export const removeKid = (eventId: string, registrationId: string) => apiSend("DELETE", `/events/${eventId}/kids/${registrationId}`);
export const updateKid = formAction<{ id: string }>("POST", (v) => `/kids/${v.id}`);
