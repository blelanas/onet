// Communication mutations — same signatures as the former server actions, now calling the API.
import { apiSend, formAction } from "@/lib/api";

// Announcements
export const saveAnnouncement = formAction<{ id: string }>("POST", "/announcements");
export const deleteAnnouncement = (id: string) => apiSend("DELETE", `/announcements/${id}`);
export const togglePin = (id: string) => apiSend("POST", `/announcements/${id}/pin`);

// Messages
export const startConversation = formAction<{ id: string }>("POST", "/messages/conversations");
export const sendMessage = formAction<{ id: string }>("POST", "/messages");

// Notifications
export const markNotificationRead = (id: string) => apiSend("POST", `/notifications/${id}/read`);
export const markNotificationUnread = (id: string) => apiSend("POST", `/notifications/${id}/unread`);
export const markAllNotificationsRead = () => apiSend("POST", "/notifications/read-all");
export const deleteNotification = (id: string) => apiSend("DELETE", `/notifications/${id}`);
/** Marks the notification read and returns its (internal) link. */
export const openNotification = (id: string) => apiSend<{ link: string }>("POST", `/notifications/${id}/open`);
export const broadcastNotification = formAction<{ recipients: number }>("POST", "/notifications/broadcast");
