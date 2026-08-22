import { z } from "zod";
import { zodResponseFormat } from "openai/helpers/zod";
import { getOpenAI } from "@/lib/openai";
import { tavilySearch, type TavilySearchResult } from "@/lib/tavily";
import { extract } from "@/lib/stages/extract";
import type { ProductFacts } from "@/lib/types";
import {
  formatBriefForPrompt,
  type AdBrief,
} from "@/lib/brief";

/**
 * Separate product surface from brand-film generation.
 *
 * URL → who competes in this category → what ads of theirs show up in
 * search as "viral" (Tavily, two angled queries per rival) → reverse-engineer
 * STRUCTURE into a prompt we could shoot for *this* product. We do not
 * recreate their film, talent, or lines.
 */

export type Rival = { name: string; angle: string };

export type StolenFormula = {
  competitor: string;
  sourceTitle: string;
  sourceUrl: string;
  hookType: string;
  whyItWorked: string;
  /** The beat-by-beat skeleton of the ad, with rough timings. */
  structure: string[];
  prompt: string;
};

export type IntelResult = {
  brand: string;
  category: string;
  rivals: Rival[];
  formulas: StolenFormula[];
};

const RivalList = z.object({
  rivals: z.array(
    z.object({
      name: z.string(),
      angle: z.string().describe("Why a media buyer would watch their ads."),
    })
  ),
});

const FormulaList = z.object({
  formulas: z.array(
    z.object({
      competitor: z.string(),
      sourceTitle: z.string(),
      sourceUrl: z.string(),
      hookType: z.string(),
      whyItWorked: z.string(),
      structure: z
        .array(z.string())
        .describe(
          "4–6 beats with rough timings, e.g. '0–1s — HOOK: bold claim as on-screen number'. The transferable skeleton, no competitor specifics."
        ),
      prompt: z
        .string()
        .describe(
          "A NEW generation prompt for OUR product, using their structure only. No competitor names, no copied VO."
        ),
    })
  ),
});

export function getMockIntel(): IntelResult {
  return {
    brand: "Watermelon Glow Niacinamide Dew Drops",
    category: "Skincare — face serum",
    rivals: [
      {
        name: "The Ordinary",
        angle: "Ingredient-first, number-on-screen, clinical but cheap.",
      },
      {
        name: "Drunk Elephant",
        angle: "Routine-as-identity. Texture porn, cult packaging.",
      },
      {
        name: "Glossier",
        angle: "Friend in the bathroom mirror. Handheld UGC energy.",
      },
    ],
    formulas: [
      {
        competitor: "The Ordinary",
        sourceTitle: "The Ordinary Niacinamide 10% + Zinc — 'the numbers' spot",
        sourceUrl: "https://www.youtube.com/results?search_query=the+ordinary+niacinamide+ad",
        hookType: "Clinical listicle — lead with the active and the %.",
        whyItWorked:
          "Specificity reads as proof. One number on screen beats a vibe.",
        structure: [
          "0–1s — HOOK: the active ingredient and its % as a bold full-screen number",
          "1–3s — PROOF: clinical macro of the product, label legible",
          "3–6s — RHYTHM: three fast texture cuts, one on-screen word each",
          "6–8s — CTA: clean end card, name + price, no music lift",
        ],
        prompt:
          "9:16 product film for Watermelon Glow Niacinamide Dew Drops. Open on 4% niacinamide as a bold on-screen number filling the frame. Cut to a clinical macro of the dropper bottle, label sharp. Three fast serum-texture cuts, one word burned in per cut: BRIGHTER, EVEN, DEWY. End card: product on mint, name and $36 in clean type. Clinical but warm pastel palette. New script, no Ordinary branding.",
      },
      {
        competitor: "Drunk Elephant",
        sourceTitle: "Drunk Elephant T.L.C. Framboos — texture close-ups",
        sourceUrl: "https://www.youtube.com/results?search_query=drunk+elephant+viral+ad",
        hookType: "Texture ASMR — the product is the actor.",
        whyItWorked:
          "Macro motion holds the thumb. No presenter needed.",
        structure: [
          "0–1s — HOOK: extreme macro of product mid-motion, no logo yet",
          "1–4s — RHYTHM: slow-mo drop and spread, one continuous move",
          "4–6s — PROOF: a single customer line appears as quiet text",
          "6–8s — CTA: bottle beside its hero ingredient, name + price",
        ],
        prompt:
          "9:16 macro film for Watermelon Glow Niacinamide Dew Drops: watermelon-pink dropper in extreme close-up, slow-mo drop landing and spreading on dewy skin, pastel bokeh, one continuous camera move. Silent except one quiet customer line as small text. End on the bottle beside a watermelon slice, name + $36. Do not copy Drunk Elephant packaging or VO.",
      },
      {
        competitor: "Glossier",
        sourceTitle: "Glossier You — 'this is what I actually use' UGC",
        sourceUrl: "https://www.youtube.com/results?search_query=glossier+tiktok+ad",
        hookType: "Mirror UGC — a friend, not a campaign.",
        whyItWorked:
          "Looks like a text from someone you trust. Low polish is the polish.",
        structure: [
          "0–1s — HOOK: handheld mirror shot, mid-sentence honesty",
          "1–4s — PROOF: apply on camera in honest daylight",
          "4–6s — RHYTHM: skin check close-up, real review quote spoken",
          "6–8s — CTA: end card styled like a text message, name + price",
        ],
        prompt:
          "9:16 handheld bathroom-mirror film for Watermelon Glow Dew Drops. Open mid-sentence on a mirror selfie angle. Apply the serum on camera, check skin in honest daylight, speak the real review quote. Messy sink ok, no colour grade. End card styled like a text message: product name + $36. No Glossier talent or pink pouch.",
      },
    ],
  };
}

