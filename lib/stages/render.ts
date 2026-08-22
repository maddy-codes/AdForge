import type { RenderResult } from "@/lib/types";
import { getFal } from "@/lib/fal";
import {
  productIdentityLock,
  productMotionLock,
  type ProductIdentity,
} from "@/lib/productIdentity";

/**
 * Stage 4 — render one video per concept.
 *
 * D6, three internal stages (external contract stays `render(shots, loraId)`,
 * `captionText` is an optional fourth param added for VEED captions):
 *   1. `fal-ai/flux-lora` generates an on-brand keyframe from the shot list
 *   2. Kling 2.5 Turbo Pro (i2v) animates that keyframe
 *   3. `veed/subtitles` (fal) burns the concept's hook in as a styled caption —
 *      `srt_content` is supplied directly so it skips transcription entirely
 *      (the Kling clip has no audio track to transcribe from)
 *
 * The generic keyframe — same prompt, no LoRA — is rendered alongside it purely
 * to power the before/after toggle. That toggle is the money shot for the jury,
 * and the LoRA difference reads hardest on a still frame.
 */

const MOCK_VIDEOS = ["/mock/ad-1.mp4", "/mock/ad-2.mp4", "/mock/ad-3.mp4"];
const MOCK_KEYFRAMES = ["/mock/key-1.svg", "/mock/key-2.svg", "/mock/key-3.svg"];
const MOCK_GENERIC = [
  "/mock/generic-1.svg",
  "/mock/generic-2.svg",
  "/mock/generic-3.svg",
];

export function getMockRender(index: number): RenderResult {
  const i = index % MOCK_VIDEOS.length;
  return {
    videoUrl: MOCK_VIDEOS[i],
    keyframeUrl: MOCK_KEYFRAMES[i],
    genericKeyframeUrl: MOCK_GENERIC[i],
  };
}

async function generateKeyframe(
  prompt: string,
  loraId: string | null
): Promise<string> {
  const { data } = await getFal().subscribe("fal-ai/flux-lora", {
    input: {
      prompt,
      image_size: "portrait_16_9",
      loras: loraId ? [{ path: loraId, scale: 1 }] : [],
    },
  });
  return (data as { images: { url: string }[] }).images[0].url;
}

async function animateKeyframe(
  keyframeUrl: string,
  prompt: string
): Promise<string> {
  const { data } = await getFal().subscribe(
    "fal-ai/kling-video/v2.5-turbo/pro/image-to-video",
    { input: { image_url: keyframeUrl, prompt } }
  );
  return (data as { video: { url: string } }).video.url;
}

// "fusion" is one of VEED's dynamic (2x) presets — animated per-word highlight,
// reads far punchier on short-form vertical ad video than the basic tier.
const CAPTION_PRESET = "fusion";

/** One cue spanning the whole clip — good enough for a 5–8s Kling render. */
function buildSrt(text: string): string {
  return `1\n00:00:00,000 --> 00:00:08,000\n${text}\n`;
}

async function burnCaptions(videoUrl: string, captionText: string): Promise<string> {
  const { data } = await getFal().subscribe("veed/subtitles", {
    input: {
      video_url: videoUrl,
      preset: CAPTION_PRESET,
      srt_content: buildSrt(captionText),
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

export async function render(
  shots: string[],
  loraId: string | null,
  index = 0,
  captionText?: string,
  product?: ProductIdentity
): Promise<RenderResult> {
  if (!process.env.FAL_KEY) {
    // Staggered so cards stream in one at a time (D7) instead of all at once.
    await new Promise((r) => setTimeout(r, 1200 + index * 900));
    return getMockRender(index);
  }

  const body = shots.join(". ");
  const keyframePrompt = product
    ? `${productIdentityLock(product)} ${body}`
    : body;
  const motionPrompt = product
    ? `${productMotionLock(product)} ${body}`
    : body;
  const [keyframeUrl, genericKeyframeUrl] = await Promise.all([
    generateKeyframe(keyframePrompt, loraId),
    generateKeyframe(keyframePrompt, null),
  ]);
  const rawVideoUrl = await animateKeyframe(keyframeUrl, motionPrompt);

  let videoUrl = rawVideoUrl;
  if (captionText) {
    try {
      videoUrl = await burnCaptions(rawVideoUrl, captionText);
    } catch (err) {
      // Captions are a finishing touch — never let them sink the render.
      console.error("[render] VEED subtitles failed, using uncaptioned video:", err);
    }
  }

  return { videoUrl, keyframeUrl, genericKeyframeUrl };
}
