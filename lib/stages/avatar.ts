import { z } from "zod";
import { zodResponseFormat } from "openai/helpers/zod";
import { getOpenAI } from "@/lib/openai";
import { extract } from "@/lib/stages/extract";

/**
 * Separate product surface: VEED-style talking-head spots.
 * We write the avatar brief + VO + music. Rendering is VEED's job
 * (host sponsor). Does not replace fal LoRA films.
 */

export type AvatarSpot = {
  brand: string;
  avatarLook: string;
  musicBed: string;
  captions: string;
  vo: string;
  script: string;
};

const Spot = z.object({
  avatarLook: z
    .string()
    .describe("Casting: age range, energy, wardrobe matching brand tone. Not a celebrity."),
  musicBed: z.string(),
  captions: z.string().describe("On-screen caption style and the one line that should burn in."),
  vo: z
    .string()
    .describe("Spoken VO, 12–20 seconds. Include one real-sounding customer line in quotes."),
  script: z.string().describe("Director notes: OPEN ON / CUT TO / END CARD."),
});

export function getMockAvatar(): AvatarSpot {
  return {
    brand: "Watermelon Glow Niacinamide Dew Drops",
    avatarLook:
      "Mid-20s, fresh not glam, pastel knit, bathroom-mirror energy. Warm, slightly sarcastic. Not a supermodel.",
    musicBed: "Soft lo-fi keys, no lyrics, 95 BPM. Lift on the end card.",
    captions: "Big, clean, left-aligned. Burn in: “lit-from-within after four days.”",
    vo: "Okay so I did not expect this. “My skin looked lit-from-within after four days. Four.” Watermelon Glow Dew Drops. Thirty-six dollars. That’s the post.",
    script:
      "OPEN ON avatar in a bright bathroom. CUT TO dropper in hand. VO the four-day line. END CARD: product + $36 on mint.",
  };
}

export async function avatarSpot(url: string): Promise<AvatarSpot> {
  if (!process.env.OPENAI_API_KEY) return getMockAvatar();

  try {
    const facts = await extract(url);
    const completion = await getOpenAI().chat.completions.parse({
      model: "gpt-4o",
      temperature: 0.7,
      messages: [
        {
          role: "system",
          content: [
            "You write VEED avatar-spot briefs for short-form ads.",
            "The avatar must feel like this brand, not a generic AI presenter.",
            "VO is 12–20 seconds. Storyboard, not brochure. No Discover/Experience/Revitalize.",
            "Never invent ingredients or prices. Ground in the facts.",
          ].join(" "),
        },
        {
          role: "user",
          content: JSON.stringify({
            name: facts.name,
            price: facts.price,
            category: facts.category,
            tone: facts.tone,
            features: facts.features,
            materials: facts.materials,
          }),
        },
      ],
      response_format: zodResponseFormat(Spot, "avatar_spot"),
    });
    const parsed = completion.choices[0]?.message.parsed;
    if (!parsed) throw new Error("no avatar spot");
    return { brand: facts.name, ...parsed };
  } catch (err) {
    console.error("[avatar] failed, falling back to mock:", err);
    return getMockAvatar();
  }
}
