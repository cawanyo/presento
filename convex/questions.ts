import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { Id } from "./_generated/dataModel";

export const listByPresentation = query({
  args: { presentation_id: v.string() },
  handler: async (ctx, args) => {
    const list = await ctx.db
      .query("questions")
      .withIndex("by_presentation_id", (q) => q.eq("presentation_id", args.presentation_id))
      .collect();
    return list
      .sort((a, b) => a.position - b.position)
      .map((q) => ({ ...q, id: q._id }));
  },
});

export const getById = query({
  args: { id: v.string() },
  handler: async (ctx, args) => {
    try {
      const q = await ctx.db.get(args.id as Id<"questions">);
      if (!q) return null;
      return { ...q, id: q._id };
    } catch {
      return null;
    }
  },
});

export const create = mutation({
  args: {
    presentation_id: v.string(),
    type: v.union(
      v.literal("text_slide"),
      v.literal("multiple_choice"),
      v.literal("word_cloud"),
      v.literal("open_text"),
      v.literal("rating"),
      v.literal("quiz")
    ),
    title: v.string(),
    options: v.any(),
    correct_option: v.optional(v.union(v.number(), v.null())),
    position: v.number(),
  },
  handler: async (ctx, args) => {
    const now = new Date().toISOString();
    const id = await ctx.db.insert("questions", {
      presentation_id: args.presentation_id,
      type: args.type,
      title: args.title,
      options: args.options,
      correct_option: args.correct_option ?? null,
      position: args.position,
      created_at: now,
    });
    return id;
  },
});

export const update = mutation({
  args: {
    id: v.id("questions"),
    title: v.optional(v.string()),
    type: v.optional(
      v.union(
        v.literal("text_slide"),
        v.literal("multiple_choice"),
        v.literal("word_cloud"),
        v.literal("open_text"),
        v.literal("rating"),
        v.literal("quiz")
      )
    ),
    options: v.optional(v.any()),
    correct_option: v.optional(v.union(v.number(), v.null())),
    position: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const patch: any = {};
    if (args.title !== undefined) patch.title = args.title;
    if (args.type !== undefined) patch.type = args.type;
    if (args.options !== undefined) patch.options = args.options;
    if (args.correct_option !== undefined) patch.correct_option = args.correct_option;
    if (args.position !== undefined) patch.position = args.position;
    await ctx.db.patch(args.id, patch);
  },
});

export const updatePositions = mutation({
  args: {
    positions: v.array(
      v.object({
        id: v.id("questions"),
        position: v.number(),
      })
    ),
  },
  handler: async (ctx, args) => {
    for (const item of args.positions) {
      await ctx.db.patch(item.id, { position: item.position });
    }
  },
});

export const remove = mutation({
  args: { id: v.id("questions") },
  handler: async (ctx, args) => {
    const responses = await ctx.db
      .query("responses")
      .withIndex("by_question_id", (r) => r.eq("question_id", args.id))
      .collect();
    for (const r of responses) {
      await ctx.db.delete(r._id);
    }
    await ctx.db.delete(args.id);
  },
});
