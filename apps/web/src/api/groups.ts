// Groups mutations — same signatures as the former server actions, now calling the API.
import { apiSend, formAction } from "@/lib/api";

export const saveGroup = formAction<{ id: string }>("POST", "/groups");
export const deleteGroup = (id: string) => apiSend("DELETE", `/groups/${id}`);
export const addChildToGroup = (groupId: string, childId: string) => apiSend("POST", `/groups/${groupId}/children`, { childId });
export const removeChildFromGroup = (groupId: string, childId: string) => apiSend("DELETE", `/groups/${groupId}/children/${childId}`);
export const assignMonitor = formAction("POST", (v) => `/groups/${v.groupId}/monitors`);
export const setLeadMonitor = (groupId: string, memberId: string) => apiSend("POST", `/groups/${groupId}/monitors/${memberId}/lead`);
export const removeMonitor = (groupId: string, memberId: string) => apiSend("DELETE", `/groups/${groupId}/monitors/${memberId}`);
export const createGroupTask = formAction("POST", (v) => `/groups/${v.groupId}/tasks`);
export const cycleTaskStatus = (taskId: string) => apiSend("POST", `/groups/tasks/${taskId}/cycle`);
export const deleteGroupTask = (taskId: string) => apiSend("DELETE", `/groups/tasks/${taskId}`);
