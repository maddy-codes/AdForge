import { getAuthUserId } from "@convex-dev/auth/server";
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

/** Save a finished pipeline run for the signed-in user. No-op if signed out. */
export const save = mutation({
  args: {
    url: v.string(),
    productName: v.optional(v.string()),
    elapsedMs: v.optional(v.number()),
    events: v.array(v.any()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    return ctx.db.insert("generations", { userId, ...args });
  },
});

/** List the signed-in user's past runs, most recent first. Empty if signed out. */
export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    return ctx.db
      .query("generations")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .take(20);
  },
});

export const remove = mutation({
  args: { id: v.id("generations") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    const row = await ctx.db.get(args.id);
    if (!row || row.userId !== userId) return;
    await ctx.db.delete(args.id);
  },
});
