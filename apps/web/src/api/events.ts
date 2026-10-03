// Events mutations — same signatures as the former server actions, now calling the API.
import { apiSend, formAction } from "@/lib/api";

export const saveEvent = formAction<{ id: string }>("POST", "/events");
export const deleteEvent = (id: string) => apiSend("DELETE", `/events/${id}`);
export const saveEventCheckIn = formAction<{ count: number }>("POST", (v) => `/events/${v.id}/checkin`);
