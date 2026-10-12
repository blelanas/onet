// Communication mutations — same signatures as the former server actions, now calling the API.
import { apiSend, formAction } from "@/lib/api";

// Announcements
export const saveAnnouncement = formAction<{ id: string }>("POST", "/announcements");
export const deleteAnnouncement = (id: string) => apiSend("DELETE", `/announcements/${id}`);
export const togglePin = (id: string) => apiSend("POST", `/announcements/${id}/pin`);

// Messages
export const startConversation = formAction<{ id: string }>("POST", "/messages/conversations");
export const sendMessage = formAction<{ id: string }>("POST", "/messages");

// Chat groups
/** FormData: title, userIds[] */
export const createGroup = formAction<{ id: string }>("POST", "/messages/groups");
/** FormData: id, title (rename). */
export const renameGroup = formAction<{ id: string }>("POST", (v) => `/messages/groups/${v.id}`);
export type GroupPatch = { title?: string; addUserIds?: string[]; removeUserIds?: string[]; makeAdminIds?: string[] };
export const updateGroup = (id: string, patch: GroupPatch) => apiSend<{ id: string }>("POST", `/messages/groups/${id}`, patch);
export const leaveGroup = (id: string) => apiSend<{ id: string }>("POST", `/messages/groups/${id}/leave`);

// Notifications
export const markNotificationRead = (id: string) => apiSend("POST", `/notifications/${id}/read`);
export const markNotificationUnread = (id: string) => apiSend("POST", `/notifications/${id}/unread`);
export const markAllNotificationsRead = () => apiSend("POST", "/notifications/read-all");
export const deleteNotification = (id: string) => apiSend("DELETE", `/notifications/${id}`);
/** Marks the notification read and returns its (internal) link. */
export const openNotification = (id: string) => apiSend<{ link: string }>("POST", `/notifications/${id}/open`);
export const broadcastNotification = formAction<{ recipients: number }>("POST", "/notifications/broadcast");
