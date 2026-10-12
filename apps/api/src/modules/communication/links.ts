/** Link of a conversation (also the key used to de-duplicate its MESSAGE notifications). */
export function conversationLink(id: string) {
  return `/dashboard/messages?c=${id}`;
}
