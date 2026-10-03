// Dashboard mutations — same signatures as the former server actions, now calling the API.
import { apiSend } from "@/lib/api";

/** A monitor updates the status of one of their own tasks. */
export const setMyTaskStatus = (id: string, status: string) => apiSend("POST", `/dashboard/tasks/${id}/status`, { status });
