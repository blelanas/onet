// Trips mutations — same signatures as the former server actions, now calling the API.
import { apiSend, formAction } from "@/lib/api";

export const saveTrip = formAction<{ id: string }>("POST", "/trips");
export const deleteTrip = (id: string) => apiSend("DELETE", `/trips/${id}`);
export const addTripMonitor = formAction("POST", (v) => `/trips/${v.tripId}/monitors`);
export const removeTripMonitor = (tripId: string, memberId: string) => apiSend("DELETE", `/trips/${tripId}/monitors/${memberId}`);
export const saveTripRollCall = formAction<{ count: number }>("POST", (v) => `/trips/${v.id}/rollcall`);

// Trip managers: participant list, payments, finalization.
/** FormData: tripId + memberId, or tripId + firstName, lastName, dateOfBirth, phone?, parentName?, parentPhone?, parentRelation?, notes? */
export const addTripParticipant = formAction<{ id: string; status: string; memberId: string }>("POST", (v) => `/trips/${v.tripId}/participants`);
export const addExistingParticipant = (tripId: string, memberId: string) => apiSend<{ id: string; status: string; memberId: string }>("POST", `/trips/${tripId}/participants`, { memberId });
export const removeTripParticipant = (tripId: string, registrationId: string) => apiSend<{ refundNeeded: boolean }>("DELETE", `/trips/${tripId}/participants/${registrationId}`);
/** FormData: tripId, registrationId, amount (TND), method, note? */
export const recordTripPayment = formAction<{ status: string; remaining: number }>("POST", (v) => `/trips/${v.tripId}/participants/${v.registrationId}/payments`);
export const finalizeTripList = (tripId: string) => apiSend("POST", `/trips/${tripId}/finalize`);
export const reopenTripList = (tripId: string) => apiSend("POST", `/trips/${tripId}/reopen`);
