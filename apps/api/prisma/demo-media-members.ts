/* Demo media of the members platform (no external assets): illustrated portraits of the local bureau
 * and covers for the dances. Like ./demo-media.ts, the seed only stores their URLs; the web app writes
 * the files at dev/build time (apps/web/scripts/demo-media.mjs):
 *   tsx apps/api/prisma/demo-media-members.ts <outDir>   (outDir = apps/web/public/demo)
 */
import { mkdirSync, writeFileSync } from "fs";
import path from "path";

type Portrait = { bg: [string, string]; skin: string; hair: string; shirt: string; style: "short" | "long" | "hijab" | "beard" };

/** One portrait per seeded bureau member (same order as BUREAU in ./seed-members-content.ts). */
export const BUREAU_PORTRAITS: Portrait[] = [
  { bg: ["#FFB400", "#FF6B4A"], skin: "#E8B48F", hair: "#2B1D16", shirt: "#12924A", style: "hijab" },
  { bg: ["#1E9BD7", "#00A3A3"], skin: "#C98E68", hair: "#1B1412", shirt: "#7C4DFF", style: "beard" },
  { bg: ["#2BB673", "#00A3A3"], skin: "#F0C29E", hair: "#3A2A20", shirt: "#1E9BD7", style: "short" },
  { bg: ["#7C4DFF", "#1E9BD7"], skin: "#B97A57", hair: "#151012", shirt: "#FFB400", style: "short" },
  { bg: ["#FF6B4A", "#FFB400"], skin: "#E2A47F", hair: "#4A2C1E", shirt: "#2BB673", style: "long" },
  { bg: ["#00A3A3", "#2BB673"], skin: "#D49A72", hair: "#231915", shirt: "#FF6B4A", style: "beard" },
];
export const bureauPhotoUrl = (i: number) => `/demo/bureau/member-${i + 1}.svg`;

/** Dance covers: gradient, confetti, music notes and an emoji. */
export const DANCE_COVERS = [
  ["#FF6B4A", "#FFB400", "🪘"],
  ["#FFB400", "#2BB673", "🦆"],
  ["#1E9BD7", "#2BB673", "🤝"],
  ["#7C4DFF", "#1E9BD7", "🕺"],
  ["#E8457C", "#7C4DFF", "💃"],
] as const;
export const danceImageUrl = (i: number) => `/demo/dances/dance-${i + 1}.svg`;

function portraitSvg({ bg, skin, hair, shirt, style }: Portrait) {
  const ink = "#2B2233";
  const back = style === "long" ? `<path d="M56 94C50 50 76 34 100 34s50 16 44 60l6 50c-20 12-80 12-100 0z" fill="${hair}"/>` : "";
  const veil = style === "hijab" ? `<path d="M50 104C46 52 74 28 100 28s54 24 50 76c2 34-12 56-50 60-38-4-52-26-50-60z" fill="${hair}"/><path d="M60 150c14 12 66 12 80 0l6 22H54z" fill="${hair}"/>` : "";
  const top =
    style === "hijab"
      ? ""
      : style === "long"
        ? `<path d="M64 86c0-32 20-42 36-42 20 0 38 10 36 42-10-18-28-24-44-22-12 2-22 10-28 22z" fill="${hair}"/>`
        : `<path d="M66 82c-2-26 18-36 34-36 18 0 36 8 34 36-6-14-18-20-34-20-14 0-28 6-34 20z" fill="${hair}"/>`;
  const beard = style === "beard" ? `<path d="M70 98c2 22 14 32 30 32s28-10 30-32c-6 10-16 14-30 14s-24-4-30-14z" fill="${hair}" opacity=".9"/>` : "";
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${bg[0]}"/><stop offset="1" stop-color="${bg[1]}"/></linearGradient></defs><rect width="200" height="200" fill="url(#g)"/><circle cx="162" cy="34" r="30" fill="#fff" opacity=".18"/><circle cx="26" cy="172" r="44" fill="#fff" opacity=".12"/><circle cx="38" cy="40" r="5" fill="#fff" opacity=".7"/><path d="M28 200c4-46 36-66 72-66s68 20 72 66z" fill="${shirt}"/>${back}<rect x="88" y="112" width="24" height="30" rx="10" fill="${skin}"/>${veil}<ellipse cx="100" cy="90" rx="33" ry="37" fill="${skin}"/>${top}${beard}<circle cx="88" cy="90" r="3.6" fill="${ink}"/><circle cx="112" cy="90" r="3.6" fill="${ink}"/><circle cx="80" cy="102" r="5" fill="#FF8A80" opacity=".35"/><circle cx="120" cy="102" r="5" fill="#FF8A80" opacity=".35"/><path d="M89 106q11 10 22 0" stroke="${style === "beard" ? "#fff" : ink}" stroke-width="3" fill="none" stroke-linecap="round"/><path d="M82 140l18 18 18-18" fill="none" stroke="#fff" stroke-width="5" stroke-linejoin="round" opacity=".9"/></svg>`;
}

function danceSvg(color: string, accent: string, emoji: string) {
  const note = (x: number, y: number, s: number) => `<g transform="translate(${x} ${y}) scale(${s})" fill="#fff" opacity=".75"><ellipse cx="0" cy="40" rx="12" ry="9"/><rect x="9" y="0" width="4" height="40"/><path d="M13 0c10 4 18 10 16 22-4-8-10-10-16-10z"/></g>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 500"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${color}"/><stop offset="1" stop-color="${accent}"/></linearGradient></defs><rect width="800" height="500" fill="url(#g)"/><circle cx="660" cy="90" r="140" fill="#fff" opacity=".13"/><circle cx="110" cy="440" r="170" fill="#fff" opacity=".1"/><circle cx="230" cy="90" r="12" fill="#FFF4D6"/><rect x="560" y="360" width="20" height="20" rx="5" fill="#fff" opacity=".6" transform="rotate(25 570 370)"/>${note(150, 170, 1.4)}${note(610, 230, 1.1)}${note(520, 60, 0.9)}<path d="M80 300q40-40 80 0t80 0" stroke="#fff" stroke-width="7" fill="none" stroke-linecap="round" opacity=".45"/><text x="400" y="320" font-size="180" text-anchor="middle">${emoji}</text></svg>`;
}

export function generateMembersMedia(outDir: string) {
  for (const sub of ["bureau", "dances"]) mkdirSync(path.join(outDir, sub), { recursive: true });
  BUREAU_PORTRAITS.forEach((p, i) => writeFileSync(path.join(outDir, "bureau", `member-${i + 1}.svg`), portraitSvg(p)));
  DANCE_COVERS.forEach(([c1, c2, emoji], i) => writeFileSync(path.join(outDir, "dances", `dance-${i + 1}.svg`), danceSvg(c1, c2, emoji)));
}

// CLI: tsx demo-media-members.ts <outDir>
if (process.argv[1]?.endsWith("demo-media-members.ts")) {
  const out = process.argv[2] ?? "public/demo";
  generateMembersMedia(out);
  console.log(`members demo media written to ${out}`);
}
