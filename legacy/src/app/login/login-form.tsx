"use client";
import Link from "next/link";
import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Eye, EyeOff, Lock, Mail } from "lucide-react";
import { login } from "@/actions/auth";
import { ActionForm } from "@/components/ui/action-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ROLE_COLORS } from "@/lib/permissions";

const DEMO = [
  { role: "super_admin", email: "admin@onet-teboulba.tn" },
  { role: "admin", email: "gestion@onet-teboulba.tn" },
  { role: "accountant", email: "comptable@onet-teboulba.tn" },
  { role: "monitor", email: "moniteur@onet-teboulba.tn" },
  { role: "parent", email: "parent@onet-teboulba.tn" },
  { role: "kid", email: "enfant@onet-teboulba.tn" },
  { role: "member", email: "membre@onet-teboulba.tn" },
] as const;
const DEMO_PASSWORD = "Onet2026!";

export function LoginForm({ next }: { next?: string }) {
  const t = useTranslations("auth.login");
  const tr = useTranslations("common.roles");
  const [show, setShow] = useState(false);
  const email = useRef<HTMLInputElement>(null);
  const password = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <>
      <ActionForm action={login} successMessage="toast.welcome" redirectTo={(d) => d?.next ?? "/dashboard"} className="mt-8 space-y-4">
        {(pending) => (
          <>
            <input type="hidden" name="next" value={next ?? ""} />
            <Input ref={email} name="email" type="email" autoComplete="email" label={t("email")} icon={<Mail className="size-4" />} required placeholder="nom@exemple.tn" />
            <div className="relative">
              <Input ref={password} name="password" type={show ? "text" : "password"} autoComplete="current-password" label={t("password")} icon={<Lock className="size-4" />} required className="pe-11" />
              <button type="button" onClick={() => setShow((s) => !s)} className="absolute end-2 top-[34px] rounded-lg p-1.5 text-muted hover:text-ink" aria-label={t("showPassword")}>
                {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
            <Button type="submit" size="lg" className="w-full" loading={pending}>
              {t("submit")}
            </Button>
            <p className="text-center text-xs text-muted">{t("forgot")}</p>
          </>
        )}
      </ActionForm>
      <p className="mt-6 text-center text-sm text-ink-2">
        {t("noAccount")}{" "}
        <Link href="/join" className="font-bold text-brand-600 hover:underline">
          {t("join")}
        </Link>
      </p>

      <div className="mt-8 rounded-2xl border border-dashed border-brand-200 bg-surface p-4" ref={formRef as never}>
        <p className="text-sm font-bold text-ink">{t("demoTitle")}</p>
        <p className="mb-3 text-xs text-muted">{t("demoHint", { password: DEMO_PASSWORD })}</p>
        <div className="flex flex-wrap gap-2">
          {DEMO.map((d) => (
            <button
              key={d.email}
              type="button"
              onClick={() => {
                if (email.current) email.current.value = d.email;
                if (password.current) password.current.value = DEMO_PASSWORD;
                password.current?.focus();
              }}
              className="rounded-full px-3 py-1 text-xs font-bold text-white transition hover:scale-105"
              style={{ background: ROLE_COLORS[d.role] }}
            >
              {tr(d.role)}
            </button>
          ))}
        </div>
      </div>
    </>
  );
}
