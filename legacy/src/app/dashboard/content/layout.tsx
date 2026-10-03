import { requirePagePermission } from "@/lib/auth/guards";
import { PlayerProvider } from "@/components/content/songs/player-context";

/** Content section: hosts the persistent audio player so music keeps playing across pages. */
export default async function ContentLayout({ children }: { children: React.ReactNode }) {
  await requirePagePermission("content.read");
  return <PlayerProvider>{children}</PlayerProvider>;
}
