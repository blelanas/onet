// Bundles the API into a single ESM file (workspace packages and JSON messages included).
import { build } from "esbuild";

await build({
  entryPoints: ["src/index.ts"],
  outfile: "dist/index.js",
  bundle: true,
  platform: "node",
  target: "node22",
  format: "esm",
  sourcemap: true,
  packages: "bundle",
  external: ["@prisma/client", ".prisma/client", "@libsql/*", "@prisma/adapter-libsql", "libsql"],
  alias: { "@api": "./src" },
  banner: { js: "import { createRequire } from 'module'; const require = createRequire(import.meta.url);" },
  logLevel: "info",
});
