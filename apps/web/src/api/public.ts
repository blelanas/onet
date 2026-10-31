import { formAction } from "@/lib/api";

/** Anonymous public-site forms (honeypot + per-IP rate limit enforced by the API). */
export const submitContactMessage = formAction<{ id: string }>("POST", "/public/contact");
