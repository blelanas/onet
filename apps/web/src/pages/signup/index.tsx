import { useState } from "react";
import { useTranslations } from "use-intl";
import { Navigate } from "react-router";
import { AlertTriangle, Briefcase, CalendarDays, Eye, EyeOff, GraduationCap, Hourglass, Lock, Mail, Phone, ShieldCheck, Sparkles, User, type LucideIcon } from "lucide-react";
import type { invitationPreview } from "@api/modules/signup/routes";
import { OCCUPATIONS, toDateInput, type Occupation } from "@onet/shared";
import { apiSend, formToObject, type ActionResult } from "@/lib/api";
import { signIn, useAuth } from "@/lib/auth";
import { useApi } from "@/lib/query";
import { Link, useLocation, useSearchParams } from "@/lib/router";
import { usePageTitle } from "@/lib/title";
import type { Loaded } from "@/lib/types";
import { cn } from "@/lib/utils";
import { GoogleSignIn, type GoogleProfile } from "@/components/auth/google-button";
import { AuthLayout } from "@/components/layout/auth-layout";
import { ActionForm } from "@/components/ui/action-form";
import { Button, LinkButton } from "@/components/ui/button";
import { useFieldError } from "@/components/ui/form-context";
import { Input, useErrorText } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";

type Preview = Loaded<typeof invitationPreview>;

/** Same bounds as the API (modules/signup/lib.ts). */
const MIN_AGE = 12;
const MAX_AGE = 100;

/**
 * /signup — members (animators) create their account; it waits for the association's approval unless
 * they are on the pre-approved list. `?invite=` links show the invitation first.
 */
export function Component() {
  const { me } = useAuth();
  const invite = useSearchParams().get("invite")?.trim() || null;
  const t = useTranslations("auth.signup");
  usePageTitle(invite ? t("titleInvite") : t("title"));
  if (me) return <Navigate to="/dashboard" replace />;
  return (
    <AuthLayout sideTitle={t("sideTitle")} sideText={t("sideText")} wide>
      {invite ? <InviteSignup invite={invite} /> : <MemberSignup />}
      <p className="mt-6 text-center text-sm text-ink-2">
        {t("haveAccount")}{" "}
        <Link href="/login" className="font-bold text-brand-600 hover:underline">
          {t("login")}
        </Link>
      </p>
    </AuthLayout>
  );
}

function MemberSignup() {
  const t = useTranslations("auth.signup");
  return (
    <>
      <h1 className="text-3xl font-extrabold text-ink">{t("title")}</h1>
      <p className="mt-2 text-muted">{t("subtitle")}</p>
      <div className="mt-5 flex gap-3 rounded-2xl border border-sun/40 bg-sun-soft p-4 text-ink-2" role="note">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-sun text-ink shadow-sm">
          <Hourglass className="size-5" />
        </span>
        <p className="text-sm leading-relaxed">{t("approvalNote")}</p>
      </div>
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
            {t("withoutInvite")}
          </LinkButton>
        </div>
      )}
    </>
  );
}

/** Whole years from a "YYYY-MM-DD" date of birth to today, or null when the date isn't complete. */
function ageFromInput(v: string): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v);
  if (!m) return null;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const now = new Date();
  let age = now.getFullYear() - y;
  if (now.getMonth() + 1 < mo || (now.getMonth() + 1 === mo && now.getDate() < d)) age--;
  return age >= 0 && age < 150 ? age : null;
}

const OCCUPATION_STYLE: Record<Occupation, { icon: LucideIcon; tile: string }> = {
  STUDENT: { icon: GraduationCap, tile: "bg-sky-soft text-sky" },
  WORKER: { icon: Briefcase, tile: "bg-leaf-soft text-leaf" },
  OTHER: { icon: Sparkles, tile: "bg-sun-soft text-ink" },
};

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="pt-2 text-xs font-extrabold tracking-[0.12em] text-muted uppercase">{children}</h2>;
}

