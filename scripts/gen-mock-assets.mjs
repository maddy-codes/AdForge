/**
 * Regenerates the placeholder stills in public/mock.
 *
 * The "brand" stills use the demo product's pastel watermelon palette; the
 * "generic" stills are deliberately drab so the before/after toggle reads at a
 * glance even before a real LoRA is wired in. Videos are made with ffmpeg —
 * see README.
 *
 *   node scripts/gen-mock-assets.mjs
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const OUT = path.join(process.cwd(), "public", "mock");

const brand = [
  { a: "#ff6b8a", b: "#ffd6df", label: "Dropper in morning light" },
  { a: "#ff8fa8", b: "#fff0c9", label: "Absorbs under SPF" },
  { a: "#f6577d", b: "#ffe2ea", label: "Tone evening, 8 weeks" },
];

const generic = [
  { a: "#6b7280", b: "#d1d5db", label: "Generic stock render" },
  { a: "#71717a", b: "#e4e4e7", label: "Generic stock render" },
  { a: "#64748b", b: "#cbd5e1", label: "Generic stock render" },
];

const product = [
  { a: "#ffd6df", b: "#ffffff", label: "Product image 1" },
  { a: "#ffe2ea", b: "#fff7f9", label: "Product image 2" },
  { a: "#fff0c9", b: "#ffffff", label: "Product image 3" },
  { a: "#ff8fa8", b: "#ffd6df", label: "Product image 4" },
];

function svg({ a, b, label }, w, h) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${a}"/>
      <stop offset="100%" stop-color="${b}"/>
    </linearGradient>
  </defs>
  <rect width="${w}" height="${h}" fill="url(#g)"/>
  <ellipse cx="${w * 0.5}" cy="${h * 0.42}" rx="${w * 0.22}" ry="${h * 0.17}" fill="#ffffff" opacity="0.35"/>
  <rect x="${w * 0.42}" y="${h * 0.3}" width="${w * 0.16}" height="${h * 0.3}" rx="${w * 0.06}" fill="#ffffff" opacity="0.55"/>
  <text x="50%" y="${h * 0.9}" text-anchor="middle" font-family="system-ui, sans-serif" font-size="${Math.round(w * 0.045)}" fill="#00000066">${label}</text>
</svg>
`;
}

await mkdir(OUT, { recursive: true });

for (const [i, spec] of brand.entries()) {
  await writeFile(path.join(OUT, `key-${i + 1}.svg`), svg(spec, 540, 960));
}
for (const [i, spec] of generic.entries()) {
  await writeFile(path.join(OUT, `generic-${i + 1}.svg`), svg(spec, 540, 960));
}
for (const [i, spec] of product.entries()) {
  await writeFile(path.join(OUT, `product-${i + 1}.svg`), svg(spec, 800, 800));
}

console.log(`wrote ${brand.length + generic.length + product.length} SVGs to ${OUT}`);
