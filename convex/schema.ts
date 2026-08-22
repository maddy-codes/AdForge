import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  generations: defineTable({
    userId: v.string(),
    url: v.string(),
    productName: v.optional(v.string()),
    elapsedMs: v.optional(v.number()),
    events: v.array(v.any()),
  }).index("by_user", ["userId"]),
});
