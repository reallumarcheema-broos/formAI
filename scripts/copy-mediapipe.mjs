// Copies the MediaPipe WASM runtime from node_modules into /public so the app
// serves it from its own origin (no third-party CDN, works offline after first load).
// Runs automatically before `npm run dev` and `npm run build`.
import { cpSync, existsSync, mkdirSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
// The package only exports specific subpaths, so resolve one of the WASM files directly.
const src = dirname(require.resolve("@mediapipe/tasks-vision/vision_wasm_internal.wasm"));
const dest = join(process.cwd(), "public", "mediapipe", "wasm");

mkdirSync(dest, { recursive: true });
for (const file of readdirSync(src)) {
  // The "module" variant is only for ES-module workers; we don't use it.
  if (file.includes("module")) continue;
  const target = join(dest, file);
  if (!existsSync(target)) cpSync(join(src, file), target);
}
console.log(`[formai] MediaPipe WASM ready in ${dest}`);
