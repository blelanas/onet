// Activities mutations — same signatures as the former server actions, now calling the API.
import { apiSend, formAction } from "@/lib/api";

export const saveActivity = formAction<{ id: string }>("POST", "/activities");
export const deleteActivity = (id: string) => apiSend("DELETE", `/activities/${id}`);
export const enrollChild = (activityId: string, memberId: string) => apiSend("POST", `/activities/${activityId}/participants`, { memberId });
export const unenrollChild = (activityId: string, memberId: string) => apiSend("DELETE", `/activities/${activityId}/participants/${memberId}`);
export const addActivityReport = formAction("POST", (v) => `/activities/${v.activityId}/reports`);
export const deleteActivityReport = (id: string) => apiSend("DELETE", `/activities/reports/${id}`);
