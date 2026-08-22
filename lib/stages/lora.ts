import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import JSZip from "jszip";
import { getFal } from "@/lib/fal";
import { getConvexServer } from "@/lib/convexServer";
import { api } from "@/convex/_generated/api";

/**
 * Brand LoRA training (D3, D6).
 *
 * D3: training kicks off on URL submit and runs async — videos generate via
 * style-prompting while it trains, then swap to LoRA output when it lands.
 * The cache lives in the Convex `loras` table (keyed by product URL) so a
 * LoRA trained anywhere — including the boot pretrain — makes every later
 * run hot. The legacy `.lora-cache` disk folder is read once as a fallback
 * and migrated into Convex on hit.
 *
 * D6 stage 1: `fal-ai/flux-lora-fast-training` on the product images.
 */

const LEGACY_CACHE_DIR = path.join(process.cwd(), ".lora-cache");
const PUBLIC_DIR = path.join(process.cwd(), "public");

function legacyCacheKey(url: string): string {
  return createHash("sha256").update(url).digest("hex").slice(0, 16);
}

export function getMockLoraId(): string {
  return "mock-lora://glowrecipe-watermelon-dew-drops";
}

async function readLegacyDiskCache(url: string): Promise<string | null> {
  try {
    const raw = await readFile(
      path.join(LEGACY_CACHE_DIR, `${legacyCacheKey(url)}.json`),
      "utf8"
    );
    return (JSON.parse(raw) as { loraId: string }).loraId;
  } catch {
    return null;
  }
}

async function readCache(url: string): Promise<string | null> {
  const convex = getConvexServer();
  const hit = await convex
    .query(api.loras.lookup, { url })
    .catch(() => null);
  if (hit) return hit;

  const legacy = await readLegacyDiskCache(url);
  if (legacy) {
    await convex.mutation(api.loras.save, { url, loraId: legacy }).catch(() => {});
  }
  return legacy;
}

async function writeCache(url: string, loraId: string): Promise<void> {
  await getConvexServer().mutation(api.loras.save, { url, loraId });
}

/** Local `/mock/...` paths are read straight off disk; anything else is fetched. */
async function loadImage(imageUrl: string): Promise<Buffer> {
  if (imageUrl.startsWith("/")) {
    return readFile(path.join(PUBLIC_DIR, imageUrl));
  }
  const res = await fetch(imageUrl);
  if (!res.ok) throw new Error(`image fetch failed: ${imageUrl} (${res.status})`);
  return Buffer.from(await res.arrayBuffer());
}

async function buildTrainingZipUrl(imageUrls: string[]): Promise<string> {
  const zip = new JSZip();
  const images = await Promise.all(imageUrls.map(loadImage));
  images.forEach((buf, i) => zip.file(`image-${i}.png`, buf));
  const blob = await zip.generateAsync({ type: "blob" });
  return getFal().storage.upload(blob as unknown as Blob);
}

export type LoraResult = { loraId: string; cached: boolean };

export async function trainLora(
  url: string,
  imageUrls: string[]
): Promise<LoraResult> {
  if (!process.env.FAL_KEY) {
    const hit = await readCache(url);
    return { loraId: hit ?? getMockLoraId(), cached: Boolean(hit) };
  }

  // A cache entry written before FAL_KEY existed holds a `mock-lora://` id,
  // not a real fal weights URL — trust it only once it looks like one.
  const hit = await readCache(url);
  if (hit?.startsWith("http")) return { loraId: hit, cached: true };

  const fal = getFal();
  const images_data_url = await buildTrainingZipUrl(imageUrls);

  const { request_id } = await fal.queue.submit("fal-ai/flux-lora-fast-training", {
    input: { images_data_url },
  });

  // Training runs for minutes — poll rather than block a single request.
  let status = await fal.queue.status("fal-ai/flux-lora-fast-training", {
    requestId: request_id,
  });
  while (status.status !== "COMPLETED") {
    await new Promise((r) => setTimeout(r, 5000));
    status = await fal.queue.status("fal-ai/flux-lora-fast-training", {
      requestId: request_id,
    });
  }

  const result = await fal.queue.result("fal-ai/flux-lora-fast-training", {
    requestId: request_id,
  });
  const loraId = (result.data as { diffusers_lora_file: { url: string } })
    .diffusers_lora_file.url;

  await writeCache(url, loraId);
  return { loraId, cached: false };
}
