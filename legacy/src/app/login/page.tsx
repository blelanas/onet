import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getCurrentUser } from "@/lib/auth/session";
import { Logo } from "@/components/layout/logo";
import { LocaleSwitcher } from "@/components/layout/app-shell";
import { LoginForm } from "./login-form";

export async function generateMetadata() {
  const t = await getTranslations("auth.login");
  return { title: t("submit") };
}

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  if (await getCurrentUser()) redirect("/dashboard");
  const { next } = await searchParams;
  const t = await getTranslations("auth.login");
  return (
    <div className="grid min-h-dvh lg:grid-cols-[1.05fr_1fr]">
      <aside className="relative hidden overflow-hidden bg-gradient-to-br from-brand-600 via-brand-700 to-[#7d0f16] p-12 text-white lg:flex lg:flex-col">
        <div className="bg-confetti absolute inset-0 opacity-60" aria-hidden />
        <svg className="absolute -end-24 -bottom-24 size-[520px] opacity-15" viewBox="0 0 200 200" aria-hidden>
          <circle cx="100" cy="100" r="100" fill="#fff" />
        </svg>
        <Logo light className="relative" />
        <div className="relative mt-auto max-w-md">
          <div className="mb-8 flex gap-3" aria-hidden>
            {["#FFB400", "#1E9BD7", "#2BB673", "#7C4DFF"].map((c, i) => (
              <span key={c} className="size-12 animate-[var(--animate-float)] rounded-2xl" style={{ background: c, animationDelay: `${i * 0.4}s`, transform: `rotate(${i * 8 - 12}deg)` }} />
            ))}
          </div>
          <h2 className="text-4xl leading-tight font-extrabold">{t("sideTitle")}</h2>
          <p className="mt-4 text-lg text-white/80">{t("sideText")}</p>
        </div>
      </aside>
      <main className="relative flex flex-col bg-canvas px-5 py-6 sm:px-10">
        <div className="flex items-center justify-between">
          <Logo className="lg:invisible" />
          <LocaleSwitcher />
        </div>
        <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center py-10">
          <h1 className="text-3xl font-extrabold text-ink">{t("title")}</h1>
          <p className="mt-2 text-muted">{t("subtitle")}</p>
          <LoginForm next={next} />
        </div>
      </main>
    </div>
  );
}
