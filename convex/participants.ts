import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const join = mutation({
  args: {
    presentation_id: v.string(),
    participant_id: v.string(),
    name: v.optional(v.union(v.string(), v.null())),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("participants")
      .withIndex("by_presentation_participant", (q) =>
        q.eq("presentation_id", args.presentation_id).eq("participant_id", args.participant_id)
      )
      .first();

    const now = new Date().toISOString();
    if (existing) {
      if (args.name) {
        await ctx.db.patch(existing._id, { name: args.name });
      }
      return existing._id;
    }

    return await ctx.db.insert("participants", {
      presentation_id: args.presentation_id,
      participant_id: args.participant_id,
      name: args.name ?? null,
      joined_at: now,
    });
  },
});

export const count = query({
  args: { presentation_id: v.string() },
  handler: async (ctx, args) => {
    const list = await ctx.db
      .query("participants")
      .withIndex("by_presentation_id", (q) => q.eq("presentation_id", args.presentation_id))
      .collect();
    return list.length;
  },
});

export const list = query({
  args: { presentation_id: v.string() },
  handler: async (ctx, args) => {
    const list = await ctx.db
      .query("participants")
      .withIndex("by_presentation_id", (q) => q.eq("presentation_id", args.presentation_id))
      .collect();
    return list.map((p) => ({ ...p, id: p._id }));
  },
});