/**
 * Prompt 1 — casting the rival list. A media buyer's shortlist, not a market
 * report: brands whose short-form ads are actually worth stealing from.
 */
const RIVALS_SYSTEM_PROMPT = [
  "You are a short-form ads media buyer building a swipe file.",
  "Given one product (name, category, price), name the direct competitors whose ADS are worth studying — not the biggest brands, the ones with a distinctive, provably working short-form style on TikTok/Reels/Shorts.",
  "",
  "Rules:",
  "- Same category, same shopper, comparable price tier.",
  "- Never list the product's own brand or parent company.",
  "- Each rival needs a one-line `angle`: the specific thing their ads do that we could learn from (a hook device, a proof device, a format). 'They are popular' is not an angle.",
  "- Prefer brands known for a REPEATABLE ad formula over brands known for one viral fluke.",
  "- Return exactly 3 rivals, 4 only if a fourth brings a genuinely different formula.",
].join("\n");

async function nameRivals(
  facts: ProductFacts,
  brief?: AdBrief
): Promise<Rival[]> {
  const director = formatBriefForPrompt(brief);
  const completion = await getOpenAI().chat.completions.parse({
    model: "gpt-4o",
    temperature: 0.4,
    messages: [
      {
        role: "system",
        content: [RIVALS_SYSTEM_PROMPT, director].filter(Boolean).join("\n\n"),
      },
      {
        role: "user",
        content: JSON.stringify({
          name: facts.name,
          category: facts.category,
          price: facts.price,
          tone: facts.tone,
        }),
      },
    ],
    response_format: zodResponseFormat(RivalList, "rivals"),
  });
  const parsed = completion.choices[0]?.message.parsed;
  if (!parsed?.rivals.length) throw new Error("no rivals");
  return parsed.rivals.slice(0, 4);
}

type AdSnippet = {
  competitor: string;
  title: string;
  url: string;
  content: string;
};

/** Keep each Tavily snippet short enough that 6 rivals × 6 hits stays cheap. */
const SNIPPET_CHARS = 500;

/**
 * Two angled Tavily queries per rival: one hunts the viral ads themselves,
 * one hunts breakdowns of WHY they worked. Deduped by URL.
 */
async function searchRivalAds(
  rival: Rival,
  category: string
): Promise<AdSnippet[]> {
  const queries = [
    `"${rival.name}" viral TikTok ad OR YouTube ad ${category}`,
    `"${rival.name}" ad hook breakdown why it worked short-form`,
  ];
  const settled = await Promise.allSettled(
    queries.map((q) => tavilySearch(q, { maxResults: 3 }))
  );
  const hits = settled
    .filter(
      (s): s is PromiseFulfilledResult<TavilySearchResult[]> =>
        s.status === "fulfilled"
    )
    .flatMap((s) => s.value);

  const seen = new Set<string>();
  const out: AdSnippet[] = [];
  for (const h of hits) {
    if (seen.has(h.url)) continue;
    seen.add(h.url);
    out.push({
      competitor: rival.name,
      title: h.title,
      url: h.url,
      content: h.content.slice(0, SNIPPET_CHARS),
    });
  }
  return out;
}

