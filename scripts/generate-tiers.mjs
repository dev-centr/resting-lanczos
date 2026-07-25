#!/usr/bin/env node
/**
 * Optional Node/sharp variant of generate-tiers.py.
 * Same contract: Lanczos from one cover crop → {id}-{width}.webp tiers.
 *
 *   pnpm install   # installs optional sharp
 *   node scripts/generate-tiers.mjs --input master.png --id mycard --out-dir ./out
 */
import { parseArgs } from "node:util";
import path from "node:path";
import { mkdir } from "node:fs/promises";

let sharp;
try {
  sharp = (await import("sharp")).default;
} catch {
  console.error(
    "sharp is not installed. Run: pnpm install\n" +
      "Or use the Python CLI: python scripts/generate-tiers.py …",
  );
  process.exit(1);
}

const { values } = parseArgs({
  options: {
    input: { type: "string" },
    id: { type: "string" },
    "out-dir": { type: "string" },
    tiers: { type: "string", default: "400,800" },
    aspect: { type: "string", default: "4:3" },
    "crop-gravity": { type: "string", default: "top" },
    quality: { type: "string", default: "90" },
    "no-crop": { type: "boolean", default: false },
  },
  strict: true,
});

if (!values.input || !values.id || !values["out-dir"]) {
  console.error(
    "Usage: node scripts/generate-tiers.mjs --input master.png --id mycard --out-dir ./out",
  );
  process.exit(1);
}

function parseAspect(s) {
  if (s.includes(":")) {
    const [a, b] = s.split(":");
    return Number(a) / Number(b);
  }
  return Number(s);
}

function parseTiers(s, aspect) {
  return s.split(",").map((part) => {
    part = part.trim();
    if (/[xX]/.test(part)) {
      const [w, h] = part.split(/[xX]/);
      return { width: Number(w), height: Number(h) };
    }
    const width = Number(part);
    return { width, height: Math.round(width / aspect) };
  });
}

const aspect = parseAspect(values.aspect);
const tiers = parseTiers(values.tiers, aspect);
const gravity =
  values["crop-gravity"] === "bottom"
    ? "south"
    : values["crop-gravity"] === "center"
      ? "centre"
      : "north";
const quality = Number(values.quality);
const outDir = values["out-dir"];

await mkdir(outDir, { recursive: true });

const meta = await sharp(values.input).metadata();
const sw = meta.width;
const sh = meta.height;
if (!sw || !sh) throw new Error("could not read image size");

let extract;
if (!values["no-crop"]) {
  const srcAspect = sw / sh;
  if (srcAspect > aspect) {
    const newW = Math.round(sh * aspect);
    extract = { left: Math.floor((sw - newW) / 2), top: 0, width: newW, height: sh };
  } else {
    const newH = Math.round(sw / aspect);
    const top =
      gravity === "south"
        ? sh - newH
        : gravity === "centre"
          ? Math.floor((sh - newH) / 2)
          : 0;
    extract = { left: 0, top, width: sw, height: newH };
  }
}

for (const { width, height } of tiers) {
  let pipeline = sharp(values.input);
  if (extract) pipeline = pipeline.extract(extract);
  // sharp: lanczos3 is the default for reducing; be explicit via kernel
  const dest = path.join(outDir, `${values.id}-${width}.webp`);
  await pipeline
    .resize(width, height, {
      fit: "fill",
      kernel: sharp.kernel.lanczos3,
    })
    .webp({ quality, effort: 6 })
    .toFile(dest);
  console.log(`wrote ${dest} (${width}x${height}, q=${quality}, lanczos3)`);
}
