/**
 * Small compatibility layer so components ported from Next.js keep their call sites:
 * <Link href=…>, useRouter().push/replace/refresh/back, usePathname(), useSearchParams().
 */
import { forwardRef } from "react";
import { Link as RRLink, useLocation, useNavigate, useSearchParams as useRRSearchParams, type LinkProps as RRLinkProps } from "react-router";
import { refreshAll } from "./query";

type LinkProps = Omit<RRLinkProps, "to"> & { href: string; scroll?: boolean; prefetch?: boolean };

export const Link = forwardRef<HTMLAnchorElement, LinkProps>(function Link({ href, scroll, prefetch: _p, ...rest }, ref) {
  // External links and in-page anchors stay plain <a>.
  if (/^(https?:|mailto:|tel:|#)/.test(href)) return <a ref={ref} href={href} {...rest} />;
  return <RRLink ref={ref} to={href} preventScrollReset={scroll === false} {...rest} />;
});

export function useRouter() {
  const navigate = useNavigate();
  return {
    push: (to: string, _opts?: { scroll?: boolean }) => navigate(to),
    replace: (to: string, opts?: { scroll?: boolean }) => navigate(to, { replace: true, preventScrollReset: opts?.scroll === false }),
    back: () => navigate(-1),
    refresh: () => void refreshAll(),
  };
}

export function usePathname() {
  return useLocation().pathname;
}

/** Read-only URLSearchParams (like next/navigation). */
export function useSearchParams() {
  return useRRSearchParams()[0];
}

/** Plain-object search params, the shape the ported pages used (`searchParams` prop). */
export function useSearchParamsObject(): Record<string, string | undefined> {
  const [sp] = useRRSearchParams();
  return Object.fromEntries(sp.entries());
}

export { useParams, useNavigate, useLocation, Navigate, Outlet } from "react-router";
