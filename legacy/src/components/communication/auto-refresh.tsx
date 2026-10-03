"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Lightweight polling: refreshes server components every `ms` while the tab is visible. */
export function AutoRefresh({ ms = 8000 }: { ms?: number }) {
  const router = useRouter();
  useEffect(() => {
    let id: ReturnType<typeof setInterval> | null = null;
    const start = () => {
      if (id) return;
      id = setInterval(() => router.refresh(), ms);
    };
    const stop = () => {
      if (id) clearInterval(id);
      id = null;
    };
    const onVis = () => {
      if (document.visibilityState === "visible") {
        router.refresh();
        start();
      } else stop();
    };
    if (document.visibilityState === "visible") start();
    document.addEventListener("visibilitychange", onVis);
    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [ms, router]);
  return null;
}
