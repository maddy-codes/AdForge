import type { Concept, ProductFacts, ReviewHook } from "@/lib/types";

/**
 * Stage 3 — OpenAI as creative director.
 *
 * Writes CONCEPT_COUNT ad concepts grounded in the extracted facts and the real
 * review hooks. D8 fixed the count at 3 — saves 25% of render time and cost,
 * and no judge counts the cards.
 */

export const CONCEPT_COUNT = 3;

export function getMockConcepts(): Concept[] {
  return [
    {
      hook: "Four days. That's it.",
      script:
        "Open on a bare face in morning light. Cut to the dropper catching the sun. " +
        "\"My skin looked lit-from-within after four days.\" Product lands on a pastel " +
        "surface, watermelon slice beside it. End card: Watermelon Glow Dew Drops, $36.",
      shots: [
        "Extreme close-up: glass dropper, watermelon-pink serum catching morning light, soft pastel bokeh",
        "Macro: single drop falling onto dewy skin, slow motion, bright airy grade",
        "Product hero on a pale pink surface beside a fresh watermelon slice, clean studio light",
      ],
    },
    {
      hook: "The serum that doesn't pill under SPF.",
      script:
        "Split screen: left, a serum pilling under sunscreen; right, dew drops absorbing " +
        "instantly. \"It's the only serum that doesn't pill under my sunscreen.\" " +
        "4% niacinamide callout. End card.",
      shots: [
        "Split-screen macro of two serums absorbing into skin, clinical but warm pastel palette",
        "Close-up: hands smoothing SPF over a glossy, even complexion, sunlit",
        "Product with 4% niacinamide text overlay on soft watermelon-pink gradient",
      ],
    },
    {
      hook: "Last summer's dark spots. Gone.",
      script:
        "Before-and-after cheek in matched lighting. \"Dark spots from last summer have " +
        "genuinely faded.\" Dropper glides across frame. Ingredient stack animates in. " +
        "End card: 4% niacinamide + hyaluronic acid.",
      shots: [
        "Matched-lighting before/after of a cheek, honest and unretouched, soft daylight",
        "Dropper gliding across frame trailing serum, pastel gradient background",
        "Ingredient stack — watermelon, niacinamide, hyaluronic acid — floating on pale pink",
      ],
    },
  ];
}

export async function concepts(
  facts: ProductFacts,
  hooks: ReviewHook[]
): Promise<Concept[]> {
  if (!process.env.OPENAI_API_KEY) {
    return getMockConcepts();
  }
  // TODO(O): OpenAI structured output, grounded in facts + hooks.
  // Every hook quote must appear verbatim in the script it inspired — that
  // verbatim quote is the whole point of the Tavily stage.
  void facts;
  void hooks;
  return getMockConcepts();
}
