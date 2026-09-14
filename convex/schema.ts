import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  presentations: defineTable({
    title: v.string(),
    join_code: v.string(),
    status: v.union(v.literal("draft"), v.literal("active"), v.literal("ended")),
    current_question_id: v.optional(v.union(v.string(), v.null())),
    created_at: v.string(),
  })
    .index("by_join_code", ["join_code"]),

  questions: defineTable({
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
    created_at: v.string(),
  })
    .index("by_presentation_id", ["presentation_id"])
    .index("by_presentation_id_position", ["presentation_id", "position"]),

  responses: defineTable({
    question_id: v.string(),
    participant_id: v.string(),
    participant_name: v.optional(v.union(v.string(), v.null())),
    answer: v.string(),
    created_at: v.string(),
  })
    .index("by_question_id", ["question_id"])
    .index("by_question_participant", ["question_id", "participant_id"]),

  participants: defineTable({
    presentation_id: v.string(),
    participant_id: v.string(),
    name: v.optional(v.union(v.string(), v.null())),
    joined_at: v.string(),
  })
    .index("by_presentation_id", ["presentation_id"])
    .index("by_presentation_participant", ["presentation_id", "participant_id"]),
});
