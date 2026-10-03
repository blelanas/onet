import type { Metadata, Viewport } from "next";
import { Baloo_2, Baloo_Bhaijaan_2, Cairo, Nunito } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getTranslations } from "next-intl/server";
import { Toaster } from "sonner";
import { dirFor } from "@/i18n/config";
import "./globals.css";

const heading = Baloo_2({ subsets: ["latin"], weight: ["500", "600", "700", "800"], variable: "--font-heading", display: "swap" });
const headingAr = Baloo_Bhaijaan_2({ subsets: ["arabic"], weight: ["500", "600", "700", "800"], variable: "--font-heading-ar", display: "swap" });
const body = Nunito({ subsets: ["latin"], weight: ["400", "500", "600", "700", "800"], variable: "--font-body", display: "swap" });
const arabic = Cairo({ subsets: ["arabic"], weight: ["400", "500", "600", "700"], variable: "--font-arabic", display: "swap" });

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("common");
  return {
    title: { default: t("app.title"), template: `%s · ${t("app.short")}` },
    description: t("app.tagline"),
  };
}

export const viewport: Viewport = { themeColor: "#E30613", width: "device-width", initialScale: 1 };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  const dir = dirFor(locale);
  return (
    <html lang={locale} dir={dir} className={`${heading.variable} ${headingAr.variable} ${body.variable} ${arabic.variable}`}>
      <body className="min-h-dvh">
        <NextIntlClientProvider>
          {children}
          <Toaster position={dir === "rtl" ? "top-left" : "top-right"} richColors closeButton dir={dir} toastOptions={{ style: { borderRadius: 16, fontFamily: "inherit" } }} />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
