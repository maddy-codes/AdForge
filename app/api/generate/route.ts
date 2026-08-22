import { NextRequest } from "next/server";
import { extract } from "@/lib/stages/extract";
import { reviews } from "@/lib/stages/reviews";
import { concepts, CONCEPT_COUNT } from "@/lib/stages/concepts";
import { trainLora, type LoraResult } from "@/lib/stages/lora";
import { render } from "@/lib/stages/render";
import type { PipelineEvent } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 300;

/** Resolves to the value if the promise has already settled, else null. */
async function readyOrNull<T>(p: Promise<T>): Promise<T | null> {
  return Promise.race([p, Promise.resolve(null)]) as Promise<T | null>;
}

export async function POST(req: NextRequest) {
  const { url } = (await req.json()) as { url?: string };
  if (!url) {
    return new Response(JSON.stringify({ error: "url required" }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }

  const started = Date.now();
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: PipelineEvent) =>
        controller.enqueue(encoder.encode(JSON.stringify(event) + "\n"));

      try {
        // 1. Extract ------------------------------------------------------
        send({ type: "stage", stage: "extract", status: "running" });
        const facts = await extract(url);
        send({ type: "facts", facts });
        send({
          type: "stage",
          stage: "extract",
          status: "done",
          detail: facts.name,
        });

        // D3: training starts the moment we have images and runs alongside
        // everything below. Nothing awaits it until render time.
        send({ type: "stage", stage: "lora", status: "running" });
        const loraPromise: Promise<LoraResult> = trainLora(
          url,
          facts.imageUrls
        ).catch(() => ({ loraId: "", cached: false }));

        // 2. Reviews ------------------------------------------------------
        send({ type: "stage", stage: "reviews", status: "running" });
        const { hooks } = await reviews(facts.name);
        send({ type: "hooks", hooks });
        send({
          type: "stage",
          stage: "reviews",
          status: "done",
          detail: `${hooks.length} hooks`,
        });

        // 3. Concepts -----------------------------------------------------
        send({ type: "stage", stage: "concepts", status: "running" });
        const all = await concepts(facts, hooks);
        const chosen = all.slice(0, CONCEPT_COUNT);
        send({ type: "concepts", concepts: chosen });
        send({
          type: "stage",
          stage: "concepts",
          status: "done",
          detail: `${chosen.length} concepts`,
        });

        // 4. Render -------------------------------------------------------
        // If the LoRA is already hot (cached, per D3) we use it; if it is still
        // training we fall back to style-prompting rather than block the demo.
        const early = await readyOrNull(loraPromise);
        if (early) {
          send({
            type: "lora",
            loraId: early.loraId || null,
            cached: early.cached,
          });
          send({
            type: "stage",
            stage: "lora",
            status: "done",
            detail: early.cached ? "cached — hot" : "trained",
          });
        }

        send({ type: "stage", stage: "render", status: "running" });
        for (const [index, concept] of chosen.entries()) {
          const lora = early ?? (await readyOrNull(loraPromise));
          const result = await render(concept.shots, lora?.loraId ?? null, index);
          send({ type: "video", index, concept, result });
        }
        send({ type: "stage", stage: "render", status: "done" });

        // Make sure the LoRA stage never ends up stuck on "running".
        if (!early) {
          const late = await loraPromise;
          send({
            type: "lora",
            loraId: late.loraId || null,
            cached: late.cached,
          });
          send({ type: "stage", stage: "lora", status: "done" });
        }

        send({ type: "done", elapsedMs: Date.now() - started });
      } catch (err) {
        send({
          type: "error",
          message: err instanceof Error ? err.message : String(err),
        });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "content-type": "application/x-ndjson; charset=utf-8",
      "cache-control": "no-cache, no-transform",
      connection: "keep-alive",
    },
  });
}
