// Admin-managed Hindsight connection settings.
//
// The API key lives in the `hindsightSettings` table so an admin can rotate it
// from the app without a redeploy. Only allowlisted admin emails (plus the
// admin panel password) may read or change it — nobody else can even see the
// key value. Until an admin saves a key, the deployment's HINDSIGHT_API_KEY
// env var (if any) is used as a fallback, so the engine still works.

import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { internalMutation, internalQuery, MutationCtx, mutation } from "./_generated/server";

/**
 * Internal read used by hindsight.ts actions. Returns the raw admin-saved
 * settings (or null) — never exposed to clients.
 */
export const readRaw = internalQuery({
  args: {},
  handler: async (ctx) => {
    const row = await ctx.db.query("hindsightSettings").unique();
    return row ? { apiKey: row.apiKey, baseUrl: row.baseUrl, bankId: row.bankId } : null;
  },
});

function adminEmails(): string[] {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter((e) => e.includes("@"));
}

async function requireAdmin(ctx: MutationCtx, password: string) {
  const userId = await getAuthUserId(ctx);
  if (userId === null) return { error: "auth" as const };
  const user = await ctx.db.get(userId);
  const email = (user?.email ?? "").toLowerCase();
  if (!adminEmails().includes(email)) return { error: "email" as const };
  if (password !== (process.env.ADMIN_PANEL_PASSWORD ?? "")) return { error: "password" as const };
  const row = await ctx.db.query("hindsightSettings").unique();
  return { ok: true as const, email, row };
}

export interface HindsightSettingsView {
  configured: boolean;
  source: "admin" | "env" | "none";
  maskedKey: string | null;
  baseUrl: string;
  bankId: string;
  updatedBy?: string;
  updatedAt?: number;
}

/** Current settings. Admin-only: reveals a masked key, never the value. */
export const getSettings = mutation({
  args: { password: v.string() },
  handler: async (ctx, args) => {
    const gate = await requireAdmin(ctx, args.password);
    if ("error" in gate) return { error: gate.error };

    const envKey = process.env.HINDSIGHT_API_KEY || "";
    const row = gate.row;
    const key = row?.apiKey || envKey;
    const masked = key
      ? `${key.slice(0, 6)}…${key.slice(-4)} (${key.length} chars)`
      : null;

    return {
      configured: Boolean(key),
      source: row?.apiKey ? "admin" : envKey ? "env" : "none",
      maskedKey: masked,
      baseUrl: row?.baseUrl || process.env.HINDSIGHT_BASE_URL || "https://api.hindsight.vectorize.io",
      bankId: row?.bankId || process.env.HINDSIGHT_BANK_ID || "shadowops-org",
      updatedBy: row?.updatedBy as string | undefined,
      updatedAt: row?.updatedAt as number | undefined,
    };
  },
});

/** Save (or rotate) the key + optional base URL / bank id. Admin-only. */
export const setSettings = mutation({
  args: {
    password: v.string(),
    apiKey: v.string(),
    baseUrl: v.optional(v.string()),
    bankId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const gate = await requireAdmin(ctx, args.password);
    if ("error" in gate) return { error: gate.error };

    const apiKey = args.apiKey.trim();
    if (!apiKey) return { error: "empty_key" };

    const values = {
      apiKey,
      ...(args.baseUrl?.trim() ? { baseUrl: args.baseUrl.trim() } : {}),
      ...(args.bankId?.trim() ? { bankId: args.bankId.trim() } : {}),
      updatedBy: gate.email,
      updatedAt: Date.now(),
    };
    if (gate.row) {
      await ctx.db.patch(gate.row._id, values);
    } else {
      await ctx.db.insert("hindsightSettings", values);
    }
    return { ok: true as const, source: "admin" as const };
  },
});

/** Remove the admin-stored key (falls back to env). Admin-only. */
export const clearSettings = mutation({
  args: { password: v.string() },
  handler: async (ctx, args) => {
    const gate = await requireAdmin(ctx, args.password);
    if ("error" in gate) return { error: gate.error };
    if (gate.row) await ctx.db.delete(gate.row._id);
    return { ok: true as const };
  },
});

