"use client";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { Bell, Info, Mail, MessageSquareText, Smartphone } from "lucide-react";
import { saveNotificationChannels } from "@/server/settings/actions";
import { ActionForm } from "@/components/ui/action-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { NOTIFICATION_CHANNELS } from "@/lib/constants";
import { cn } from "@/lib/utils";

const ICONS = { IN_APP: Bell, EMAIL: Mail, SMS: MessageSquareText, PUSH: Smartphone } as const;
const COLORS = { IN_APP: "#E30613", EMAIL: "#1E9BD7", SMS: "#2BB673", PUSH: "#7C4DFF" } as const;

export function ChannelsForm({ enabled }: { enabled: string[] }) {
  const t = useTranslations("settings.notifications");
  const tc = useTranslations("common");
  const [on, setOn] = useState(() => new Set(["IN_APP", ...enabled]));
  return (
    <ActionForm action={saveNotificationChannels} className="space-y-4">
      {(pending) => (
        <>
          <ul className="grid gap-3 sm:grid-cols-2">
            {NOTIFICATION_CHANNELS.map((c) => {
              const Icon = ICONS[c];
              const always = c === "IN_APP";
              const active = on.has(c);
              return (
                <li key={c}>
                  <label className={cn("flex h-full cursor-pointer items-start gap-3 rounded-2xl border-2 p-4 transition", active ? "border-transparent bg-surface shadow-[var(--shadow-soft)] ring-2" : "border-line bg-surface-2/40", always && "cursor-default")} style={{ "--tw-ring-color": COLORS[c] } as React.CSSProperties}>
                    <span className="grid size-11 shrink-0 place-items-center rounded-2xl" style={{ background: `${COLORS[c]}1A`, color: COLORS[c] }}>
                      <Icon className="size-5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-2 font-extrabold text-ink">
                        {tc(`enums.channel.${c}`)}
                        {always ? <Badge tone="success">{t("always")}</Badge> : active ? <Badge tone="warning">{t("pending")}</Badge> : null}
                      </span>
                      <span className="mt-0.5 block text-sm text-muted">{t(`descriptions.${c}`)}</span>
                    </span>
                    {/* switch */}
                    <input
                      type="checkbox"
                      name={always ? undefined : "channels[]"}
                      value={c}
                      checked={active}
                      disabled={always}
                      onChange={(e) =>
                        setOn((s) => {
                          const n = new Set(s);
                          if (e.target.checked) n.add(c);
                          else n.delete(c);
                          return n;
                        })
                      }
                      className="peer sr-only"
                    />
                    <span aria-hidden className={cn("relative mt-1 h-6 w-11 shrink-0 rounded-full transition", active ? "" : "bg-line")} style={active ? { background: COLORS[c] } : undefined}>
                      <span className={cn("absolute top-0.5 size-5 rounded-full bg-white shadow transition-all", active ? "end-0.5" : "start-0.5")} />
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
          <p className="flex items-start gap-2 rounded-2xl bg-sky-soft p-3 text-sm text-sky-800">
            <Info className="mt-0.5 size-4 shrink-0" /> {t("providerNote")}
          </p>
          <div className="flex justify-end">
            <Button type="submit" loading={pending}>
              {tc("actions.save")}
            </Button>
          </div>
        </>
      )}
    </ActionForm>
  );
}
