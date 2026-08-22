import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

/**
 * Pipeline state lives here, not in an in-flight HTTP stream. `/api/generate`
 * creates a `jobs` row, returns its id immediately, and the pipeline writes
 * every stage transition to Convex; the UI is a reactive subscription.
 *
 * The demo path stays auth-free (CLAUDE.md / DECISIONS.md D8): anonymous runs
 * simply have no `userId`. Signing in only adds a saved history.
 */

export const stageStatusValidator = v.union(
  v.literal("pending"),
  v.literal("running"),
  v.literal("done"),
  v.literal("failed"),
  v.literal("skipped")
);

export const stageStateValidator = v.object({
  status: stageStatusValidator,
  detail: v.optional(v.string()),
});

export const factsValidator = v.object({
  name: v.string(),
  price: v.string(),
  features: v.array(v.string()),
  materials: v.array(v.string()),
  category: v.string(),
  tone: v.string(),
  imageUrls: v.array(v.string()),
});

export const hookValidator = v.object({
  quote: v.string(),
  theme: v.string(),
});

export const conceptValidator = v.object({
  hook: v.string(),
  script: v.string(),
  shots: v.array(v.string()),
});

export const renderStatusValidator = v.union(
  v.literal("queued"),
  v.literal("rendering"),
  v.literal("done"),
  v.literal("failed")
);

export const assetKindValidator = v.union(
  v.literal("product"),
  v.literal("logo"),
  v.literal("other")
);

export default defineSchema({
  // One row per pipeline run.
  jobs: defineTable({
    url: v.string(),
    // Per-job write bearer, minted by the server route and never sent to the
    // browser (`watch` strips it). Guards every worker mutation.
    token: v.string(),
    // Clerk subject of the signed-in creator; absent on anonymous runs.
    userId: v.optional(v.string()),
    status: v.union(
      v.literal("running"),
      v.literal("done"),
      v.literal("failed")
    ),
    stages: v.object({
      extract: stageStateValidator,
      reviews: stageStateValidator,
      concepts: stageStateValidator,
      lora: stageStateValidator,
      render: stageStateValidator,
    }),
    facts: v.optional(factsValidator),
    hooks: v.optional(v.array(hookValidator)),
    loraId: v.optional(v.string()),
    loraCached: v.optional(v.boolean()),
    error: v.optional(v.string()),
    startedAt: v.number(),
    finishedAt: v.optional(v.number()),
  }).index("by_user", ["userId"]),

  // Saved-run history for signed-in users, keyed by Clerk subject.
  generations: defineTable({
    userId: v.string(),
    url: v.string(),
    productName: v.optional(v.string()),
    elapsedMs: v.optional(v.number()),
    events: v.array(v.any()),
  }).index("by_user", ["userId"]),

  // One row per concept render. A child table (not an array on the job) so
  // the concurrent render workers each patch their own document — no
  // write contention, no 1MB-document creep.
  renders: defineTable({
    jobId: v.id("jobs"),
    index: v.number(),
    concept: conceptValidator,
    status: renderStatusValidator,
    videoUrl: v.optional(v.string()),
    keyframeUrl: v.optional(v.string()),
    genericKeyframeUrl: v.optional(v.string()),
    usedLora: v.optional(v.boolean()),
    error: v.optional(v.string()),
    startedAt: v.optional(v.number()),
    finishedAt: v.optional(v.number()),
  }).index("by_job_and_index", ["jobId", "index"]),

  // Trained brand LoRA per product URL — replaces the `.lora-cache` disk
  // folder, so warm runs skip training on every machine, not just this one.
  loras: defineTable({
    url: v.string(),
    loraId: v.string(),
  }).index("by_url", ["url"]),

  // Onboarding profile — one per signed-in user (Clerk subject, matching
  // jobs/generations). `onboardedAt` unset means the wizard isn't finished.
  brands: defineTable({
    userId: v.string(),
    name: v.string(),
    productUrl: v.optional(v.string()),
    tone: v.optional(v.string()),
    onboardedAt: v.optional(v.number()),
  }).index("by_user", ["userId"]),

  // Uploaded brand assets. The file lives in Convex storage — only the
  // storageId is stored here; signed URLs are minted on read.
  assets: defineTable({
    userId: v.string(),
    storageId: v.id("_storage"),
    filename: v.string(),
    contentType: v.string(),
    size: v.number(),
    kind: assetKindValidator,
  }).index("by_user", ["userId"]),
});
