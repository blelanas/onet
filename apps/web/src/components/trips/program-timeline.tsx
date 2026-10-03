import { Flag, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";

const DOTS = ["#E30613", "#FF6B4A", "#FFB400", "#2BB673", "#1E9BD7", "#7C4DFF", "#00A3A3", "#E8457C"];

/** Vertical timeline for a trip program ("08:00 | Départ" lines). */
export function ProgramTimeline({ steps }: { steps: { time: string; label: string }[] }) {
  return (
    <ol className="relative space-y-1">
      {steps.map((s, i) => {
        const last = i === steps.length - 1;
        const color = DOTS[i % DOTS.length];
        return (
          <li key={i} className="relative flex gap-3 sm:gap-4">
            <div className="flex w-14 shrink-0 items-start justify-end pt-2.5 sm:w-20">
              {s.time && (
                <span className="rounded-lg bg-surface-2 px-2 py-0.5 text-xs font-extrabold text-ink-2 tabular-nums" dir="ltr">
                  {s.time}
                </span>
              )}
            </div>
            <div className="relative flex flex-col items-center">
              <span className="z-10 mt-2 grid size-7 shrink-0 place-items-center rounded-full text-white shadow-[var(--shadow-soft)] ring-4 ring-surface" style={{ background: color }}>
                {i === 0 ? <MapPin className="size-3.5" /> : last ? <Flag className="size-3.5" /> : <span className="text-[11px] font-extrabold">{i + 1}</span>}
              </span>
              {!last && <span className="absolute top-9 bottom-[-0.75rem] w-0.5 rounded-full" style={{ background: `linear-gradient(${color}, ${DOTS[(i + 1) % DOTS.length]})`, opacity: 0.35 }} />}
            </div>
            <div className={cn("min-w-0 flex-1 pb-3", !last && "border-b border-dashed border-line/0")}>
              <div className="rounded-2xl border border-line bg-surface px-4 py-2.5 transition hover:border-brand-200 hover:shadow-[var(--shadow-soft)]">
                <p className="font-bold text-ink">{s.label}</p>
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
