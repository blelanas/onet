import { useEffect, useRef } from "react";
import { openNotification } from "@/api/communication";
import { queryClient } from "@/lib/query";
import { useNavigate, useParams } from "@/lib/router";
import { PageSkeleton } from "@/components/ui/skeleton";

/** Only same-origin dashboard/site paths are followed (no open redirect). */
function internalLink(link: string | undefined) {
  return link && /^\/(?![/\\])/.test(link) ? link : "/dashboard/notifications";
}

/** /dashboard/notifications/open/:id — marks the notification read, then follows its internal link. */
export function Component() {
  const { id } = useParams();
  const navigate = useNavigate();
  const started = useRef(false);
  useEffect(() => {
    if (started.current || !id) return;
    started.current = true;
    void (async () => {
      const res = await openNotification(id);
      await queryClient.invalidateQueries({ queryKey: ["/auth/me"] });
      void queryClient.invalidateQueries({ queryKey: ["/notifications"] });
      navigate(internalLink(res.ok ? res.data?.link : undefined), { replace: true });
    })();
  }, [id, navigate]);
  return <PageSkeleton />;
}
