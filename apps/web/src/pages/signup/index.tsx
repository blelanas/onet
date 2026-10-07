import { useState } from "react";
import { useTranslations } from "use-intl";
import { Navigate } from "react-router";
import { AlertTriangle, Eye, EyeOff, Lock, Mail, Phone, ShieldCheck, User } from "lucide-react";
import type { invitationPreview } from "@api/modules/signup/routes";
import { apiSend, formToObject, type ActionResult } from "@/lib/api";
import { signIn, useAuth } from "@/lib/auth";
import { useApi } from "@/lib/query";
import { Link, useSearchParams } from "@/lib/router";
import { usePageTitle } from "@/lib/title";
import type { Loaded } from "@/lib/types";
import { AuthLayout } from "@/components/layout/auth-layout";
import { ActionForm } from "@/components/ui/action-form";
import { Button, LinkButton } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";

type Preview = Loaded<typeof invitationPreview>;

/** /signup — parents create their account directly; `?invite=` links create a pending monitor/member account. */
export function Component() {
  const { me } = useAuth();
  const invite = useSearchParams().get("invite")?.trim() || null;
  const t = useTranslations("auth.signup");
  usePageTitle(invite ? t("titleInvite") : t("titleParent"));
  if (me) return <Navigate to="/dashboard" replace />;
  return (
    <AuthLayout sideTitle={t("sideTitle")} sideText={t("sideText")} wide>
      {invite ? <InviteSignup invite={invite} /> : <ParentSignup />}
      <p className="mt-6 text-center text-sm text-ink-2">
        {t("haveAccount")}{" "}
        <Link href="/login" className="font-bold text-brand-600 hover:underline">
          {t("login")}
        </Link>
      </p>
    </AuthLayout>
  );
}

function ParentSignup() {
  const t = useTranslations("auth.signup");
  return (
    <>
      <h1 className="text-3xl font-extrabold text-ink">{t("titleParent")}</h1>
      <p className="mt-2 text-muted">{t("subtitleParent")}</p>
      <SignupForm />
    </>
  );
}

function InviteSignup({ invite }: { invite: string }) {
  const t = useTranslations("auth.signup");
  const tr = useTranslations("common.roles");
  const query = useApi<Preview>(`/auth/invitations/${encodeURIComponent(invite)}`);
  const data = query.data;
  return (
    <>
      <h1 className="text-3xl font-extrabold text-ink">{t("titleInvite")}</h1>
      <p className="mt-2 text-muted">{t("subtitleInvite")}</p>
      {query.isLoading ? (
        <div className="mt-6 space-y-3" aria-label={t("checking")}>
          <Skeleton className="h-20 w-full rounded-2xl" />
          <Skeleton className="h-64 w-full rounded-2xl" />
        </div>
      ) : data?.valid ? (
        <>
          <div className="mt-6 flex gap-3 rounded-2xl border border-sky-200/70 bg-sky-soft p-4 text-sky-900" role="status">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-white text-sky-700 shadow-sm">
              <ShieldCheck className="size-5" />
            </span>
            <div className="min-w-0">
              <p className="font-extrabold">
                {t("inviteBanner", { role: tr(data.role) })}
                {data.label && <span className="font-bold text-sky-800"> — {data.label}</span>}
              </p>
              <p className="mt-0.5 text-sm text-sky-800">{t("inviteNote")}</p>
            </div>
          </div>
          <SignupForm invite={invite} />
        </>
      ) : (
        <div className="mt-6 rounded-2xl border border-red-200/70 bg-red-50 p-5 text-red-800" role="alert" data-testid="invite-error">
          <p className="flex items-center gap-2 font-extrabold">
            <AlertTriangle className="size-5 shrink-0" /> {t(`inviteError.${data && !data.valid ? data.reason : "invalid"}`)}
          </p>
          <p className="mt-1 text-sm">{t("inviteErrorHint")}</p>
          <LinkButton href="/signup" variant="outline" className="mt-4">
            {t("createParent")}
          </LinkButton>
        </div>
      )}
    </>
  );
}

function SignupForm({ invite }: { invite?: string }) {
  const t = useTranslations("auth.signup");
  const tl = useTranslations("auth.login");
  const [show, setShow] = useState(false);
  const submit = async (fd: FormData): Promise<ActionResult<{ status: string }>> => {
    const values = formToObject(fd);
    if (values.password !== values.confirm) return { ok: false, error: "errors.passwordMismatch", fieldErrors: { confirm: "errors.passwordMismatch" } };
    delete values.confirm;
    const res = await apiSend<{ token: string; status: string }>("POST", "/auth/signup", { ...values, invite });
    if (!res.ok) return res;
    await signIn(res.data!.token);
    return { ok: true, data: { status: res.data!.status } };
  };
  return (
    <ActionForm action={submit} successMessage={t("created")} redirectTo="/dashboard" className="mt-6 flex flex-col gap-4">
      {(pending) => (
        <>
          <Input name="name" autoComplete="name" label={t("name")} icon={<User className="size-4" />} required maxLength={80} />
          <div className="grid gap-4 sm:grid-cols-2">
            <Input name="email" type="email" autoComplete="email" label={t("email")} icon={<Mail className="size-4" />} required placeholder="nom@exemple.tn" />
            <Input name="phone" type="tel" autoComplete="tel" label={t("phone")} icon={<Phone className="size-4" />} required placeholder="+216 22 345 678" />
          </div>
          <div className="relative">
            <Input name="password" type={show ? "text" : "password"} autoComplete="new-password" label={t("password")} hint={t("passwordHint")} icon={<Lock className="size-4" />} required className="pe-11" />
            <button type="button" onClick={() => setShow((s) => !s)} className="absolute end-2 top-[34px] rounded-lg p-1.5 text-muted hover:text-ink" aria-label={tl("showPassword")} aria-pressed={show}>
              {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
          <Input name="confirm" type={show ? "text" : "password"} autoComplete="new-password" label={t("confirm")} icon={<Lock className="size-4" />} required />
          <Button type="submit" size="lg" className="w-full" loading={pending}>
            {t("submit")}
          </Button>
        </>
      )}
    </ActionForm>
  );
}
