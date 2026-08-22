import { authTables } from "@convex-dev/auth/server";
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

/**
 * Auth + a thin persistence layer on top of the mocked pipeline.
 *
 * CLAUDE.md and DECISIONS.md D8 both say "one product, one run, no auth, no
 * persistence" for the demo path — the URL -> ad gallery flow must keep
 * working with zero sign-in. This schema is an optional layer: a signed-in
 * user's runs get saved to `generations` so they have a history; an anonymous
 * demo run just never writes a row. Never gate rendering itself on auth.
 */
export default defineSchema({
  ...authTables,

  generations: defineTable({
    userId: v.id("users"),
    url: v.string(),
    productName: v.optional(v.string()),
    elapsedMs: v.optional(v.number()),
    // Raw NDJSON pipeline events, for replaying a past run in the gallery
    // without re-calling any partner API.
    events: v.array(v.any()),
  }).index("by_user", ["userId"]),
});
