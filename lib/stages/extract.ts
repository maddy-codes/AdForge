import type { ProductFacts } from "@/lib/types";
import { extractPage } from "@/lib/tavily";
import { extractEntities } from "@/lib/pioneer";

/**
 * Stage 1 — extract structured product fields from a live URL.
 *
 * Real path (D5): Tavily Extract pulls page text + images, then GLiNER2
 * (`fastino/gliner2-base-v1` via Pioneer) pulls the structured fields.
 * Running zero-shot per D4's hard gate — fine-tune never landed, and the
 * fallback was built to stand on its own from the start.
 */

const FIELD_ENTITIES = [
  "product_name",
  "price",
  "feature",
  "material",
  "category",
  "tone",
] as const;

export const DEMO_URL =
  "https://www.glowrecipe.com/products/watermelon-glow-niacinamide-dew-drops";

export function getMockFacts(): ProductFacts {
  return {
    name: "Watermelon Glow Niacinamide Dew Drops",
    price: "$36.00",
    features: [
      "4% niacinamide for visibly brighter, more even tone",
      "Hyaluronic acid blend for a plumped, dewy finish",
      "Lightweight serum that layers under makeup without pilling",
      "Vegan, cruelty-free, dermatologist-tested",
    ],
    materials: [
      "Watermelon extract",
      "Niacinamide",
      "Hyaluronic acid",
      "Cactus water",
    ],
    category: "Skincare — face serum",
    tone: "Playful, fresh, pastel, self-care ritual",
    imageUrls: [
      "/mock/product-1.svg",
      "/mock/product-2.svg",
      "/mock/product-3.svg",
      "/mock/product-4.svg",
    ],
  };
}

/**
 * Storefront pages open with thousands of chars of markdown nav links; fed raw,
 * the entity window never reaches the product. Strip link syntax and URLs so
 * the window holds prose.
 */
function cleanPageText(text: string): string {
  return text
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ") // markdown images
    .replace(/\[([^\]]*)\]\(([^)]*)\)/g, "$1") // links -> label only
    .replace(/https?:\/\/\S+/g, " ") // bare URLs
    .replace(/^[\s>*#-]+/gm, "") // list/heading markers
    .replace(/\s+/g, " ")
    .trim();
}

const CHUNK_CHARS = 8000;
const MAX_CHUNKS = 3;

/** Concat per-chunk entity hits, deduped case-insensitively, first-seen order. */
function mergeEntityMaps(maps: Record<string, string[]>[]): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const map of maps) {
    for (const [name, values] of Object.entries(map)) {
      const bucket = (out[name] ??= []);
      const seen = new Set(bucket.map((v) => v.toLowerCase()));
      for (const v of values) {
        if (seen.has(v.toLowerCase())) continue;
        bucket.push(v);
        seen.add(v.toLowerCase());
      }
    }
  }
  return out;
}

/** Zero-shot GLiNER2 over the scraped page text, backstopped field-by-field by mock. */
async function extractFacts(
  rawContent: string,
  title: string,
  mock: ProductFacts
): Promise<ProductFacts> {
  if (!process.env.PIONEER_API_KEY) return mock;
  try {
    // The title is the strongest product-name signal the page has — lead with it.
    const text = [title, cleanPageText(rawContent)].filter(Boolean).join(". ");
    const chunks: string[] = [];
    for (let i = 0; i < text.length && chunks.length < MAX_CHUNKS; i += CHUNK_CHARS) {
      chunks.push(text.slice(i, i + CHUNK_CHARS));
    }
    const e = mergeEntityMaps(
      await Promise.all(chunks.map((c) => extractEntities(c, [...FIELD_ENTITIES])))
    );
    const fellBackTo: string[] = [];
    const pick = (field: string, value: string | undefined, fallback: string) => {
      if (value) return value;
      fellBackTo.push(field);
      return fallback;
    };
    const facts: ProductFacts = {
      name: pick("name", e.product_name[0], mock.name),
      price: pick("price", e.price[0], mock.price),
      features: e.feature.length ? e.feature.slice(0, 6) : (fellBackTo.push("features"), mock.features),
      materials: e.material.length ? e.material.slice(0, 6) : (fellBackTo.push("materials"), mock.materials),
      category: pick("category", e.category[0], mock.category),
      tone: pick("tone", e.tone[0], mock.tone),
      imageUrls: mock.imageUrls,
    };
    if (fellBackTo.length) {
      console.warn(`[extract] Pioneer GLiNER2 missed fields, using mock for: ${fellBackTo.join(", ")}`);
    }
    return facts;
  } catch (err) {
    console.error("[extract] Pioneer extraction failed, using mock facts:", err);
    return mock;
  }
}

export async function extract(url: string): Promise<ProductFacts> {
  const mock = getMockFacts();
  if (!process.env.TAVILY_API_KEY) return mock;

  try {
    const { rawContent, title, imageUrls } = await extractPage(url);
    const facts = await extractFacts(rawContent, title, mock);
    return {
      ...facts,
      imageUrls: imageUrls.length ? imageUrls.slice(0, 6) : facts.imageUrls,
    };
  } catch (err) {
    console.error("[extract] page scrape failed, using mock facts:", err);
    return mock;
  }
}
