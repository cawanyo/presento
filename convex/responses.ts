import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const listByQuestion = query({
  args: { question_id: v.string() },
  handler: async (ctx, args) => {
    const list = await ctx.db
      .query("responses")
      .withIndex("by_question_id", (q) => q.eq("question_id", args.question_id))
      .collect();
    return list.map((r) => ({ ...r, id: r._id }));
  },
});

export const submit = mutation({
  args: {
    question_id: v.string(),
    participant_id: v.string(),
    participant_name: v.optional(v.union(v.string(), v.null())),
    answers: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const now = new Date().toISOString();
    const insertedIds = [];
    for (const answer of args.answers) {
      const id = await ctx.db.insert("responses", {
        question_id: args.question_id,
        participant_id: args.participant_id,
        participant_name: args.participant_name ?? null,
        answer,
        created_at: now,
      });
      insertedIds.push(id);
    }
    return insertedIds;
  },
});

export const remove = mutation({
  args: { id: v.id("responses") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});

export const removeByWord = mutation({
  args: {
    question_id: v.string(),
    word: v.string(),
  },
  handler: async (ctx, args) => {
    const target = args.word.trim().toLowerCase();
    const responses = await ctx.db
      .query("responses")
      .withIndex("by_question_id", (q) => q.eq("question_id", args.question_id))
      .collect();

    for (const r of responses) {
      if (r.answer.trim().toLowerCase() === target) {
        await ctx.db.delete(r._id);
      }
    }
  },
});

export const clearByQuestion = mutation({
  args: { question_id: v.string() },
  handler: async (ctx, args) => {
    const responses = await ctx.db
      .query("responses")
      .withIndex("by_question_id", (q) => q.eq("question_id", args.question_id))
      .collect();
    for (const r of responses) {
      await ctx.db.delete(r._id);
    }
  },
});
