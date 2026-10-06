import { Outlet } from "@/lib/router";
import { RequirePerm } from "@/components/states/guards";
import { PlayerProvider } from "@/components/content/songs/player-context";

/** Content section: hosts the persistent audio player so music keeps playing across pages. */
export function Component() {
  return (
    <RequirePerm perm="content.read">
      <PlayerProvider>
        <Outlet />
      </PlayerProvider>
    </RequirePerm>
  );
}