/**
 * Prompt 2 — the reverse-engineer. This is the section's whole thesis:
 * copy the SHAPE (hook device, proof device, shot rhythm, CTA), never the
 * film. The output prompt must be shootable for OUR product as-is.
 */
const FORMULA_SYSTEM_PROMPT = [
  "You reverse-engineer competitor short-form ads into transferable STRUCTURE, then write a NEW generation prompt for OUR product.",
  "",
  "A formula has four parts — find all four in the evidence (or infer them from the competitor's known style if snippets are thin):",
  "1. HOOK (first 0–1s): the device that stops the thumb — a number, a mid-sentence line, a texture, a contradiction.",
  "2. PROOF: how the ad makes the claim believable — a stat on screen, a demo, a customer line, a before/after.",
  "3. RHYTHM: the shot pattern and pacing — cut length, camera style (macro / handheld / locked-off), where text burns in.",
  "4. CTA: how it ends — end-card style, what is on it, whether the music lifts.",
  "",
  "For each competitor return ONE formula:",
  "- `hookType`: name the device in a short phrase a media buyer would use.",
  "- `whyItWorked`: one or two sentences of mechanism, not praise. Say what the device does to the viewer.",
  "- `structure`: 4–6 beats with rough timings for an ~8s vertical ad, e.g. '0–1s — HOOK: …'. Beats must be transferable — describe the device, never the competitor's product or talent.",
  "- `sourceTitle` / `sourceUrl`: pick the single strongest snippet as evidence. Use its real URL.",
  "- `prompt`: 60–120 words for an image-to-video model, shootable for OUR product with no edits. It must: be 9:16; open on the hook beat; follow the structure's shot rhythm; use OUR product's name, real price, tone and one real feature; specify palette/lighting consistent with OUR tone; end on an end card with name + price. The hero is OUR listed SKU — same brand, same pack form, same label. A can stays a can; never a competitor or a different container.",
  "",
  "Hard bans, no exceptions:",
  "- No competitor names, talent, taglines, VO lines, packaging, logos or trade dress anywhere in `prompt`.",
  "- Never invent ingredients, percentages or prices — only what OUR product facts contain.",
  "- No brochure verbs (Discover, Experience, Revitalize, Elevate).",
  "",
  "One formula per competitor, in the same order the rivals were given.",
].join("\n");

async function reverseEngineer(
  facts: ProductFacts,
  rivals: Rival[],
  snippets: AdSnippet[],
  brief?: AdBrief
): Promise<StolenFormula[]> {
  const director = formatBriefForPrompt(brief);
  const completion = await getOpenAI().chat.completions.parse({
    model: "gpt-4o",
    temperature: 0.5,
    messages: [
      {
        role: "system",
        content: [FORMULA_SYSTEM_PROMPT, director].filter(Boolean).join("\n\n"),
      },
      {
        role: "user",
        content: JSON.stringify({
          ourProduct: {
            name: facts.name,
            category: facts.category,
            tone: facts.tone,
            price: facts.price,
            features: facts.features.slice(0, 4),
            materials: facts.materials.slice(0, 4),
          },
          rivals,
          adSnippets: snippets,
          directorBrief: director,
        }),
      },
    ],
    response_format: zodResponseFormat(FormulaList, "stolen_formulas"),
  });
  const parsed = completion.choices[0]?.message.parsed;
  if (!parsed?.formulas.length) throw new Error("no formulas");
  return parsed.formulas;
}

export async function competitorIntel(
  url: string,
  brief?: AdBrief
): Promise<IntelResult> {
  const live = Boolean(process.env.TAVILY_API_KEY && process.env.OPENAI_API_KEY);
  if (!live) return getMockIntel();

  try {
    const facts = await extract(url);
    const rivals = await nameRivals(facts, brief);

    const searches = await Promise.all(
      rivals.map((rival) => searchRivalAds(rival, facts.category))
    );
    const snippets = searches.flat();
    const formulas = await reverseEngineer(facts, rivals, snippets, brief);

    return {
      brand: facts.name,
      category: facts.category,
      rivals,
      formulas,
    };
  } catch (err) {
    console.error("[intel] failed, falling back to mock:", err);
    return getMockIntel();
  }
}
