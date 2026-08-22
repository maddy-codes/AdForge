import type { ProductFacts } from "@/lib/types";

/**
 * Stage 1 — extract structured product fields from a live URL.
 *
 * Real path (D5): Tavily Extract pulls page text + images, then a fine-tuned
 * GLiNER2 (`fastino/gliner2-base-v1` via Pioneer) pulls the structured fields.
 * Fallback per D4: zero-shot schema-driven GLiNER2, which needs no fine-tune.
 */

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

export async function extract(url: string): Promise<ProductFacts> {
  if (!process.env.TAVILY_API_KEY || !process.env.PIONEER_API_KEY) {
    return getMockFacts();
  }
  // TODO(M): Tavily Extract (include_images: true) -> GLiNER2 via Pioneer.
  // Until that lands, the mock keeps every downstream stage unblocked.
  void url;
  return getMockFacts();
}
