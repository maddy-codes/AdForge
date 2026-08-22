import { mutation, query } from "./_generated/server";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { v } from "convex/values";
import schema from "./schema";

/**
 * Onboarding profile, one row per signed-in user. The wizard at /onboarding
 * writes it; `get` returning null (or a row without `onboardedAt`) is what
 * routes a fresh user into the wizard. Keyed by Clerk subject to match
 * jobs/generations.
 */

async function clerkUserId(ctx: QueryCtx | MutationCtx) {
  const identity = await ctx.auth.getUserIdentity();
  return identity?.subject ?? null;
}

export const get = query({
  args: {},
  returns: v.union(v.null(), schema.doc("brands")),
  handler: async (ctx) => {
    const userId = await clerkUserId(ctx);
    if (!userId) return null;
    return await ctx.db
      .query("brands")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();
  },
});

export const upsert = mutation({
  args: {
    name: v.string(),
    productUrl: v.optional(v.string()),
    tone: v.optional(v.string()),
  },
  returns: v.id("brands"),
  handler: async (ctx, args) => {
    const userId = await clerkUserId(ctx);
    if (!userId) throw new Error("sign in to save your brand");
    const existing = await ctx.db
      .query("brands")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();
    if (existing) {
      await ctx.db.patch(existing._id, args);
      return existing._id;
    }
    return await ctx.db.insert("brands", { userId, ...args });
  },
});

export const completeOnboarding = mutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const userId = await clerkUserId(ctx);
    if (!userId) throw new Error("sign in to finish onboarding");
    const brand = await ctx.db
      .query("brands")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();
    if (!brand) throw new Error("save your brand details first");
    await ctx.db.patch(brand._id, { onboardedAt: Date.now() });
    return null;
  },
});
