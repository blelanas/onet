/* eslint-disable @next/next/no-img-element */
import { Burst, Star } from "./shapes";

/** Big red call-to-action band with playful shapes. */
export function CtaBand({ title, text, actions }: { title: React.ReactNode; text?: React.ReactNode; actions: React.ReactNode }) {
  return (
    <section className="mx-auto max-w-7xl px-4 pt-16 sm:px-6 sm:pt-20 lg:px-8">
      <div className="relative isolate overflow-hidden rounded-[2rem] bg-gradient-to-br from-brand-600 to-brand-800 px-6 py-12 text-center text-white shadow-[var(--shadow-brand)] sm:px-12 sm:py-16">
        <div className="bg-confetti absolute inset-0 -z-10 opacity-60" aria-hidden />
        <Burst className="absolute -start-12 -bottom-12 -z-10 size-48 text-sun/25" />
        <Burst className="absolute -end-10 -top-10 -z-10 size-40 text-white/10" />
        <Star className="absolute start-[12%] top-8 size-6 animate-[var(--animate-float)] text-sun" />
        <Star className="absolute end-[14%] bottom-10 size-5 animate-[var(--animate-float)] text-white/80 [animation-delay:1s]" />
        <img src="/brand/onet-mark.svg" alt="" className="mx-auto mb-5 size-16 -rotate-6 rounded-[22px] bg-white p-1 shadow-xl" />
        <h2 className="mx-auto max-w-2xl text-3xl leading-tight font-extrabold text-balance sm:text-5xl">{title}</h2>
        {text && <p className="mx-auto mt-4 max-w-xl text-lg text-white/85">{text}</p>}
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">{actions}</div>
      </div>
    </section>
  );
}
