import { v } from "convex/values";
import { internalMutation } from "./_generated/server";

/** Elevate a user to the admin role. Called from the admin credentials provider. */
export const setAdminRole = internalMutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (user && user.role !== "admin") {
      await ctx.db.patch(args.userId, { role: "admin" });
    }
    return null;
  },
});
