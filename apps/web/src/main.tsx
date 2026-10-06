import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "react-router";
import { Toaster } from "sonner";
import { useLocale } from "use-intl";
import { dirFor } from "@onet/shared";
import { AuthProvider } from "@/lib/auth";
import { I18nProvider } from "@/lib/i18n";
import { queryClient } from "@/lib/query";
import { router } from "@/routes";
// Self-hosted fonts (latin + arabic subsets only).
import "@fontsource/nunito/latin-400.css";
import "@fontsource/nunito/latin-600.css";
import "@fontsource/nunito/latin-700.css";
import "@fontsource/nunito/latin-800.css";
import "@fontsource/baloo-2/latin-600.css";
import "@fontsource/baloo-2/latin-700.css";
import "@fontsource/baloo-2/latin-800.css";
import "@fontsource/cairo/arabic-400.css";
import "@fontsource/cairo/arabic-600.css";
import "@fontsource/cairo/arabic-700.css";
import "@fontsource/baloo-bhaijaan-2/arabic-600.css";
import "@fontsource/baloo-bhaijaan-2/arabic-700.css";
import "@fontsource/baloo-bhaijaan-2/arabic-800.css";
import "./index.css";

function Toasts() {
  const dir = dirFor(useLocale());
  return <Toaster position={dir === "rtl" ? "top-left" : "top-right"} richColors closeButton dir={dir} toastOptions={{ style: { borderRadius: 16, fontFamily: "inherit" } }} />;
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <I18nProvider>
        <AuthProvider>
          <RouterProvider router={router} />
          <Toasts />
        </AuthProvider>
      </I18nProvider>
    </QueryClientProvider>
  </StrictMode>,
);
