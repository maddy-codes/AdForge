export type BriefMode = "forge" | "intel" | "avatar";

export type AdBrief = {
  audience?: string;
  proof?: string;
  constraint?: string;
  energy?: string;
  platform?: string;
  note?: string;
};

export type BriefField = Exclude<keyof AdBrief, "note">;

export type BriefQuestion = {
  id: BriefField;
  prompt: string;
  chips: string[];
};

const AUDIENCE: BriefQuestion = {
  id: "audience",
  prompt: "Who should feel this in the first two seconds?",
  chips: [
    "New to the brand",
    "Already using it",
    "Gift buyers",
    "Sceptical shoppers",
  ],
};

const PROOF: BriefQuestion = {
  id: "proof",
  prompt: "What should we prove first?",
  chips: ["The result", "The ingredient", "Social proof", "The price"],
};

export const BRIEF_QUESTIONS: Record<BriefMode, BriefQuestion[]> = {
  forge: [
    AUDIENCE,
    PROOF,
    {
      id: "constraint",
      prompt: "Any hard limits on the film?",
      chips: ["No faces", "Product only", "No voiceover", "Founder on camera"],
    },
  ],
  intel: [
    AUDIENCE,
    {
      id: "platform",
      prompt: "Where should the stolen ads have lived?",
      chips: ["TikTok", "YouTube", "Instagram Reels"],
    },
    {
      id: "proof",
      prompt: "What shape are we hunting?",
      chips: ["Hook then proof", "Texture / ASMR", "UGC mirror", "Clinical numbers"],
    },
  ],
  avatar: [
    AUDIENCE,
    {
      id: "energy",
      prompt: "What energy should the spokesperson have?",
      chips: [
        "Friend in the bathroom",
        "Calm expert",
        "Founder, slightly chaotic",
      ],
    },
    {
      id: "constraint",
      prompt: "Any hard limits?",
      chips: ["Keep it under 15s", "Don't mention price", "No slang"],
    },
  ],
};

const KEYS: (keyof AdBrief)[] = [
  "audience",
  "proof",
  "constraint",
  "energy",
  "platform",
  "note",
];

export function emptyBrief(): AdBrief {
  return {};
}

export function briefHasAnswers(brief: AdBrief | undefined): boolean {
  if (!brief) return false;
  return KEYS.some((k) => Boolean(brief[k]?.trim()));
}

export function parseBrief(raw: unknown): AdBrief | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const o = raw as Record<string, unknown>;
  const out: AdBrief = {};
  for (const key of KEYS) {
    if (typeof o[key] !== "string") continue;
    const t = o[key].trim().slice(0, 280);
    if (t) out[key] = t;
  }
  return briefHasAnswers(out) ? out : undefined;
}

/** Director override block. Missing fields stay inferred from the page. */
export function formatBriefForPrompt(brief: AdBrief | undefined): string | null {
  if (!briefHasAnswers(brief) || !brief) return null;
  const lines = [
    "DIRECTOR BRIEF from the marketer. When this conflicts with inference from the page or reviews, obey the brief.",
    "Unanswered fields: infer from product facts and reviews. Do not invent claims that are not in the facts, the quotes, or this brief.",
  ];
  if (brief.audience) lines.push(`Audience (first two seconds): ${brief.audience}`);
  if (brief.proof) lines.push(`Lead with this proof / shape: ${brief.proof}`);
  if (brief.constraint) lines.push(`Hard constraint: ${brief.constraint}`);
  if (brief.energy) lines.push(`Spokesperson energy: ${brief.energy}`);
  if (brief.platform) lines.push(`Platform to study: ${brief.platform}`);
  if (brief.note) lines.push(`Extra note: ${brief.note}`);
  return lines.join("\n");
}
