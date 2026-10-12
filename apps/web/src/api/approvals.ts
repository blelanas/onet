// Approvals mutations (self sign-ups, invitation links, pre-approved list).
import { apiSend, formAction } from "@/lib/api";

export const approveUsers = (ids: string[]) => apiSend<{ count: number }>("POST", "/approvals/approve", { ids });
export const rejectUsers = (ids: string[]) => apiSend<{ count: number }>("POST", "/approvals/reject", { ids });

export type CreatedInvitation = { id: string; token: string; role: string; label: string | null; expiresAt: Date; maxUses: number };
export const createInvitation = formAction<CreatedInvitation>("POST", "/approvals/invitations");
export const revokeInvitation = (id: string) => apiSend("POST", `/approvals/invitations/${id}/revoke`);

export type ImportSummary = { added: number; duplicates: number; duplicateLines: number[]; existingLines: number[]; invalid: { line: number; reason: "name" | "contact" | "email" | "phone" }[] };
export const importPreapproved = formAction<ImportSummary>("POST", "/approvals/preapproved/import");
export const deletePreapproved = (id: string) => apiSend("DELETE", `/approvals/preapproved/${id}`);
