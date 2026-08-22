import { mutation, query } from "./_generated/server";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { v } from "convex/values";
import schema, { assetKindValidator } from "./schema";

/**
 * The asset collection area. Files live in Convex file storage; rows here
 * hold the storageId + metadata, and signed URLs are minted on every read
 * (never stored). Uploads flow client → generateUploadUrl → POST file →
 * save(storageId). The pipeline trains the brand LoRA from these instead of
 * re-scraping product images off the page on every run.
 */

const MAX_ASSETS = 24;
/** fal LoRA training wants a handful of clean shots, not the whole library. */
const MAX_TRAINING_IMAGES = 10;

async function requireUserId(ctx: QueryCtx | MutationCtx): Promise<string> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("sign in to manage assets");
  return identity.subject;
}

export const generateUploadUrl = mutation({
  args: {},
  returns: v.string(),
  handler: async (ctx) => {
    await requireUserId(ctx);
    return await ctx.storage.generateUploadUrl();
  },
});

export const save = mutation({
  args: {
    storageId: v.id("_storage"),
    filename: v.string(),
    kind: assetKindValidator,
  },
  returns: v.id("assets"),
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const existing = await ctx.db
      .query("assets")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .take(MAX_ASSETS);
    if (existing.length >= MAX_ASSETS) {
      await ctx.storage.delete(args.storageId);
      throw new Error(`asset limit reached (${MAX_ASSETS})`);
    }
    const meta = await ctx.db.system.get(args.storageId);
    if (!meta) throw new Error("upload not found — try again");
    if (!meta.contentType?.startsWith("image/")) {
      await ctx.storage.delete(args.storageId);
      throw new Error("only images are supported");
    }
    return await ctx.db.insert("assets", {
      userId,
      storageId: args.storageId,
      filename: args.filename,
      contentType: meta.contentType,
      size: meta.size,
      kind: args.kind,
    });
  },
});

export const list = query({
  args: {},
  returns: v.array(
    schema.doc("assets").extend({ url: v.union(v.string(), v.null()) })
  ),
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    const rows = await ctx.db
      .query("assets")
      .withIndex("by_user", (q) => q.eq("userId", identity.subject))
      .order("desc")
      .take(MAX_ASSETS);
    return await Promise.all(
      rows.map(async (row) => ({
        ...row,
        url: await ctx.storage.getUrl(row.storageId),
      }))
    );
  },
});

export const remove = mutation({
  args: { id: v.id("assets") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const row = await ctx.db.get(args.id);
    if (!row || row.userId !== userId) throw new Error("asset not found");
    await ctx.storage.delete(row.storageId);
    await ctx.db.delete(args.id);
    return null;
  },
});

/**
 * Signed URLs for LoRA training, product shots first. Called by the server
 * route at kickoff (with the caller's Clerk token) so the pipeline trains on
 * the stored library instead of hot-loading images off the product page.
 */
export const forTraining = query({
  args: {},
  returns: v.array(v.string()),
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    const rows = await ctx.db
      .query("assets")
      .withIndex("by_user", (q) => q.eq("userId", identity.subject))
      .take(MAX_ASSETS);
    const ranked = [
      ...rows.filter((r) => r.kind === "product"),
      ...rows.filter((r) => r.kind !== "product"),
    ].slice(0, MAX_TRAINING_IMAGES);
    const urls = await Promise.all(
      ranked.map((r) => ctx.storage.getUrl(r.storageId))
    );
    return urls.filter((u): u is string => u !== null);
  },
});
