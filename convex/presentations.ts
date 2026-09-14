import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { Id } from "./_generated/dataModel";

function generateJoinCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export const list = query({
  args: {},
  handler: async (ctx) => {
    const list = await ctx.db.query("presentations").collect();
    return list
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .map((p) => ({ ...p, id: p._id }));
  },
});

export const getById = query({
  args: { id: v.string() },
  handler: async (ctx, args) => {
    try {
      const p = await ctx.db.get(args.id as Id<"presentations">);
      if (!p) return null;
      return { ...p, id: p._id };
    } catch {
      return null;
    }
  },
});

export const getByJoinCode = query({
  args: { join_code: v.string() },
  handler: async (ctx, args) => {
    const code = args.join_code.trim().toUpperCase();
    const p = await ctx.db
      .query("presentations")
      .withIndex("by_join_code", (q) => q.eq("join_code", code))
      .first();
    if (!p) return null;
    return { ...p, id: p._id };
  },
});

export const create = mutation({
  args: { title: v.string() },
  handler: async (ctx, args) => {
    let joinCode = generateJoinCode();
    let existing = await ctx.db
      .query("presentations")
      .withIndex("by_join_code", (q) => q.eq("join_code", joinCode))
      .first();
    while (existing) {
      joinCode = generateJoinCode();
      existing = await ctx.db
        .query("presentations")
        .withIndex("by_join_code", (q) => q.eq("join_code", joinCode))
        .first();
    }

    const now = new Date().toISOString();
    const presentationId = await ctx.db.insert("presentations", {
      title: args.title.trim() || "Nouvelle présentation",
      join_code: joinCode,
      status: "draft",
      current_question_id: null,
      created_at: now,
    });

    const questionId = await ctx.db.insert("questions", {
      presentation_id: presentationId,
      type: "multiple_choice",
      title: "Quel est votre avis ?",
      options: { choices: ["Option 1", "Option 2", "Option 3"], layout: "bars", allowMultiple: false },
      correct_option: null,
      position: 0,
      created_at: now,
    });

    return { presentationId, questionId, joinCode };
  },
});

export const updateTitle = mutation({
  args: { id: v.id("presentations"), title: v.string() },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { title: args.title.trim() });
  },
});

export const updateState = mutation({
  args: {
    id: v.id("presentations"),
    status: v.optional(v.union(v.literal("draft"), v.literal("active"), v.literal("ended"))),
    current_question_id: v.optional(v.union(v.string(), v.null())),
  },
  handler: async (ctx, args) => {
    const patch: any = {};
    if (args.status !== undefined) patch.status = args.status;
    if (args.current_question_id !== undefined) patch.current_question_id = args.current_question_id;
    await ctx.db.patch(args.id, patch);
  },
});

export const remove = mutation({
  args: { id: v.id("presentations") },
  handler: async (ctx, args) => {
    const questions = await ctx.db
      .query("questions")
      .withIndex("by_presentation_id", (q) => q.eq("presentation_id", args.id))
      .collect();

    for (const q of questions) {
      const responses = await ctx.db
        .query("responses")
        .withIndex("by_question_id", (r) => r.eq("question_id", q._id))
        .collect();
      for (const r of responses) {
        await ctx.db.delete(r._id);
      }
      await ctx.db.delete(q._id);
    }

    const participants = await ctx.db
      .query("participants")
      .withIndex("by_presentation_id", (p) => p.eq("presentation_id", args.id))
      .collect();
    for (const p of participants) {
      await ctx.db.delete(p._id);
    }

    await ctx.db.delete(args.id);
  },
});

export const clone = mutation({
  args: { id: v.id("presentations") },
  handler: async (ctx, args) => {
    const original = await ctx.db.get(args.id);
    if (!original) throw new Error("Présentation non trouvée");

    let joinCode = generateJoinCode();
    let existing = await ctx.db
      .query("presentations")
      .withIndex("by_join_code", (q) => q.eq("join_code", joinCode))
      .first();
    while (existing) {
      joinCode = generateJoinCode();
      existing = await ctx.db
        .query("presentations")
        .withIndex("by_join_code", (q) => q.eq("join_code", joinCode))
        .first();
    }

    const now = new Date().toISOString();
    const newPresentationId = await ctx.db.insert("presentations", {
      title: `${original.title} (Copie)`,
      join_code: joinCode,
      status: "draft",
      current_question_id: null,
      created_at: now,
    });

    const originalQuestions = await ctx.db
      .query("questions")
      .withIndex("by_presentation_id", (q) => q.eq("presentation_id", args.id))
      .collect();

    for (const q of originalQuestions) {
      await ctx.db.insert("questions", {
        presentation_id: newPresentationId,
        type: q.type,
        title: q.title,
        options: q.options,
        correct_option: q.correct_option,
        position: q.position,
        created_at: now,
      });
    }

    return newPresentationId;
  },
});
