import { getFal } from "@/lib/fal";
import { productPhotoLock } from "@/lib/productIdentity";

/**
 * Composite the listing photo into a 9:16 frame. The pack in the photo is
 * the pack in the frame — nano-banana edits the set around it instead of
 * Flux inventing a cousin SKU.
 */
export async function compositeListingFrame(
  scenePrompt: string,
  productImage: string
): Promise<string> {
  const { data } = await getFal().subscribe("fal-ai/nano-banana/edit", {
    input: {
      prompt: `${productPhotoLock()} ${scenePrompt}`,
      image_urls: [productImage],
      aspect_ratio: "9:16",
      output_format: "png",
    },
  });
  const url = (data as { images: { url: string }[] }).images[0]?.url;
  if (!url) throw new Error("nano-banana returned no frame");
  return url;
}
