import { createTranslator } from "use-intl/core";
import { DEFAULT_LOCALE, isLocale, type Locale } from "@onet/shared";
import fr from "@onet/shared/messages/fr.json";
import ar from "@onet/shared/messages/ar.json";
import en from "@onet/shared/messages/en.json";
import { als } from "@api/lib/context";

const MESSAGES: Record<Locale, Record<string, unknown>> = { fr, ar, en };

/** Locale of the current request: X-Locale header (sent by the web app), then Accept-Language. */
export async function getLocale(): Promise<Locale> {
  const req = als.getStore()?.req;
  const h = req?.headers["x-locale"];
  if (isLocale(h)) return h;
  const accept = String(req?.headers["accept-language"] ?? "");
  for (const part of accept.split(",")) {
    const code = part.split(";")[0].trim().slice(0, 2);
    if (isLocale(code)) return code;
  }
  return DEFAULT_LOCALE;
}

/** Same call shapes as next-intl/server: getTranslations("ns") or getTranslations({ locale, namespace }). */
export async function getTranslations(arg?: string | { locale?: string; namespace?: string }) {
  const opts = typeof arg === "string" ? { namespace: arg } : (arg ?? {});
  const locale = isLocale(opts.locale) ? opts.locale : await getLocale();
  return createTranslator({
    locale,
    messages: MESSAGES[locale] as never,
    namespace: opts.namespace as never,
    timeZone: "Africa/Tunis",
    onError: () => {},
    getMessageFallback: ({ namespace, key }) => `${namespace ? namespace + "." : ""}${key}`,
  }) as unknown as ((key: string, values?: Record<string, unknown>) => string) & { has: (key: string) => boolean };
}
