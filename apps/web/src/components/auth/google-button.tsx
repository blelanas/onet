import { useEffect, useRef, useState } from "react";
import { useTranslations } from "use-intl";
import { toast } from "sonner";
import { isLocale } from "@onet/shared";
import { apiSend } from "@/lib/api";
import { signIn } from "@/lib/auth";
import { useLocaleSwitch } from "@/lib/i18n";
import { queryClient } from "@/lib/query";
import { useNavigate } from "@/lib/router";

/** OAuth client id (not a secret). Empty: the Google button isn't shown at all. */
const CLIENT_ID = ((import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined) ?? "").trim();
const GIS_SRC = "https://accounts.google.com/gsi/client";

/** What the sign-up form can prefill from a Google account that has no ONET account yet. */
export type GoogleProfile = { email: string; firstName: string; lastName: string };

/** The small part of Google Identity Services used here. */
type Gis = {
  initialize(config: { client_id: string; callback: (r: { credential?: string }) => void; ux_mode?: "popup" }): void;
  renderButton(parent: HTMLElement, options: Record<string, unknown>): void;
};
declare global {
  interface Window {
    google?: { accounts?: { id?: Gis } };
  }
}

let gisPromise: Promise<Gis> | null = null;
/** Loads the Google script once, only on the pages that show the button. */
function loadGis(): Promise<Gis> {
  const ready = window.google?.accounts?.id;
  if (ready) return Promise.resolve(ready);
  gisPromise ??= new Promise<Gis>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = GIS_SRC;
    script.async = true;
    script.onload = () => (window.google?.accounts?.id ? resolve(window.google.accounts.id) : reject(new Error("GIS missing")));
    script.onerror = () => {
      script.remove();
      gisPromise = null; // allow a retry on the next visit
      reject(new Error("GIS failed to load"));
    };
    document.head.appendChild(script);
  });
  return gisPromise;
}

// `initialize` is global to the page: it is called once, and its callback forwards to the mounted button.
let initialized = false;
let onCredential: ((credential: string) => void) | null = null;
function initGis(gis: Gis) {
  if (initialized) return;
  gis.initialize({ client_id: CLIENT_ID, callback: (r) => r.credential && onCredential?.(r.credential), ux_mode: "popup" });
  initialized = true;
}

/** Name and e-mail from the ID token, only to prefill the sign-up form (the API verifies the token itself). */
function profileFromCredential(credential: string): GoogleProfile | null {
  try {
    const part = credential.split(".")[1]!.replace(/-/g, "+").replace(/_/g, "/");
    const binary = atob(part.padEnd(part.length + ((4 - (part.length % 4)) % 4), "="));
    const payload = JSON.parse(new TextDecoder().decode(Uint8Array.from(binary, (c) => c.charCodeAt(0)))) as Record<string, unknown>;
    const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");
    const email = str(payload.email).toLowerCase();
    if (!email) return null;
    let firstName = str(payload.given_name);
    let lastName = str(payload.family_name);
    if (!firstName && !lastName) {
      const [first = "", ...rest] = str(payload.name).split(/\s+/);
      firstName = first;
      lastName = rest.join(" ");
    }
    return { email, firstName: firstName.slice(0, 40), lastName: lastName.slice(0, 40) };
  } catch {
    return null;
  }
}

type Props = {
  /** Where to go after signing in (only /dashboard… paths are followed, like the password login). */
  next?: string;
  /** Called when no account uses this Google e-mail; by default the sign-up page opens, prefilled. */
  onNoAccount?: (profile: GoogleProfile | null) => void;
};

/** "Continue with Google" (Google's official button) under an "or" divider. Renders nothing when not configured. */
export function GoogleSignIn(props: Props) {
  if (!CLIENT_ID) return null;
  return <GoogleSignInButton {...props} />;
}

function GoogleSignInButton({ next, onNoAccount }: Props) {
  const t = useTranslations("auth.google");
  const tc = useTranslations("common");
  const { locale, setLocale } = useLocaleSwitch();
  const navigate = useNavigate();
  const box = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [pending, setPending] = useState(false);

  // Same steps as the password login: store the session, apply the user's language, go on.
  const handle = async (credential: string) => {
    setPending(true);
    try {
      const res = await apiSend<{ token: string; locale: string }>("POST", "/auth/google", { credential });
      if (res.ok) {
        await signIn(res.data!.token);
        if (isLocale(res.data!.locale)) await setLocale(res.data!.locale, { persist: false });
        toast.success(tc(res.message ?? "toast.welcome"));
        void queryClient.invalidateQueries({ refetchType: "none" });
        navigate(next?.startsWith("/dashboard") ? next : "/dashboard");
      } else if (res.error === "errors.googleNoAccount") {
        const profile = profileFromCredential(credential);
        if (onNoAccount) onNoAccount(profile);
        else navigate("/signup", { state: { google: profile } });
      } else {
        toast.error(res.error.startsWith("errors.") ? tc(res.error) : res.error);
      }
    } finally {
      setPending(false);
    }
  };
  const handleRef = useRef(handle);
  useEffect(() => {
    handleRef.current = handle;
  });

  useEffect(() => {
    onCredential = (c) => void handleRef.current(c);
    return () => {
      onCredential = null;
    };
  }, []);

  // (Re)draw Google's button in the app language.
  useEffect(() => {
    let alive = true;
    loadGis()
      .then((gis) => {
        const el = box.current;
        if (!alive || !el) return;
        initGis(gis);
        el.replaceChildren();
        gis.renderButton(el, {
          type: "standard",
          theme: "outline",
          size: "large",
          shape: "pill",
          text: "continue_with",
          logo_alignment: "center",
          width: Math.max(200, Math.min(400, Math.round(el.clientWidth || 320))),
          locale,
        });
        setStatus("ready");
      })
      .catch(() => alive && setStatus("error"));
    return () => {
      alive = false;
    };
  }, [locale]);

  return (
    <div className="mt-6">
      <div className="flex items-center gap-3 text-xs font-bold text-muted uppercase" aria-hidden>
        <span className="h-px flex-1 bg-line" />
        {t("or")}
        <span className="h-px flex-1 bg-line" />
      </div>
      <div
        ref={box}
        role="group"
        aria-label={t("button")}
        aria-busy={pending || status === "loading"}
        className={`mt-4 flex min-h-11 w-full justify-center transition ${pending ? "pointer-events-none opacity-60" : ""}`}
        data-testid="google-signin"
      />
      {status === "error" && (
        <p className="mt-2 text-center text-xs text-muted" role="status">
          {t("unavailable")}
        </p>
      )}
    </div>
  );
}
