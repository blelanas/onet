import { CalendarDays, Images, Info, Mail, Mic, Music, Newspaper, Palette, Tent, type LucideIcon } from "lucide-react";

export type PublicNavItem = { key: string; href: string; icon: LucideIcon; color: string; primary?: boolean };

/** Public site navigation. `primary` items are shown inline on desktop, the rest under "More". */
export const PUBLIC_NAV: PublicNavItem[] = [
  { key: "about", href: "/about", icon: Info, color: "#E30613", primary: true },
  { key: "activities", href: "/activities", icon: Palette, color: "#2BB673", primary: true },
  { key: "events", href: "/events", icon: CalendarDays, color: "#FF6B4A", primary: true },
  { key: "trips", href: "/trips", icon: Tent, color: "#1E9BD7", primary: true },
  { key: "news", href: "/news", icon: Newspaper, color: "#7C4DFF", primary: true },
  { key: "gallery", href: "/gallery", icon: Images, color: "#FFB400" },
  { key: "songs", href: "/songs", icon: Music, color: "#E8457C" },
  { key: "conferences", href: "/conferences", icon: Mic, color: "#00A3A3" },
  { key: "contact", href: "/contact", icon: Mail, color: "#5CAE2E" },
];

export function isNavActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(href + "/");
}
