import { authTables } from "@convex-dev/auth/server";
import { defineSchema, defineTable } from "convex/server";
import { Infer, v } from "convex/values";

// default user roles. can add / remove based on the project as needed
export const ROLES = {
  ADMIN: "admin",
  USER: "user",
  MEMBER: "member",
} as const;

export const roleValidator = v.union(
  v.literal(ROLES.ADMIN),
  v.literal(ROLES.USER),
  v.literal(ROLES.MEMBER),
);
export type Role = Infer<typeof roleValidator>;

const schema = defineSchema(
  {
    // default auth tables using convex auth.
    ...authTables, // do not remove or modify

    // the users table is the default users table that is brought in by the authTables
    users: defineTable({
      name: v.optional(v.string()),
      image: v.optional(v.string()),
      email: v.optional(v.string()),
      emailVerificationTime: v.optional(v.number()),
      isAnonymous: v.optional(v.boolean()),

      role: v.optional(roleValidator), // role of the user. do not remove
    }).index("email", ["email"]), // index for the email. do not remove or modify

    // add other tables here

    // Ingested organizational memories (shadow memory store alongside Hindsight).
    ingestedMemories: defineTable({
      userId: v.optional(v.id("users")),
      source: v.string(), // "csv" | "json" | "manual"
      sourceName: v.string(),
      memoryId: v.string(), // e.g. M-9101 (assigned at ingest time)
      kind: v.string(), // episodic | decision | incident | outcome | procedural | workflow
      title: v.string(),
      summary: v.string(),
      date: v.string(),
      actors: v.array(v.string()),
      sequence: v.optional(v.array(v.string())),
      confidence: v.number(),
      createdAt: v.number(),
    })
      .index("by_kind", ["kind"])
      .index("by_user", ["userId"]),

    // Login audit trail — every sign-in attempt (success or failure) is
    // recorded here. Only admin emails may read it (see convex/audit.ts).
    loginAudit: defineTable({
      email: v.string(),
      userId: v.optional(v.id("users")),
      success: v.boolean(),
      method: v.string(), // "email-otp"
      detail: v.optional(v.string()),
      at: v.number(),
    })
      .index("by_email", ["email"])
      .index("by_time", ["at"]),

    // Admin-managed Hindsight connection settings (single row). Only admins
    // may read or change it — see convex/hindsightSettings.ts.
    hindsightSettings: defineTable({
      apiKey: v.string(),
      baseUrl: v.optional(v.string()),
      bankId: v.optional(v.string()),
      updatedBy: v.optional(v.string()),
      updatedAt: v.optional(v.number()),
    }),
  },
  {
    schemaValidation: false,
  },
);

export default schema;
