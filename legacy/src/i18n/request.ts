import { getRequestConfig } from "next-intl/server";
import { cookies, headers } from "next/headers";
import { DEFAULT_LOCALE, isLocale, LOCALE_COOKIE, NAMESPACES, type Locale } from "./config";

async function resolveLocale(): Promise<Locale> {
  const jar = await cookies();
  const fromCookie = jar.get(LOCALE_COOKIE)?.value;
  if (isLocale(fromCookie)) return fromCookie;
  const accept = (await headers()).get("accept-language") ?? "";
  for (const part of accept.split(",")) {
    const code = part.split(";")[0].trim().slice(0, 2);
    if (isLocale(code)) return code;
  }
  return DEFAULT_LOCALE;
}

export default getRequestConfig(async () => {
  const locale = await resolveLocale();
  const entries = await Promise.all(
    NAMESPACES.map(async (ns) => {
      const mod = await import(`../../messages/${locale}/${ns}.json`).catch(() => ({ default: {} }));
      return [ns, mod.default] as const;
    }),
  );
  return {
    locale,
    messages: Object.fromEntries(entries),
    timeZone: "Africa/Tunis",
    // Missing keys fall back to the key path instead of crashing the page.
    onError(error) {
      if (process.env.NODE_ENV === "development" && error.code !== "MISSING_MESSAGE") console.warn(error.message);
    },
    getMessageFallback({ namespace, key }) {
      return `${namespace ? namespace + "." : ""}${key}`;
    },
  };
});
