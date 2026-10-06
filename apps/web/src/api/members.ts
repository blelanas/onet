// Members mutations — same signatures as the former server actions, now calling the API.
import { apiSend, formAction } from "@/lib/api";

export const saveMember = formAction<{ id: string }>("POST", "/members");
export const linkGuardian = formAction("POST", (v) => `/members/${v.childId}/guardians`);
export const createMemberAccount = formAction("POST", (v) => `/members/${v.memberId}/account`);
export const deleteMember = (id: string) => apiSend("DELETE", `/members/${id}`);
export const unlinkGuardian = (childId: string, parentId: string) => apiSend("DELETE", `/members/${childId}/guardians/${parentId}`);
/** Multipart: the CSV file goes to the API as-is. */
export const importMembers = (fd: FormData) => apiSend<{ created: number; errorLines: number[] }>("POST", "/members/import", fd);
