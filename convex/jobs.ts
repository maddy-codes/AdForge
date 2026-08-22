import { getAuthUserId } from "@convex-dev/auth/server";
import { mutation, query, type MutationCtx } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import { v } from "convex/values";
import schema, {
  conceptValidator,
  factsValidator,
  hookValidator,
  renderStatusValidator,
} from "./schema";

/**
 * Pipeline job state. The orchestrator is the Next.js server route (it owns
 * the partner API keys), so the worker mutations here are necessarily public —
 * an HTTP client can't call internal functions. Every write is guarded by the
 * per-job `token` the route minted at create time; `watch` strips the token
 * before anything reaches a browser.
 */

const stageNameValidator = v.union(
  v.literal("extract"),
  v.literal("reviews"),
  v.literal("concepts"),
  v.literal("lora"),
  v.literal("render")
);

const PENDING = { status: "pending" as const };

async function requireJob(
  ctx: MutationCtx,
  jobId: Id<"jobs">,
  token: string
): Promise<Doc<"jobs">> {
  const job = await ctx.db.get(jobId);
  if (!job || job.token !== token) throw new Error("unknown job or bad token");
  return job;
}

/** Mint a run. Signed-in creators get it attached to their history. */
export const create = mutation({
  args: { url: v.string(), token: v.string() },
  returns: v.id("jobs"),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    return ctx.db.insert("jobs", {
      url: args.url,
      token: args.token,
      userId: userId ?? undefined,
      status: "running",
      stages: {
        extract: PENDING,
        reviews: PENDING,
        concepts: PENDING,
        lora: PENDING,
        render: PENDING,
      },
      startedAt: Date.now(),
    });
  },
});

export const stageRunning = mutation({
  args: { jobId: v.id("jobs"), token: v.string(), stage: stageNameValidator },
  returns: v.null(),
  handler: async (ctx, args) => {
    const job = await requireJob(ctx, args.jobId, args.token);
    await ctx.db.patch(args.jobId, {
      stages: { ...job.stages, [args.stage]: { status: "running" } },
    });
    return null;
  },
});

export const recordFacts = mutation({
  args: { jobId: v.id("jobs"), token: v.string(), facts: factsValidator },
  returns: v.null(),
  handler: async (ctx, args) => {
    const job = await requireJob(ctx, args.jobId, args.token);
    await ctx.db.patch(args.jobId, {
      facts: args.facts,
      stages: {
        ...job.stages,
        extract: { status: "done", detail: args.facts.name },
      },
    });
    return null;
  },
});

export const recordHooks = mutation({
  args: {
    jobId: v.id("jobs"),
    token: v.string(),
    hooks: v.array(hookValidator),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const job = await requireJob(ctx, args.jobId, args.token);
    await ctx.db.patch(args.jobId, {
      hooks: args.hooks,
      stages: {
        ...job.stages,
        reviews: { status: "done", detail: `${args.hooks.length} hooks` },
      },
    });
    return null;
  },
});

/** Persist the chosen concepts as queued render rows, one per video worker. */
export const recordConcepts = mutation({
  args: {
    jobId: v.id("jobs"),
    token: v.string(),
    concepts: v.array(conceptValidator),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const job = await requireJob(ctx, args.jobId, args.token);
    for (const [index, concept] of args.concepts.entries()) {
      await ctx.db.insert("renders", {
        jobId: args.jobId,
        index,
        concept,
        status: "queued",
      });
    }
    await ctx.db.patch(args.jobId, {
      stages: {
        ...job.stages,
        concepts: {
          status: "done",
          detail: `${args.concepts.length} concepts`,
        },
      },
    });
    return null;
  },
});

