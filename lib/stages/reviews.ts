import type { ReviewHook, Reviews } from "@/lib/types";
import { tavilySearch } from "@/lib/tavily";

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

const THEME_KEYWORDS: [string, string[]][] = [
  ["Fast visible glow", ["glow", "brighten", "radian", "lit"]],
  ["Layers cleanly", ["pill", "layer", "makeup", "spf", "sunscreen"]],
  ["Tone evening", ["dark spot", "even", "tone", "discolor"]],
  ["Sensory / refreshing", ["refresh", "cool", "hydrat", "dewy", "water"]],
];

function themeFor(text: string): string {
  const lower = text.toLowerCase();
  for (const [theme, keywords] of THEME_KEYWORDS) {
    if (keywords.some((k) => lower.includes(k))) return theme;
  }
  return "General praise";
}

/** Pull short, quote-shaped sentences out of Tavily's crawled review content. */
function extractHooks(contents: string[]): ReviewHook[] {
  const seen = new Set<string>();
  const hooks: ReviewHook[] = [];

  for (const content of contents) {
    const sentences = content
      .replace(/\s+/g, " ")
      .split(/(?<=[.!?])\s+/)
      .map((s) => s.trim().replace(/^["“]|["”]$/g, ""))
      .filter((s) => s.length >= 20 && s.length <= 140);

    for (const quote of sentences) {
      const key = quote.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      hooks.push({ quote, theme: themeFor(quote) });
      if (hooks.length >= 4) return hooks;
    }
  }
  return hooks;
}

export async function reviews(urlOrName: string): Promise<Reviews> {
  if (!process.env.TAVILY_API_KEY) {
    return getMockReviews();
  }
  try {
    const results = await tavilySearch(`${urlOrName} customer reviews`, {
      maxResults: 8,
    });
    const hooks = extractHooks(results.map((r) => r.content));
    return hooks.length ? { hooks } : getMockReviews();
  } catch {
    return getMockReviews();
  }
}
