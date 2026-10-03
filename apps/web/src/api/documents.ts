import { apiSend, formAction } from "@/lib/api";

export const addDocument = formAction<{ id: string }>("POST", "/documents");
export const deleteDocument = (id: string) => apiSend("DELETE", `/documents/${id}`);
