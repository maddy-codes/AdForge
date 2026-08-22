import { DEMO_URL, getMockFacts } from "@/lib/stages/extract";
import { trainLora } from "@/lib/stages/lora";

if (process.env.FAL_KEY) {
  trainLora(DEMO_URL, getMockFacts().imageUrls).catch((err) => {
    console.error("[boot] demo LoRA pretrain failed:", err);
  });
}
