import { z } from "zod";
import { zodResponseFormat } from "openai/helpers/zod";
import { getOpenAI } from "@/lib/openai";
import { tavilySearch } from "@/lib/tavily";
import { extract } from "@/lib/stages/extract";
import type { ProductFacts } from "@/lib/types";

/**
 * Separate product surface from brand-film generation.
 *
 * URL → who competes in this category → what ads of theirs show up in
 * search as "viral" → reverse-engineer STRUCTURE into a prompt we could
 * shoot for *this* product. We do not recreate their film, talent, or lines.
 */

export type Rival = { name: string; angle: string };

export type StolenFormula = {
  competitor: string;
  sourceTitle: string;
  sourceUrl: string;
  hookType: string;
  whyItWorked: string;
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
        prompt:
          "9:16 product film for Watermelon Glow Niacinamide Dew Drops. Open on 4% niacinamide as a bold on-screen number. Cut to serum texture, then a clean end card with name and $36. Clinical but warm pastel. New script, no Ordinary branding.",
      },
      {
        competitor: "Drunk Elephant",
        sourceTitle: "Drunk Elephant T.L.C. Framboos — texture close-ups",
        sourceUrl: "https://www.youtube.com/results?search_query=drunk+elephant+viral+ad",
        hookType: "Texture ASMR — the product is the actor.",
        whyItWorked:
          "Macro motion holds the thumb. No presenter needed.",
        prompt:
          "9:16 macro film: watermelon-pink dropper, slow-mo drop onto dewy skin, pastel bokeh. Silent except one customer line. End on the bottle beside a watermelon slice. Do not copy Drunk Elephant packaging or VO.",
      },
      {
        competitor: "Glossier",
        sourceTitle: "Glossier You — 'this is what I actually use' UGC",
        sourceUrl: "https://www.youtube.com/results?search_query=glossier+tiktok+ad",
        hookType: "Mirror UGC — a friend, not a campaign.",
        whyItWorked:
          "Looks like a text from someone you trust. Low polish is the polish.",
        prompt:
          "9:16 handheld bathroom-mirror film for Dew Drops. Apply, check skin in honest daylight, say the real review quote. Messy sink ok. End card like a text: product name + price. No Glossier talent or pink pouch.",
      },
    ],
  };
}

async function nameRivals(facts: ProductFacts): Promise<Rival[]> {
  const completion = await getOpenAI().chat.completions.parse({
    model: "gpt-4o",
    temperature: 0.4,
    messages: [
      {
        role: "system",
        content:
          "You name direct advertising competitors — brands a media buyer would steal short-form ads from. Same category, similar shopper. Never list the brand itself. Prefer 3, max 4.",
      },
      {
        role: "user",
        content: JSON.stringify({
          name: facts.name,
          category: facts.category,
          price: facts.price,
        }),
      },
    ],
    response_format: zodResponseFormat(RivalList, "rivals"),
  });
  const parsed = completion.choices[0]?.message.parsed;
  if (!parsed?.rivals.length) throw new Error("no rivals");
  return parsed.rivals.slice(0, 4);
}

async function reverseEngineer(
  facts: ProductFacts,
  rivals: Rival[],
  snippets: { competitor: string; title: string; url: string; content: string }[]
): Promise<StolenFormula[]> {
  const completion = await getOpenAI().chat.completions.parse({
    model: "gpt-4o",
    temperature: 0.5,
    messages: [
      {
        role: "system",
        content: [
          "You reverse-engineer competitor short-form ads into STRUCTURE, then write a NEW generation prompt for OUR product.",
          "Copy the shape: hook type, proof device, shot rhythm, CTA.",
          "Do NOT recreate their film, talent, wording, trademarks, or packaging.",
          "If snippets are thin, still infer a plausible category formula from the competitor's known advertising style.",
          "One formula per competitor. prompt is what we would send to an image-to-video model for OUR product.",
        ].join(" "),
      },
      {
        role: "user",
        content: JSON.stringify({
          ourProduct: {
            name: facts.name,
            category: facts.category,
            tone: facts.tone,
            price: facts.price,
          },
          rivals,
          adSnippets: snippets,
        }),
      },
    ],
    response_format: zodResponseFormat(FormulaList, "stolen_formulas"),
  });
  const parsed = completion.choices[0]?.message.parsed;
  if (!parsed?.formulas.length) throw new Error("no formulas");
  return parsed.formulas;
}

export async function competitorIntel(url: string): Promise<IntelResult> {
  const live = Boolean(process.env.TAVILY_API_KEY && process.env.OPENAI_API_KEY);
  if (!live) return getMockIntel();

  try {
    const facts = await extract(url);
    const rivals = await nameRivals(facts);

    const searches = await Promise.all(
      rivals.map(async (rival) => {
        const hits = await tavilySearch(
          `${rival.name} viral TikTok ad OR YouTube ad ${facts.category}`,
          { maxResults: 4 }
        );
        return hits.map((h) => ({
          competitor: rival.name,
          title: h.title,
          url: h.url,
          content: h.content,
        }));
      })
    );
    const snippets = searches.flat();
    const formulas = await reverseEngineer(facts, rivals, snippets);

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
