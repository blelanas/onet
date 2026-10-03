import { useTranslations } from "use-intl";
import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "@/lib/router";
import { Loader2, SendHorizontal } from "lucide-react";
import { toast } from "sonner";
import { sendMessage } from "@/api/communication";

/** Reply box at the bottom of a thread: Enter sends, Shift+Enter adds a line. */
export function MessageComposer({ conversationId }: { conversationId: string }) {
  const t = useTranslations("communication.messages");
  const tc = useTranslations("common");
  const router = useRouter();
  const [body, setBody] = useState("");
  const [pending, start] = useTransition();
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [body]);

  const submit = () => {
    const text = body.trim();
    if (!text || pending) return;
    start(async () => {
      const fd = new FormData();
      fd.set("conversationId", conversationId);
      fd.set("body", text);
      const res = await sendMessage(fd);
      if (res.ok) {
        // Keep anything typed while the message was sending.
        setBody((current) => (current.trim() === text ? "" : current));
        router.refresh();
        ref.current?.focus();
      } else toast.error(tc(res.error.startsWith("errors.") ? res.error : "errors.unexpected"));
    });
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      className="border-t border-line bg-surface p-3"
    >
      <div className="flex items-end gap-2 rounded-2xl border border-line bg-surface-2/50 p-1.5 ps-3 transition focus-within:border-brand-300 focus-within:ring-4 focus-within:ring-brand-100">
        <textarea
          ref={ref}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault();
              submit();
            }
          }}
          rows={1}
          maxLength={4000}
          placeholder={t("placeholder")}
          aria-label={t("placeholder")}
          className="max-h-40 min-h-10 flex-1 resize-none bg-transparent py-2 text-sm text-ink placeholder:text-muted/80 focus:outline-none"
        />
        <button
          type="submit"
          disabled={!body.trim() || pending}
          className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-600 text-white shadow-[var(--shadow-brand)] transition hover:bg-brand-700 disabled:opacity-40 disabled:shadow-none"
          aria-label={tc("actions.send")}
        >
          {pending ? <Loader2 className="size-4 animate-spin" /> : <SendHorizontal className="rtl-flip size-4" />}
        </button>
      </div>
      <p className="mt-1.5 hidden px-1 text-[11px] text-muted sm:block">{t("enterHint")}</p>
    </form>
  );
}

/** Keeps the thread scrolled to the newest message when it changes. */
export function ScrollToBottom({ dep }: { dep: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const box = ref.current?.closest("[data-scroll]");
    if (box) box.scrollTop = box.scrollHeight;
  }, [dep]);
  return <div ref={ref} />;
}