export const recordLora = mutation({
  args: {
    jobId: v.id("jobs"),
    token: v.string(),
    loraId: v.union(v.string(), v.null()),
    cached: v.boolean(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const job = await requireJob(ctx, args.jobId, args.token);
    const detail = args.cached
      ? "cached — hot"
      : args.loraId
        ? "trained"
        : "style fallback";
    await ctx.db.patch(args.jobId, {
      loraId: args.loraId ?? undefined,
      loraCached: args.cached,
      stages: { ...job.stages, lora: { status: "done", detail } },
    });
    return null;
  },
});

/** One render worker reporting progress — each patches only its own row. */
export const updateRender = mutation({
  args: {
    jobId: v.id("jobs"),
    token: v.string(),
    index: v.number(),
    status: renderStatusValidator,
    videoUrl: v.optional(v.string()),
    keyframeUrl: v.optional(v.string()),
    genericKeyframeUrl: v.optional(v.string()),
    usedLora: v.optional(v.boolean()),
    error: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireJob(ctx, args.jobId, args.token);
    const row = await ctx.db
      .query("renders")
      .withIndex("by_job_and_index", (q) =>
        q.eq("jobId", args.jobId).eq("index", args.index)
      )
      .unique();
    if (!row) throw new Error(`no render row for index ${args.index}`);
    const now = Date.now();
    await ctx.db.patch(row._id, {
      status: args.status,
      videoUrl: args.videoUrl,
      keyframeUrl: args.keyframeUrl,
      genericKeyframeUrl: args.genericKeyframeUrl,
      usedLora: args.usedLora,
      error: args.error,
      startedAt: row.startedAt ?? (args.status === "rendering" ? now : undefined),
      finishedAt:
        args.status === "done" || args.status === "failed" ? now : undefined,
    });
    return null;
  },
});

export const complete = mutation({
  args: {
    jobId: v.id("jobs"),
    token: v.string(),
    rendered: v.number(),
    total: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const job = await requireJob(ctx, args.jobId, args.token);
    const allFailed = args.rendered === 0;
    await ctx.db.patch(args.jobId, {
      status: allFailed ? "failed" : "done",
      error: allFailed ? "every render failed" : undefined,
      finishedAt: Date.now(),
      stages: {
        ...job.stages,
        render: {
          status: allFailed ? "failed" : "done",
          detail: `${args.rendered}/${args.total} videos`,
        },
      },
    });
    return null;
  },
});

export const fail = mutation({
  args: { jobId: v.id("jobs"), token: v.string(), message: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const job = await requireJob(ctx, args.jobId, args.token);
    // Anything mid-flight when the pipeline died is failed, not stuck running.
    const stages = Object.fromEntries(
      Object.entries(job.stages).map(([stage, state]) => [
        stage,
        state.status === "running" ? { status: "failed" as const } : state,
      ])
    ) as Doc<"jobs">["stages"];
    await ctx.db.patch(args.jobId, {
      status: "failed",
      error: args.message,
      finishedAt: Date.now(),
      stages,
    });
    return null;
  },
});

/** The UI's single reactive subscription: job (sans token) + its renders. */
export const watch = query({
  args: { jobId: v.id("jobs") },
  returns: v.union(
    v.null(),
    v.object({
      job: schema.doc("jobs").omit("token"),
      renders: v.array(schema.doc("renders")),
    })
  ),
  handler: async (ctx, args) => {
    const job = await ctx.db.get(args.jobId);
    if (!job) return null;
    const { token: _token, ...safeJob } = job;
    // Bounded: a job only ever has CONCEPT_COUNT render rows.
    const renders = await ctx.db
      .query("renders")
      .withIndex("by_job_and_index", (q) => q.eq("jobId", args.jobId))
      .collect();
    return { job: safeJob, renders };
  },
});

/** Signed-in user's past runs, newest first. Empty when signed out. */
export const history = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("jobs"),
      url: v.string(),
      productName: v.optional(v.string()),
      status: v.union(
        v.literal("running"),
        v.literal("done"),
        v.literal("failed")
      ),
      startedAt: v.number(),
      finishedAt: v.optional(v.number()),
    })
  ),
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    const jobs = await ctx.db
      .query("jobs")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .take(20);
    return jobs.map((job) => ({
      _id: job._id,
      url: job.url,
      productName: job.facts?.name,
      status: job.status,
      startedAt: job.startedAt,
      finishedAt: job.finishedAt,
    }));
  },
});
