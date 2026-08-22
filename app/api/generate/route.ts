import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse, after } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { getConvexServer } from "@/lib/convexServer";
import { extract } from "@/lib/stages/extract";
import { reviews } from "@/lib/stages/reviews";
import { concepts, CONCEPT_COUNT } from "@/lib/stages/concepts";
import { trainLora, type LoraResult } from "@/lib/stages/lora";
import { render } from "@/lib/stages/render";
import { parseBrief, type AdBrief } from "@/lib/brief";

export const runtime = "nodejs";
export const maxDuration = 300;

/**
 * Async job kickoff. The response is just `{ jobId }` — the pipeline keeps
 * running server-side (via `after()`) and writes every transition to Convex,
 * so the client subscribes reactively and a refresh re-attaches to the run
 * instead of losing it.
 */
export async function POST(req: NextRequest) {
  const body = (await req.json()) as { url?: string; brief?: unknown };
  const url = body.url;
  if (!url) {
    return NextResponse.json({ error: "url required" }, { status: 400 });
  }
  const brief = parseBrief(body.brief);

  // Per-job write bearer: stored on the job, never sent to the browser.
  const token = randomUUID();

  // Only job creation is auth-aware (attaches the run to a signed-in user's
  // history); the background workers authenticate with the job token alone.
  const convex = getConvexServer();
  const authToken = await auth()
    .then(({ getToken }) => getToken({ template: "convex" }))
    .catch(() => undefined);
  if (authToken) convex.setAuth(authToken);
  const jobId = await convex.mutation(api.jobs.create, { url, token });

  after(() => runPipeline(jobId, token, url, brief));

  return NextResponse.json({ jobId }, { status: 202 });
}

/** Resolves to the value if the promise has already settled, else null. */
async function readyOrNull<T>(p: Promise<T>): Promise<T | null> {
  return Promise.race([p, Promise.resolve(null)]) as Promise<T | null>;
}

async function runPipeline(
  jobId: Id<"jobs">,
  token: string,
  url: string,
  brief?: AdBrief,
) {
  const convex = getConvexServer();
  const job = { jobId, token };

  try {
    // 1. Extract ----------------------------------------------------------
    await convex.mutation(api.jobs.stageRunning, { ...job, stage: "extract" });
    const facts = await extract(url);
    await convex.mutation(api.jobs.recordFacts, { ...job, facts });

    // D3: training starts the moment we have images and runs alongside
    // everything below; it reports to the job the instant it settles.
    await convex.mutation(api.jobs.stageRunning, { ...job, stage: "lora" });
    const loraPromise: Promise<LoraResult> = trainLora(url, facts.imageUrls)
      .then(async (result) => {
        await convex.mutation(api.jobs.recordLora, {
          ...job,
          loraId: result.loraId || null,
          cached: result.cached,
        });
        return result;
      })
      .catch(async () => {
        const miss: LoraResult = { loraId: "", cached: false };
        await convex
          .mutation(api.jobs.recordLora, { ...job, loraId: null, cached: false })
          .catch(() => {});
        return miss;
      });

    // 2. Reviews ----------------------------------------------------------
    await convex.mutation(api.jobs.stageRunning, { ...job, stage: "reviews" });
    const { hooks } = await reviews(facts.name);
    await convex.mutation(api.jobs.recordHooks, { ...job, hooks });

    // 3. Concepts ---------------------------------------------------------
    await convex.mutation(api.jobs.stageRunning, { ...job, stage: "concepts" });
    const all = await concepts(facts, hooks, brief);
    const chosen = all.slice(0, CONCEPT_COUNT);
    await convex.mutation(api.jobs.recordConcepts, { ...job, concepts: chosen });

    // 4. Render — all concepts at once. Each worker owns one `renders` row,
    // and one bad render no longer sinks the rest of the run.
    await convex.mutation(api.jobs.stageRunning, { ...job, stage: "render" });
    const settled = await Promise.allSettled(
      chosen.map(async (concept, index) => {
        // If the LoRA is already hot we use it; still training means
        // style-prompting rather than blocking the video (D3).
        const lora = await readyOrNull(loraPromise);
        await convex.mutation(api.jobs.updateRender, {
          ...job,
          index,
          status: "rendering",
        });
        try {
          const result = await render(
            concept.shots,
            lora?.loraId || null,
            index,
            concept.hook
          );
          await convex.mutation(api.jobs.updateRender, {
            ...job,
            index,
            status: "done",
            ...result,
            usedLora: Boolean(lora?.loraId),
          });
        } catch (err) {
          await convex.mutation(api.jobs.updateRender, {
            ...job,
            index,
            status: "failed",
            error: err instanceof Error ? err.message : String(err),
          });
          throw err;
        }
      })
    );

    // Don't report done while the LoRA stage is mid-flight (its own `.then`
    // writes the result the moment it lands).
    await loraPromise;

    const rendered = settled.filter((r) => r.status === "fulfilled").length;
    await convex.mutation(api.jobs.complete, {
      ...job,
      rendered,
      total: chosen.length,
    });
  } catch (err) {
    await convex
      .mutation(api.jobs.fail, {
        ...job,
        message: err instanceof Error ? err.message : String(err),
      })
      .catch((persistErr) =>
        console.error("[generate] failed to persist job failure:", persistErr)
      );
  }
}
