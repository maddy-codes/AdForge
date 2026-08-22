import type { Reviews } from "@/lib/types";

/**
 * Stage 2 — surface what real customers actually praise.
 *
 * Real path (D5): Tavily Search across review sites and social mentions,
 * clustered into themes. The quotes become the ad copy seed, which is what
 * makes the concepts sound like customers instead of like a model.
 */

export function getMockReviews(): Reviews {
  return {
    hooks: [
      {
        quote: "My skin looked lit-from-within after four days. Four.",
        theme: "Fast visible glow",
      },
      {
        quote: "It's the only serum that doesn't pill under my sunscreen.",
        theme: "Layers cleanly",
      },
      {
        quote: "Dark spots from last summer have genuinely faded.",
        theme: "Tone evening",
      },
      {
        quote: "Feels like a cold drink of water for my face.",
        theme: "Sensory / refreshing",
      },
    ],
  };
}

export async function reviews(urlOrName: string): Promise<Reviews> {
  if (!process.env.TAVILY_API_KEY) {
    return getMockReviews();
  }
  // TODO(M): Tavily Search -> dedupe -> theme-cluster -> top hooks.
  void urlOrName;
  return getMockReviews();
}
