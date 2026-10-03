// Settings mutations — same signatures as the former server actions, now calling the API.
import { apiSend, formAction } from "@/lib/api";

export const saveOrganization = formAction("POST", "/settings/organization");
export const saveNotificationChannels = formAction("POST", "/settings/notifications");
export const savePaymentSettings = formAction("POST", "/settings/payments");

export const createUser = formAction<{ id: string }>("POST", "/settings/users");
export const updateUserRoles = formAction("POST", (v) => `/settings/users/${v.userId}/roles`);
export const resetUserPassword = formAction("POST", (v) => `/settings/users/${v.userId}/password`);
export const setUserActive = (userId: string, active: boolean) => apiSend("POST", `/settings/users/${userId}/active`, { active });

export const setRolePermission = (roleId: string, permission: string, granted: boolean) => apiSend("POST", `/settings/roles/${roleId}/permissions`, { permission, granted });
export const createRole = formAction<{ id: string }>("POST", "/settings/roles");
export const deleteRole = (id: string) => apiSend("DELETE", `/settings/roles/${id}`);

export const setContactMessageRead = (id: string, isRead: boolean) => apiSend("POST", `/settings/contact/${id}/read`, { isRead });
export const deleteContactMessage = (id: string) => apiSend("DELETE", `/settings/contact/${id}`);
