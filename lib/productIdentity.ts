/**
 * Shared lock so Flux, Kling, and VEED keep the listed SKU — not a cousin
 * pack or a competitor. A Diet Coke can stays a Diet Coke can.
 */

export type ProductIdentity = {
  name: string;
  category?: string;
  materials?: string[];
  /** Listing photo composited into the keyframe. Local /mock paths do not qualify. */
  imageUrl?: string | null;
};

const FORM_RULE =
  "Same brand, same pack form, same label. A can stays a can, a bottle stays a bottle, a jar stays a jar, a tube stays a tube. Never a competitor (Diet Coke is not Pepsi), never a different container, never a different size, never a generic unbranded lookalike.";

/** Spoken VO, captions, hooks, end cards, overlays — English only. Pack labels stay as printed. */
export const VIDEO_ENGLISH_LOCK =
  "LANGUAGE — every word written or spoken for the video is English: hook, captions, voiceover, end-card type, on-screen overlays. Do not invent text in any other language. The real product label in the listing photo stays as printed.";

/** For text-to-image / creative-director prompts (brand films, intel, avatar brief). */
export function productIdentityLock(product: ProductIdentity): string {
  const listed = product.category
    ? `${product.name} (${product.category})`
    : product.name;
  const materials = product.materials?.filter(Boolean).slice(0, 4).join(", ");
  return [
    "PRODUCT IDENTITY — non-negotiable:",
    `The hero is ${listed} as sold on the listing — the exact SKU you would pick off the shelf.`,
    FORM_RULE,
    "Keep the real logo, label art, colours, and silhouette readable.",
    materials ? `Pack/materials to match: ${materials}.` : "",
    "Invent lighting, set, motion, and props AROUND the product. Do not redesign the product itself.",
    VIDEO_ENGLISH_LOCK,
  ]
    .filter(Boolean)
    .join(" ");
}

/** For Kling image-to-video: the keyframe already has the product — don't morph it. */
export function productMotionLock(product: ProductIdentity): string {
  return [
    `Keep ${product.name} exactly as it appears in the keyframe.`,
    FORM_RULE,
    "Do not morph, restyle, or replace the product. Animate camera, lighting, hands, and set around it.",
    VIDEO_ENGLISH_LOCK,
  ].join(" ");
}

/**
 * For nano-banana / image-edit: the listing photo is the product. Composite
 * it; do not redraw it into a different pack.
 */
export function productPhotoLock(): string {
  return [
    "The product in the reference photo is sacred.",
    "Composite that exact object into the scene unchanged — same container, label, logo, colours, silhouette.",
    "Do not redraw, restyle, recolor, or replace it.",
    "A can is not a bottle. Do not swap brands.",
    "Invent set, lighting, and props around it. Follow the shot for the set only.",
    VIDEO_ENGLISH_LOCK,
  ].join(" ");
}

const MERCH = /hoodie|tote|t-?shirt|merch|crewneck|sweatshirt/i;

/** First usable listing photo — http, not an svg, skip obvious merch. */
export function pickListingPhoto(urls: string[] | undefined): string | null {
  if (!urls?.length) return null;
  const http = urls.filter(
    (u) => /^https?:\/\//i.test(u) && !/\.svg(\?|#|$)/i.test(u)
  );
  return http.find((u) => !MERCH.test(u)) ?? http[0] ?? null;
}
