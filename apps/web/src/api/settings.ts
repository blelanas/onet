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

export const saveBureauMember = formAction<{ id: string }>("POST", "/settings/bureau");
/** Shows / hides a bureau member on the landing page (the save endpoint takes the whole row). */
export const setBureauMemberActive = (row: { id: string; name: string; nameAr: string | null; position: string; positionAr: string | null; photoUrl: string | null }, isActive: boolean) =>
  apiSend("POST", "/settings/bureau", { id: row.id, name: row.name, nameAr: row.nameAr ?? "", position: row.position, positionAr: row.positionAr ?? "", photoUrl: row.photoUrl ?? "", isActive });
export const moveBureauMember = (id: string, direction: "up" | "down") => apiSend("POST", `/settings/bureau/${id}/move`, { direction });
export const deleteBureauMember = (id: string) => apiSend("DELETE", `/settings/bureau/${id}`);

export const setContactMessageRead =(id: string, isRead: boolean) => apiSend("POST", `/settings/contact/${id}/read`, { isRead });
export const deleteContactMessage = (id: string) => apiSend("DELETE", `/settings/contact/${id}`);
