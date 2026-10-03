// Join requests mutations — same signatures as the former server actions.
import { apiSend, formAction } from "@/lib/api";

export const approveJoinRequest = formAction<{ parentId: string; childId: string | null; reusedParent: boolean }>("POST", (v) => `/join-requests/${v.id}/approve`);
export const rejectJoinRequest = (id: string) => apiSend("POST", `/join-requests/${id}/reject`);