/**
 * Prefill from "Continue with Google" when that e-mail has no account yet: only the router state set by
 * the Google button after the server answered "no account" (`{ google: GoogleProfile }`).
 */
function googlePrefill(state: unknown): GoogleProfile | null {
  const g = (state as { google?: Partial<GoogleProfile> | null } | null)?.google;
  const pick = (v: unknown) => (typeof v === "string" ? v.trim().slice(0, 254) : "");
  const email = pick(g?.email);
  if (!email) return null;
  return { email, firstName: pick(g?.firstName).slice(0, 40), lastName: pick(g?.lastName).slice(0, 40) };
}

function SignupForm({ invite }: { invite?: string }) {
  const t = useTranslations("auth.signup");
  const tl = useTranslations("auth.login");
  const tg = useTranslations("auth.google");
  const location = useLocation();
  const [google, setGoogle] = useState<GoogleProfile | null>(() => googlePrefill(location.state));
  // Remounts the name and e-mail fields with the Google values (the other fields keep what was typed).
  const prefillKey = google ? `g:${google.email}` : "blank";
  const [show, setShow] = useState(false);
  const [dob, setDob] = useState("");
  const [occupation, setOccupation] = useState<Occupation | null>(null);
  const age = ageFromInput(dob);
  const today = toDateInput(new Date());

  const submit = async (fd: FormData): Promise<ActionResult<{ status: string }>> => {
    const values = formToObject(fd);
    if (values.password !== values.confirm) return { ok: false, error: "errors.passwordMismatch", fieldErrors: { confirm: "errors.passwordMismatch" } };
    delete values.confirm;
    const res = await apiSend<{ token: string; status: string }>("POST", "/auth/signup", { ...values, invite });
    if (!res.ok) return res;
    await signIn(res.data!.token);
    return { ok: true, data: { status: res.data!.status }, message: res.data!.status === "PENDING" ? t("createdPending") : t("created") };
  };

  const detail = occupation ?? "none";
  return (
    <>
      {google ? (
        <p className="mt-6 rounded-2xl border border-sky-200/70 bg-sky-soft p-4 text-sm text-sky-900" role="status" data-testid="google-prefill">
          {tg("noAccount")}
        </p>
      ) : (
        <GoogleSignIn onNoAccount={(p) => p && setGoogle(p)} />
      )}
      <ActionForm action={submit} redirectTo="/dashboard" className="mt-6 flex flex-col gap-4">
        {(pending) => (
          <>
            <SectionTitle>{t("sections.identity")}</SectionTitle>
            <div className="grid gap-4 sm:grid-cols-2">
              <Input key={`fn-${prefillKey}`} name="firstName" autoComplete="given-name" label={t("firstName")} icon={<User className="size-4" />} required maxLength={40} dir="auto" defaultValue={google?.firstName} />
              <Input key={`ln-${prefillKey}`} name="lastName" autoComplete="family-name" label={t("lastName")} required maxLength={40} dir="auto" defaultValue={google?.lastName} />
            </div>
            <div className="grid items-end gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
              <Input
                name="dateOfBirth"
                type="date"
                autoComplete="bday"
                label={t("dateOfBirth")}
                hint={t("ageHint")}
                icon={<CalendarDays className="size-4" />}
                required
                min="1900-01-01"
                max={today}
                value={dob}
                onChange={(e) => setDob(e.target.value)}
              />
              <p
                aria-live="polite"
                className={cn(
                  "inline-flex h-10 items-center justify-center justify-self-start rounded-xl px-4 text-sm font-extrabold whitespace-nowrap transition sm:mb-[22px]",
                  age == null ? "bg-surface-2 text-muted" : age < MIN_AGE || age > MAX_AGE ? "bg-red-50 text-red-700" : "bg-leaf-soft text-emerald-800",
                )}
                data-testid="signup-age"
              >
                {age == null ? t("ageEmpty") : age < MIN_AGE ? t("ageTooYoung", { min: MIN_AGE }) : t("age", { age })}
              </p>
            </div>

            <SectionTitle>{t("sections.contact")}</SectionTitle>
            <div className="grid gap-4 sm:grid-cols-2">
              <Input key={`em-${prefillKey}`} name="email" type="email" autoComplete="email" label={t("email")} icon={<Mail className="size-4" />} required placeholder="nom@exemple.tn" dir="ltr" defaultValue={google?.email} />
              <Input name="phone" type="tel" autoComplete="tel" label={t("phone")} icon={<Phone className="size-4" />} required placeholder="+216 22 345 678" dir="ltr" />
            </div>

            <SectionTitle>{t("sections.occupation")}</SectionTitle>
            <OccupationCards value={occupation} onChange={setOccupation} />
            <Input
              key={detail}
              name="occupationDetail"
              label={t(`detail.${detail}.label`)}
              placeholder={t(`detail.${detail}.placeholder`)}
              required
              maxLength={120}
              disabled={!occupation}
              dir="auto"
            />

            <SectionTitle>{t("sections.security")}</SectionTitle>
            <div className="relative">
              <Input name="password" type={show ? "text" : "password"} autoComplete="new-password" label={t("password")} hint={t("passwordHint")} icon={<Lock className="size-4" />} required className="pe-11" />
              <button type="button" onClick={() => setShow((s) => !s)} className="absolute end-2 top-[34px] rounded-lg p-1.5 text-muted hover:text-ink" aria-label={tl("showPassword")} aria-pressed={show}>
                {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
            <Input name="confirm" type={show ? "text" : "password"} autoComplete="new-password" label={t("confirm")} icon={<Lock className="size-4" />} required />
            <Button type="submit" size="lg" className="mt-2 w-full" loading={pending}>
              {t("submit")}
            </Button>
          </>
        )}
      </ActionForm>
    </>
  );
}

/** Student / Worker / Other as three big radio cards (native radios: keyboard and screen readers for free). */
function OccupationCards({ value, onChange }: { value: Occupation | null; onChange: (v: Occupation) => void }) {
  const t = useTranslations("auth.signup");
  const error = useErrorText(useFieldError("occupation"));
  return (
    <fieldset aria-describedby={error ? "occupation-error" : undefined}>
      <legend className="mb-1.5 block text-sm font-bold text-ink-2">
        {t("occupation")}
        <span className="ms-0.5 text-brand-600">*</span>
      </legend>
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        {OCCUPATIONS.map((o) => {
          const { icon: Icon, tile } = OCCUPATION_STYLE[o];
          const checked = value === o;
          return (
            <label
              key={o}
              className={cn(
                "relative flex cursor-pointer flex-col items-center gap-2 rounded-2xl border-2 bg-surface p-3 text-center transition has-[:focus-visible]:ring-4 has-[:focus-visible]:ring-brand-100 sm:p-4",
                checked ? "border-brand-500 shadow-[var(--shadow-soft)]" : "border-line hover:border-brand-200",
                error && !value && "border-red-300",
              )}
            >
              <input type="radio" name="occupation" value={o} checked={checked} onChange={() => onChange(o)} className="sr-only" required />
              <span className={cn("grid size-11 place-items-center rounded-2xl transition sm:size-12", tile, checked && "scale-110")}>
                <Icon className="size-5 sm:size-6" />
              </span>
              <span className="text-sm leading-tight font-extrabold text-ink">{t(`occupations.${o}.title`)}</span>
              <span className="hidden text-xs leading-snug text-muted sm:block">{t(`occupations.${o}.hint`)}</span>
            </label>
          );
        })}
      </div>
      {error && (
        <p id="occupation-error" className="mt-1.5 text-xs font-semibold text-red-600" role="alert">
          {error}
        </p>
      )}
    </fieldset>
  );
}
