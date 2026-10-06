import { apiSend, formAction } from "@/lib/api";

export const addDocument = formAction<{ id: string }>("POST", "/documents");
export const deleteDocument = (id: string) => apiSend("DELETE", `/documents/${id}`);
/** Deletes an upload that was never attached to a document (server checks ownership and that nothing uses it). */
export const discardUpload = (url: string) => apiSend("DELETE", url.replace(/^\/api/, ""));
