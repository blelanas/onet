// Trips mutations — same signatures as the former server actions, now calling the API.
import { apiSend, formAction } from "@/lib/api";

export const saveTrip = formAction<{ id: string }>("POST", "/trips");
export const deleteTrip = (id: string) => apiSend("DELETE", `/trips/${id}`);
export const addTripMonitor = formAction("POST", (v) => `/trips/${v.tripId}/monitors`);
export const removeTripMonitor = (tripId: string, memberId: string) => apiSend("DELETE", `/trips/${tripId}/monitors/${memberId}`);
export const saveTripRollCall = formAction<{ count: number }>("POST", (v) => `/trips/${v.id}/rollcall`);
