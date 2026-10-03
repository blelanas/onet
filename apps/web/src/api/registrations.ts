// Registrations mutations — same signatures as the former server actions, now calling the API.
import { apiSend, formAction } from "@/lib/api";

type RegKind = "event" | "trip";

export const registerMembers = formAction("POST", "/registrations");
export const addParticipant = formAction("POST", "/registrations/participants");
export const bulkRegistrations = formAction<{ done: number }>("POST", "/registrations/bulk");
export const cancelRegistrationAction = (kind: RegKind, id: string) => apiSend<{ refundNeeded: boolean }>("POST", `/registrations/${kind}/${id}/cancel`);
export const setRegistrationStatusAction = (kind: RegKind, id: string, status: "CONFIRMED" | "WAITLIST" | "PENDING") => apiSend("POST", `/registrations/${kind}/${id}/status`, { status });
export const updateTripRegistration = (id: string, patch: { parentConsent?: boolean; documentsStatus?: string }) => apiSend("PATCH", `/registrations/trip/${id}`, patch);
