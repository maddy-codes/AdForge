import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import { zodResponseFormat } from "openai/helpers/zod";
import { getOpenAI } from "@/lib/openai";
import { getFal } from "@/lib/fal";
import { extract } from "@/lib/stages/extract";

/**
 * Separate product surface: VEED talking-head spots (host sponsor).
 *
 * Two steps, two VEED models on fal:
 *   1. OpenAI casts an avatar from VEED's real roster and writes the spot
 *      (VO, director script, captions, music bed) grounded in extracted facts.
 *   2. `veed/avatars/text-to-video` renders the avatar actually speaking the
 *      VO, then `veed/subtitles` transcribes that real speech and burns in
 *      animated word-level captions.
 *
 * Does not replace the fal LoRA films — this is the second media type.
 */

/**
 * VEED's vertical (9:16) avatar roster on fal, with casting notes the
 * director prompt uses to match presenter energy to brand tone.
 */
export const AVATAR_ROSTER = [
  { id: "emily_vertical_primary", note: "Emily — direct-to-camera, centered, polished studio energy. Safe default for premium-but-friendly brands." },
  { id: "emily_vertical_secondary", note: "Emily — alternate angle, looser, more conversational." },
  { id: "marcus_vertical_primary", note: "Marcus — male presenter, direct-to-camera, confident explainer energy. Good for tech and grooming." },
  { id: "marcus_vertical_secondary", note: "Marcus — alternate angle, relaxed, friend-recommending-a-product energy." },
  { id: "mira_vertical_primary", note: "Mira — direct-to-camera, warm and earnest. Good for wellness and self-care rituals." },
  { id: "mira_vertical_secondary", note: "Mira — alternate angle, softer, diary-entry intimacy." },
  { id: "jasmine_vertical_primary", note: "Jasmine — direct-to-camera, bright, high-energy hook delivery. Good for playful youthful brands." },
  { id: "jasmine_vertical_secondary", note: "Jasmine — alternate angle, casual get-ready-with-me energy." },
  { id: "jasmine_vertical_walking", note: "Jasmine — walking shot, kinetic street-UGC energy. Use when the brand tone is bold and outdoors." },
  { id: "aisha_vertical_walking", note: "Aisha — walking shot, effortless on-the-go energy. Good for lifestyle and fashion." },
  { id: "elena_vertical_primary", note: "Elena — direct-to-camera, calm and credible. Good for clinical or premium positioning." },
  { id: "elena_vertical_secondary", note: "Elena — alternate angle, understated, quiet-luxury energy." },
] as const;

export type AvatarId = (typeof AVATAR_ROSTER)[number]["id"];

const AVATAR_IDS = AVATAR_ROSTER.map((a) => a.id) as [AvatarId, ...AvatarId[]];

export function isAvatarId(id: string): id is AvatarId {
  return (AVATAR_IDS as readonly string[]).includes(id);
}

export type AvatarSpot = {
  brand: string;
  avatarId: AvatarId;
  avatarLook: string;
  musicBed: string;
  captions: string;
  vo: string;
  script: string;
};

const Spot = z.object({
  avatarId: z
    .enum(AVATAR_IDS)
    .describe("The VEED avatar cast for this brand, chosen from the roster."),
  avatarLook: z
    .string()
    .describe("Why this cast: energy, framing, wardrobe vibe matching brand tone. Not a celebrity."),
  musicBed: z.string(),
  captions: z.string().describe("On-screen caption style and the one line that should burn in."),
  vo: z
    .string()
    .describe("The exact words the avatar speaks, 12–20 seconds. Include one real-sounding customer line in quotes."),
  script: z.string().describe("Director notes: OPEN ON / CUT TO / END CARD."),
});

export function getMockAvatar(): AvatarSpot {
  return {
    brand: "Watermelon Glow Niacinamide Dew Drops",
    avatarId: "mira_vertical_primary",
    avatarLook:
      "Mira, direct-to-camera. Fresh not glam, pastel knit, bathroom-mirror energy. Warm, slightly sarcastic. Not a supermodel.",
    musicBed: "Soft lo-fi keys, no lyrics, 95 BPM. Lift on the end card.",
    captions: "Big, clean, left-aligned. Burn in: “lit-from-within after four days.”",
    vo: "Okay so I did not expect this. “My skin looked lit-from-within after four days. Four.” Watermelon Glow Dew Drops. Thirty-six dollars. That’s the post.",
    script:
      "OPEN ON avatar in a bright bathroom. CUT TO dropper in hand. VO the four-day line. END CARD: product + $36 on mint.",
  };
}

/**
 * The casting + scriptwriting prompt. The vo field is fed VERBATIM to
 * VEED's text-to-video avatar, so it has to read as clean speech — every
 * stage direction lives in `script`, never in `vo`.
 */
