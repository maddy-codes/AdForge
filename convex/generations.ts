import { mutation, query } from "./_generated/server";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { v } from "convex/values";

async function clerkUserId(ctx: QueryCtx | MutationCtx) {
  const identity = await ctx.auth.getUserIdentity();
  return identity?.subject ?? null;
}

export const save = mutation({
  args: {
    url: v.string(),
    productName: v.optional(v.string()),
    elapsedMs: v.optional(v.number()),
    events: v.array(v.any()),
  },
  handler: async (ctx, args) => {
    const userId = await clerkUserId(ctx);
    if (!userId) return null;
    return ctx.db.insert("generations", { userId, ...args });
  },
});

export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await clerkUserId(ctx);
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
    const userId = await clerkUserId(ctx);
    const row = await ctx.db.get(args.id);
    if (!row || row.userId !== userId) return;
    await ctx.db.delete(args.id);
  },
});
