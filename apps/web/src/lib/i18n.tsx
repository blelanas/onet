import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { IntlProvider } from "use-intl";
import { DEFAULT_LOCALE, dirFor, isLocale, type Locale } from "@onet/shared";
import fr from "@onet/shared/messages/fr.json";
import { apiSend, LOCALE_KEY, tokenStore } from "./api";

// French is bundled (default); Arabic and English are loaded on demand.
const loaders: Record<Locale, () => Promise<Record<string, unknown>>> = {
  fr: async () => fr,
  ar: () => import("@onet/shared/messages/ar.json").then((m) => m.default),
  en: () => import("@onet/shared/messages/en.json").then((m) => m.default),
};

function initialLocale(): Locale {
  try {
    const saved = localStorage.getItem(LOCALE_KEY);
    if (isLocale(saved)) return saved;
  } catch {
    /* ignore */
  }
  for (const l of navigator.languages ?? []) {
    const code = l.slice(0, 2);
    if (isLocale(code)) return code;
  }
  return DEFAULT_LOCALE;
}

const LocaleContext = createContext<{ locale: Locale; setLocale: (l: Locale, opts?: { persist?: boolean }) => Promise<void> }>({
  locale: DEFAULT_LOCALE,
  setLocale: async () => {},
});

export function useLocaleSwitch() {
  return useContext(LocaleContext);
}

function applyDocument(locale: Locale) {
  document.documentElement.lang = locale;
  document.documentElement.dir = dirFor(locale);
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale);
  const [messages, setMessages] = useState<Record<string, unknown> | null>(locale === "fr" ? fr : null);

  useEffect(() => {
    let alive = true;
    loaders[locale]().then((m) => alive && setMessages(m));
    applyDocument(locale);
    return () => {
      alive = false;
    };
  }, [locale]);

  /** persist=true also saves the preference on the user account (when signed in). */
  const setLocale = useCallback(async (l: Locale, opts?: { persist?: boolean }) => {
    try {
      localStorage.setItem(LOCALE_KEY, l);
    } catch {
      /* ignore */
    }
    const m = await loaders[l]();
    setMessages(m);
    setLocaleState(l);
    if (opts?.persist !== false && tokenStore.get()) void apiSend("POST", "/auth/locale", { locale: l });
  }, []);

  if (!messages) return null;
  return (
    <LocaleContext.Provider value={{ locale, setLocale }}>
      <IntlProvider
        locale={locale}
        messages={messages as never}
        timeZone="Africa/Tunis"
        onError={() => {}}
        getMessageFallback={({ namespace, key }) => `${namespace ? namespace + "." : ""}${key}`}
      >
        {children}
      </IntlProvider>
    </LocaleContext.Provider>
  );
}
