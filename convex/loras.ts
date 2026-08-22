import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

/**
 * Brand-LoRA cache, keyed by product URL. Replaces the `.lora-cache` disk
 * folder so a LoRA trained on any machine (or the boot-time pretrain) makes
 * every subsequent run hot.
 *
 * `save` is called by the server route and by the boot pretrain — neither has
 * a user or a job token, so it stays an open write of non-sensitive cache
 * data (url → fal weights URL). Demo scope; lock behind a shared key if this
 * ever outlives the hackathon.
 */

export const lookup = query({
  args: { url: v.string() },
  returns: v.union(v.string(), v.null()),
  handler: async (ctx, args) => {
    const hit = await ctx.db
      .query("loras")
      .withIndex("by_url", (q) => q.eq("url", args.url))
      .unique();
    return hit?.loraId ?? null;
  },
});

export const save = mutation({
  args: { url: v.string(), loraId: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("loras")
      .withIndex("by_url", (q) => q.eq("url", args.url))
      .unique();
    if (existing) {
      await ctx.db.patch(existing._id, { loraId: args.loraId });
    } else {
      await ctx.db.insert("loras", { url: args.url, loraId: args.loraId });
    }
    return null;
  },
});
