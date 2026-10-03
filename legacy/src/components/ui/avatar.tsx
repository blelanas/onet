/* eslint-disable @next/next/no-img-element */
import { cn, colorFor, initials } from "@/lib/utils";

const SIZES = { xs: "size-6 text-[10px]", sm: "size-8 text-xs", md: "size-10 text-sm", lg: "size-14 text-lg", xl: "size-20 text-2xl" };

export function Avatar({
  src,
  firstName,
  lastName,
  name,
  size = "md",
  className,
  ring,
}: {
  src?: string | null;
  firstName?: string;
  lastName?: string;
  name?: string;
  size?: keyof typeof SIZES;
  className?: string;
  ring?: boolean;
}) {
  const [f, l] = name ? [name.split(" ")[0], name.split(" ").slice(-1)[0]] : [firstName, lastName];
  const seed = `${f}${l}`;
  const color = colorFor(seed);
  return (
    <span
      className={cn("relative inline-grid shrink-0 place-items-center overflow-hidden rounded-full font-extrabold text-white", SIZES[size], ring && "ring-2 ring-white", className)}
      style={{ background: `linear-gradient(135deg, ${color}, ${color}CC)` }}
      aria-hidden={!!(f || l) || undefined}
    >
      {src ? <img src={src} alt="" className="size-full object-cover" /> : initials(f, l)}
    </span>
  );
}

export function AvatarStack({ people, max = 4 }: { people: { firstName: string; lastName: string; photoUrl?: string | null }[]; max?: number }) {
  const shown = people.slice(0, max);
  return (
    <div className="flex -space-x-2 rtl:space-x-reverse">
      {shown.map((p, i) => (
        <Avatar key={i} size="sm" ring firstName={p.firstName} lastName={p.lastName} src={p.photoUrl} />
      ))}
      {people.length > max && (
        <span className="inline-grid size-8 place-items-center rounded-full bg-surface-2 text-xs font-bold text-ink-2 ring-2 ring-white">+{people.length - max}</span>
      )}
    </div>
  );
}