const SPOT_SYSTEM_PROMPT = [
  "You are the creative director casting and writing a VEED avatar spot — a 9:16 talking-head ad for one product.",
  "",
  "CASTING — pick exactly one avatarId from this roster and match its energy to the brand tone and category:",
  ...AVATAR_ROSTER.map((a) => `- ${a.id}: ${a.note}`),
  "Direct-to-camera (primary) sells trust; alternate angles (secondary) sell intimacy; walking shots sell momentum. Choose deliberately and justify the cast in avatarLook.",
  "",
  "VOICEOVER (`vo`) — the avatar will speak this text verbatim, so:",
  "- 12–20 seconds spoken ≈ 35–55 words. Count them.",
  "- Plain speech only: no stage directions, no emoji, no ALL-CAPS, no headings, nothing a human would not say aloud.",
  "- First sentence is the hook — mid-thought, specific, never a greeting.",
  "- Include ONE real-sounding customer line in quotes, woven in naturally.",
  "- Say the product name and the real price exactly once each.",
  "- Numbers as a voice would say them (write 'thirty-six dollars', not '$36').",
  "- End with a flat, confident close — a statement, not a plea.",
  "",
  "THE REST:",
  "- `script`: director notes in the shape OPEN ON … CUT TO … END CARD …, one line each. Stage directions live here, never in vo.",
  "- `captions`: caption style plus the single line worth burning in — usually the customer quote.",
  "- `musicBed`: genre, BPM, no-lyrics or not, and where it lifts.",
  "",
  "GROUNDING — never invent ingredients, percentages, or prices; use only the provided facts. The avatar must feel like this brand, not a generic AI presenter. Banned words: Discover, Experience, Revitalize, Elevate, game-changer.",
].join("\n");

export async function avatarSpot(url: string): Promise<AvatarSpot> {
  if (!process.env.OPENAI_API_KEY) return getMockAvatar();

  try {
    const facts = await extract(url);
    const completion = await getOpenAI().chat.completions.parse({
      model: "gpt-4o",
      temperature: 0.7,
      messages: [
        { role: "system", content: SPOT_SYSTEM_PROMPT },
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

/* ------------------------------------------------------------------ */
/* Step 2 — render the spot through VEED on fal                        */
/* ------------------------------------------------------------------ */

export type AvatarRender = {
  videoUrl: string;
  /** Served from the disk cache — warm demo runs skip the render. */
  cached: boolean;
  /** No FAL_KEY: a placeholder clip so the UI is never blocked. */
  mock: boolean;
};

// Avatar renders take minutes and cost credits — cache by (avatar, vo) so
// rehearsal runs and the live demo hit disk, same idea as .lora-cache.
const CACHE_DIR = path.join(process.cwd(), ".avatar-cache");

function cacheKey(avatarId: string, vo: string): string {
  return createHash("sha256").update(`${avatarId}\n${vo}`).digest("hex").slice(0, 16);
}

async function readRenderCache(key: string): Promise<string | null> {
  try {
    const raw = await readFile(path.join(CACHE_DIR, `${key}.json`), "utf8");
    const { videoUrl } = JSON.parse(raw) as { videoUrl?: string };
    return videoUrl?.startsWith("http") ? videoUrl : null;
  } catch {
    return null;
  }
}

async function writeRenderCache(key: string, videoUrl: string): Promise<void> {
  try {
    await mkdir(CACHE_DIR, { recursive: true });
    await writeFile(
      path.join(CACHE_DIR, `${key}.json`),
      JSON.stringify({ videoUrl }, null, 2)
    );
  } catch (err) {
    console.error("[avatar] cache write failed (render still returned):", err);
  }
}

/**
 * VEED word-level captions on the avatar's REAL speech. Unlike the Kling
 * films (silent, so `srt_content` is supplied), the avatar clip has a voice
 * track — omit `srt_content` and VEED transcribes it, keeping the burn-in
 * perfectly synced to the spoken VO.
 */
async function burnAvatarCaptions(videoUrl: string): Promise<string> {
  const { data } = await getFal().subscribe("veed/subtitles", {
    input: {
      video_url: videoUrl,
      preset: "fusion",
      customization: {
        position: "bottom",
        shadow: "max",
        text_customizations: {
          baseline: { weight: 800 },
          highlight: { weight: 900, color: "#FFD400" },
        },
      },
    },
  });
  return (data as { video: { url: string } }).video.url;
}

export async function renderAvatarSpot(
  avatarId: AvatarId,
  vo: string
): Promise<AvatarRender> {
  if (!process.env.FAL_KEY) {
    await new Promise((r) => setTimeout(r, 1500));
    return { videoUrl: "/mock/ad-1.mp4", cached: false, mock: true };
  }

  const key = cacheKey(avatarId, vo);
  const hit = await readRenderCache(key);
  if (hit) return { videoUrl: hit, cached: true, mock: false };

  const { data } = await getFal().subscribe("veed/avatars/text-to-video", {
    input: { avatar_id: avatarId, text: vo },
  });
  const rawUrl = (data as { video: { url: string } }).video.url;

  let videoUrl = rawUrl;
  try {
    videoUrl = await burnAvatarCaptions(rawUrl);
  } catch (err) {
    // Captions are a finishing touch — never let them sink the render.
    console.error("[avatar] VEED subtitles failed, using uncaptioned spot:", err);
  }

  await writeRenderCache(key, videoUrl);
  return { videoUrl, cached: false, mock: false };
}
