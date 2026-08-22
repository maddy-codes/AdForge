import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import JSZip from "jszip";
import { getFal } from "@/lib/fal";

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
const PUBLIC_DIR = path.join(process.cwd(), "public");

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
