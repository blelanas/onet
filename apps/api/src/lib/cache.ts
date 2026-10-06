/**
 * The Next.js app used `revalidatePath()` after mutations. With a separate API the web client
 * refetches its queries after every successful mutation, so this is a no-op kept for ported code.
 */
export function revalidatePath(_path?: string, _type?: "layout" | "page") {}
