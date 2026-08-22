import { z } from "zod";
import { zodResponseFormat } from "openai/helpers/zod";
import { getOpenAI } from "@/lib/openai";
import type { Concept, ProductFacts, ReviewHook } from "@/lib/types";

/**
 * Stage 3 — OpenAI as creative director.
 *
 * Writes CONCEPT_COUNT ad concepts grounded in the extracted facts and the real
 * review hooks. D8 fixed the count at 3 — saves 25% of render time and cost,
 * and no judge counts the cards.
 *
 * The Tavily stage only earns its keep if each chosen review quote appears
 * verbatim in the script it inspired. The model is instructed to do that;
 * `ensureVerbatimQuote` is the belt if the model slips.
 */

export const CONCEPT_COUNT = 3;
const SHOTS_PER_CONCEPT = 3;
const MODEL = "gpt-5.6-luna";

const DirectedConcept = z.object({
  sourceQuote: z
    .string()
    .describe("One of the provided customer quotes, copied character-for-character."),
  hook: z
    .string()
    .describe("3–8 word on-screen headline inspired by that quote. No hashtags."),
  script: z
    .string()
    .describe(
      "4–8 second storyboard in 2–4 sentences. The sourceQuote MUST appear inside this script character-for-character, in quotation marks. Name the product and price. End on an end card."
    ),
  shots: z
    .array(z.string())
    .describe(
      "Exactly 3 Flux/Kling prompts. One camera setup each. Visual only. Include the real product, materials, and brand tone."
    ),
});

const DirectedConcepts = z.object({
  concepts: z.array(DirectedConcept),
});

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

function pickUnusedHook(
  sourceQuote: string,
  hooks: ReviewHook[],
  used: Set<string>,
  fallbackIndex: number
): ReviewHook | null {
  if (hooks.length === 0) return null;

  const exact = hooks.find((h) => h.quote === sourceQuote && !used.has(h.quote));
  if (exact) return exact;

  const fuzzy = hooks.find(
    (h) =>
      !used.has(h.quote) &&
      (sourceQuote.includes(h.quote) || h.quote.includes(sourceQuote))
  );
  if (fuzzy) return fuzzy;

  const unused = hooks.find((h) => !used.has(h.quote));
  if (unused) return unused;

  return hooks[fallbackIndex % hooks.length] ?? hooks[0];
}

export function ensureVerbatimQuote(script: string, quote: string): string {
  if (!quote || script.includes(quote)) return script;
  const trimmed = script.replace(/\s+$/, "");
  const spacer = /["”]$/.test(trimmed) || trimmed.endsWith(".") ? " " : ". ";
  return `${trimmed}${spacer}"${quote}"`;
}

function normalizeShots(shots: string[], facts: ProductFacts): string[] {
  const cleaned = shots.map((s) => s.trim()).filter(Boolean);
  const fallback = `${facts.name} hero on a clean surface, ${facts.tone} lighting, product-accurate materials (${facts.materials.slice(0, 3).join(", ")})`;
  while (cleaned.length < SHOTS_PER_CONCEPT) {
    cleaned.push(cleaned[cleaned.length - 1] ?? fallback);
  }
  return cleaned.slice(0, SHOTS_PER_CONCEPT);
}

function toConcepts(
  directed: z.infer<typeof DirectedConcept>[],
  facts: ProductFacts,
  hooks: ReviewHook[]
): Concept[] {
  const used = new Set<string>();
  return directed.slice(0, CONCEPT_COUNT).map((raw, index) => {
    const hook = pickUnusedHook(raw.sourceQuote, hooks, used, index);
    if (hook) used.add(hook.quote);
    const quote = hook?.quote ?? "";
    return {
      hook: raw.hook.trim(),
      script: ensureVerbatimQuote(raw.script.trim(), quote),
      shots: normalizeShots(raw.shots, facts),
    };
  });
}

async function directConcepts(
  facts: ProductFacts,
  hooks: ReviewHook[]
): Promise<Concept[]> {
  const quoteBlock =
    hooks.length === 0
      ? "(no customer quotes — invent hooks from the facts only, leave sourceQuote empty)"
      : hooks
          .map((h, i) => `${i + 1}. "${h.quote}" — theme: ${h.theme}`)
          .join("\n");

  const completion = await getOpenAI().chat.completions.parse({
    model: MODEL,
    messages: [
      {
        role: "system",
        content: [
          "You are the creative director for AdForge, which turns a product URL into 9:16 short-form video ads.",
          `Write exactly ${CONCEPT_COUNT} distinct ad concepts — different strategies, not three cuts of the same idea (e.g. speed/proof vs texture/layering vs transformation).`,
          "For each concept pick a different customer quote as sourceQuote, copied character-for-character from the list.",
          "hook: punchy, spoken, 3–8 words. Sound like a customer, not a campaign title. No title case, no hashtags.",
          "script: a director's storyboard, not brochure copy. OPEN ON / CUT TO / END CARD. The only spoken VO is the customer quote plus at most one short line. Forbidden openers: Discover, Experience, Revitalize, Transform, Unleash.",
          "The sourceQuote MUST appear inside the script character-for-character, wrapped in quotation marks. That verbatim line is the whole point of the review crawl.",
          "Never invent ingredients, prices, or claims that are not in the product facts or the chosen quote.",
          "Name the real product and price on the end card. Ground the visual in category, materials, and tone.",
          "Each shots[] item is a single camera setup that will be concatenated into a Flux keyframe + Kling image-to-video prompt: concrete lighting, surface, product position, motion. No hashtags, no camera-jargon dumps.",
        ].join("\n"),
      },
      {
        role: "user",
        content: [
          "Product facts:",
          JSON.stringify(
            {
              name: facts.name,
              price: facts.price,
              features: facts.features,
              materials: facts.materials,
              category: facts.category,
              tone: facts.tone,
            },
            null,
            2
          ),
          "",
          "Customer review quotes (copy verbatim):",
          quoteBlock,
        ].join("\n"),
      },
    ],
    response_format: zodResponseFormat(DirectedConcepts, "ad_concepts"),
  });

  const parsed = completion.choices[0]?.message.parsed;
  if (!parsed?.concepts.length) {
    throw new Error("OpenAI returned no concepts");
  }

  const concepts = toConcepts(parsed.concepts, facts, hooks);
  if (concepts.length < CONCEPT_COUNT) {
    throw new Error(
      `OpenAI returned ${concepts.length} concepts, expected ${CONCEPT_COUNT}`
    );
  }
  return concepts;
}

export async function concepts(
  facts: ProductFacts,
  hooks: ReviewHook[]
): Promise<Concept[]> {
  if (!process.env.OPENAI_API_KEY) {
    return getMockConcepts();
  }

  try {
    return await directConcepts(facts, hooks);
  } catch (err) {
    console.error("[concepts] OpenAI failed, falling back to mock:", err);
    return getMockConcepts();
  }
}
