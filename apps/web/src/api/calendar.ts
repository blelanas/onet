// Calendar mutations — same signatures as the former server actions, now calling the API.
import { apiSend, formAction } from "@/lib/api";

export const saveCalendarEntry = formAction<{ id: string }>("POST", "/calendar/entries");
export const deleteCalendarEntry = (id: string) => apiSend("DELETE", `/calendar/entries/${id}`);
