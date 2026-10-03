/* Demo media for ONET Teboulba (no external assets): synthesised song melodies (WAV),
 * colourful gallery pictures (SVG) and sample PDF forms.
 * The seed only stores their URLs; the web app generates the files at dev/build time:
 *   tsx apps/api/prisma/demo-media.ts <outDir>   (outDir = apps/web/public/demo)
 */
import { mkdirSync, writeFileSync } from "fs";
import path from "path";

export const MELODIES = [
  [60, 62, 64, 65, 67, 67, 69, 67, 65, 64, 62, 60, 64, 67, 72, 0, 72, 71, 69, 67, 65, 64, 62, 60],
  [67, 67, 69, 67, 72, 71, 0, 67, 67, 69, 67, 74, 72, 0, 67, 67, 79, 76, 72, 71, 69, 0, 77, 77, 76, 72, 74, 72],
  [64, 64, 65, 67, 67, 65, 64, 62, 60, 60, 62, 64, 64, 62, 62, 0, 64, 64, 65, 67, 67, 65, 64, 62, 60, 60, 62, 64, 62, 60, 60],
  [60, 60, 67, 67, 69, 69, 67, 0, 65, 65, 64, 64, 62, 62, 60, 0, 67, 67, 65, 65, 64, 64, 62, 0],
  [72, 71, 69, 67, 69, 71, 72, 0, 72, 74, 76, 74, 72, 71, 69, 0, 67, 69, 71, 72, 74, 72, 71, 69, 67],
  [62, 65, 69, 65, 62, 65, 69, 72, 0, 70, 69, 67, 65, 67, 69, 65, 62, 0, 62, 65, 69, 74, 72, 69, 65, 62],
];

type Track = { file: string; melody: number; bpm: number };
/** 8 songs + 2 conference recordings (conference index 2 and 3 have media). */
export const SONG_TRACKS: Track[] = Array.from({ length: 8 }, (_, i) => ({ file: `song-${i + 1}.wav`, melody: i % MELODIES.length, bpm: 120 + (i % 3) * 14 }));
export const CONFERENCE_TRACKS: Record<number, Track> = Object.fromEntries(
  [2, 3].map((i) => [i, { file: `conference-${i + 1}.wav`, melody: (i + 2) % MELODIES.length, bpm: 100 }]),
);

export function trackInfo(t: Track) {
  return { url: `/demo/audio/${t.file}`, duration: Math.round((MELODIES[t.melody].length * 60) / t.bpm) };
}

export const GALLERY = [
  ["#E30613", "#FF6B4A", "🎭"],
  ["#1E9BD7", "#00A3A3", "🏖️"],
  ["#FFB400", "#FF6B4A", "🎨"],
  ["#2BB673", "#5CAE2E", "⚽"],
  ["#7C4DFF", "#E8457C", "🎤"],
  ["#E8457C", "#FFB400", "🎂"],
  ["#00A3A3", "#1E9BD7", "🏛️"],
  ["#5CAE2E", "#2BB673", "🌳"],
  ["#FF6B4A", "#E30613", "🤖"],
] as const;
export const galleryUrl = (i: number) => `/demo/gallery/photo-${i + 1}.svg`;

export const DEMO_PDFS: Record<string, string> = {
  "guide-moniteur.pdf": "Guide du moniteur ONET",
  "fiche-sanitaire.pdf": "Fiche sanitaire de liaison",
  "autorisation-parentale.pdf": "Autorisation parentale de sortie",
  "100-jeux.pdf": "100 jeux pour animer un groupe",
};

/** Synthesises a short, cheerful melody as a 16-bit mono WAV. */
function melodyWav(notes: number[], bpm: number) {
  const rate = 22050;
  const beat = 60 / bpm;
  const samples: number[] = [];
  for (const n of notes) {
    const freq = n === 0 ? 0 : 440 * Math.pow(2, (n - 69) / 12);
    const len = Math.floor(rate * beat);
    for (let i = 0; i < len; i++) {
      const t = i / rate;
      const env = Math.min(1, i / 300) * Math.exp((-3 * i) / len);
      samples.push(freq ? (Math.sin(2 * Math.PI * freq * t) * 0.6 + Math.sin(4 * Math.PI * freq * t) * 0.15) * env : 0);
    }
  }
  const buf = Buffer.alloc(44 + samples.length * 2);
  buf.write("RIFF", 0);
  buf.writeUInt32LE(36 + samples.length * 2, 4);
  buf.write("WAVEfmt ", 8);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20);
  buf.writeUInt16LE(1, 22);
  buf.writeUInt32LE(rate, 24);
  buf.writeUInt32LE(rate * 2, 28);
  buf.writeUInt16LE(2, 32);
  buf.writeUInt16LE(16, 34);
  buf.write("data", 36);
  buf.writeUInt32LE(samples.length * 2, 40);
  samples.forEach((v, i) => buf.writeInt16LE(Math.max(-1, Math.min(1, v)) * 32767 * 0.8, 44 + i * 2));
  return buf;
}

function gallerySvg(color: string, accent: string, emoji: string) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${color}"/><stop offset="1" stop-color="${accent}"/></linearGradient></defs><rect width="800" height="600" fill="url(#g)"/><circle cx="660" cy="110" r="150" fill="#fff" opacity=".13"/><circle cx="120" cy="520" r="190" fill="#fff" opacity=".1"/><circle cx="220" cy="120" r="14" fill="#FFB400"/><circle cx="600" cy="460" r="10" fill="#fff" opacity=".8"/><rect x="520" y="200" width="22" height="22" rx="5" fill="#fff" opacity=".6" transform="rotate(25 530 210)"/><text x="400" y="350" font-size="190" text-anchor="middle">${emoji}</text></svg>`;
}

/** Minimal valid one-page PDF showing the title. */
function samplePdf(rawTitle: string) {
  const title = rawTitle.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[()\\]/g, "");
  const content = `BT /F1 22 Tf 60 760 Td (${title}) Tj ET BT /F1 12 Tf 60 730 Td (ONET Teboulba - document de demonstration) Tj ET`;
  const objs = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>",
    `<< /Length ${content.length} >>\nstream\n${content}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ];
  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [];
  objs.forEach((o, i) => {
    offsets.push(pdf.length);
    pdf += `${i + 1} 0 obj\n${o}\nendobj\n`;
  });
  const xref = pdf.length;
  pdf += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n${offsets.map((o) => `${String(o).padStart(10, "0")} 00000 n \n`).join("")}trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return pdf;
}

export function generateDemoMedia(outDir: string) {
  for (const sub of ["audio", "gallery", "resources"]) mkdirSync(path.join(outDir, sub), { recursive: true });
  for (const t of [...SONG_TRACKS, ...Object.values(CONFERENCE_TRACKS)]) writeFileSync(path.join(outDir, "audio", t.file), melodyWav(MELODIES[t.melody], t.bpm));
  GALLERY.forEach(([c1, c2, emoji], i) => writeFileSync(path.join(outDir, "gallery", `photo-${i + 1}.svg`), gallerySvg(c1, c2, emoji)));
  for (const [file, title] of Object.entries(DEMO_PDFS)) writeFileSync(path.join(outDir, "resources", file), samplePdf(title));
}

// CLI: tsx demo-media.ts <outDir>
if (process.argv[1]?.endsWith("demo-media.ts")) {
  const out = process.argv[2] ?? "public/demo";
  generateDemoMedia(out);
  console.log(`demo media written to ${out}`);
}
