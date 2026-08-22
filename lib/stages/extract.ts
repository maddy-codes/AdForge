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

/** Zero-shot GLiNER2 over the scraped page text, backstopped field-by-field by mock. */
async function extractFacts(rawContent: string, mock: ProductFacts): Promise<ProductFacts> {
  if (!process.env.PIONEER_API_KEY) return mock;
  try {
    const e = await extractEntities(rawContent, [...FIELD_ENTITIES]);
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
    const { rawContent, imageUrls } = await extractPage(url);
    const facts = await extractFacts(rawContent, mock);
    return {
      ...facts,
      imageUrls: imageUrls.length ? imageUrls.slice(0, 6) : facts.imageUrls,
    };
  } catch {
    return mock;
  }
}
