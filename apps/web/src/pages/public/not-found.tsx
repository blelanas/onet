import { NotFoundView } from "@/components/public/states";

/** Catch-all route for unknown public URLs: the branded, standalone 404 page. */
export function Component() {
  return <NotFoundView standalone />;
}
