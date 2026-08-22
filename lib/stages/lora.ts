import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

/**
 * Brand LoRA training (D3, D6).
 *
 * D3: training kicks off on URL submit and runs async — videos generate via
 * style-prompting while it trains, then swap to LoRA output when it lands.
 * For the demo the LoRA is pre-trained at boot and cached to disk, so the live
 * run is hot. Cache key is a hash of the product URL.
 *
 * D6 stage 1: `fal-ai/flux-lora-fast-training` on the product images.
 */

const CACHE_DIR = path.join(process.cwd(), ".lora-cache");

function cacheKey(url: string): string {
  return createHash("sha256").update(url).digest("hex").slice(0, 16);
}

export function getMockLoraId(): string {
  return "mock-lora://glowrecipe-watermelon-dew-drops";
}

async function readCache(url: string): Promise<string | null> {
  try {
    const raw = await readFile(
      path.join(CACHE_DIR, `${cacheKey(url)}.json`),
      "utf8"
    );
    return (JSON.parse(raw) as { loraId: string }).loraId;
  } catch {
    return null;
  }
}

async function writeCache(url: string, loraId: string): Promise<void> {
  await mkdir(CACHE_DIR, { recursive: true });
  await writeFile(
    path.join(CACHE_DIR, `${cacheKey(url)}.json`),
    JSON.stringify({ url, loraId, trainedAt: new Date().toISOString() }, null, 2)
  );
}

export type LoraResult = { loraId: string; cached: boolean };

export async function trainLora(
  url: string,
  imageUrls: string[]
): Promise<LoraResult> {
  const hit = await readCache(url);
  if (hit) return { loraId: hit, cached: true };

  if (!process.env.FAL_KEY) {
    return { loraId: getMockLoraId(), cached: false };
  }

  // TODO(G): fal-ai/flux-lora-fast-training on imageUrls, then cache the id.
  void imageUrls;
  const loraId = getMockLoraId();
  await writeCache(url, loraId);
  return { loraId, cached: false };
}
