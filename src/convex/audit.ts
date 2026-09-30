// Login audit trail.
//
// Every sign-in attempt (success or failure) is recorded. Reading the audit
// is restricted to a fixed admin allowlist (ADMIN_EMAILS env var) that must
// also present the shared admin panel password (ADMIN_PANEL_PASSWORD).

import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { mutation } from "./_generated/server";

function adminEmails(): string[] {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter((e) => e.includes("@"));
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Record one sign-in attempt. Callable unauthenticated so failures are logged too. */
export const recordLogin = mutation({
  args: {
    email: v.string(),
    success: v.boolean(),
    method: v.string(),
    detail: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const email = args.email.trim().toLowerCase().slice(0, 200);
    if (!EMAIL_RE.test(email)) return null;

    // If the caller is signed in, link the row to their user id.
    const userId = await getAuthUserId(ctx);

    await ctx.db.insert("loginAudit", {
      email,
      userId: userId ?? undefined,
      success: args.success,
      method: args.method.slice(0, 40),
      detail: args.detail?.slice(0, 300),
      at: Date.now(),
    });
    return null;
  },
});

export interface AuditRow {
  id: string;
  email: string;
  success: boolean;
  method: string;
  detail?: string;
  at: number;
}

export interface AuditAccessResult {
  allowed: boolean;
  reason?: "auth" | "email" | "password";
  rows?: AuditRow[];
  summary?: {
    total: number;
    successful: number;
    failed: number;
    uniqueUsers: number;
    lastLoginAt?: number;
  };
}

/** Fetch the audit trail. Requires an admin email AND the panel password. */
export const auditAccess = mutation({
  args: { password: v.string() },
  handler: async (ctx, args): Promise<AuditAccessResult> => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      return { allowed: false, reason: "auth" };
    }
    const user = await ctx.db.get(userId);
    const email = (user?.email ?? "").toLowerCase();
    if (!adminEmails().includes(email)) {
      return { allowed: false, reason: "email" };
    }
    if (args.password !== (process.env.ADMIN_PANEL_PASSWORD ?? "")) {
      return { allowed: false, reason: "password" };
    }

    const all = await ctx.db.query("loginAudit").collect();
    all.sort((a, b) => b.at - a.at);

    const successful = all.filter((r) => r.success).length;
    const unique = new Set(all.filter((r) => r.success).map((r) => r.email));

    return {
      allowed: true,
      rows: all.slice(0, 300).map((r) => ({
        id: r._id,
        email: r.email,
        success: r.success,
        method: r.method,
        detail: r.detail,
        at: r.at,
      })),
      summary: {
        total: all.length,
        successful,
        failed: all.length - successful,
        uniqueUsers: unique.size,
        lastLoginAt: all[0]?.at,
      },
    };
  },
});
