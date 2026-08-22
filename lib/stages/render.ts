import type { RenderResult } from "@/lib/types";
import { getFal } from "@/lib/fal";

/**
 * Stage 4 — render one video per concept.
 *
 * D6, two internal stages (the external contract stays `render(shots, loraId)`):
 *   1. `fal-ai/flux-lora` generates an on-brand keyframe from the shot list
 *   2. Kling 2.5 Turbo Pro (i2v) animates that keyframe
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

export async function render(
  shots: string[],
  loraId: string | null,
  index = 0
): Promise<RenderResult> {
  if (!process.env.FAL_KEY) {
    // Staggered so cards stream in one at a time (D7) instead of all at once.
    await new Promise((r) => setTimeout(r, 1200 + index * 900));
    return getMockRender(index);
  }

  const prompt = shots.join(". ");
  const [keyframeUrl, genericKeyframeUrl] = await Promise.all([
    generateKeyframe(prompt, loraId),
    generateKeyframe(prompt, null),
  ]);
  const videoUrl = await animateKeyframe(keyframeUrl, prompt);

  return { videoUrl, keyframeUrl, genericKeyframeUrl };
}
