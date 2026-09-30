// THIS FILE IS READ ONLY. Do not touch this file unless you are correctly adding a new auth provider in accordance to the vly auth documentation

import { convexAuth, createAccount } from "@convex-dev/auth/server";
import { ConvexCredentials } from "@convex-dev/auth/providers/ConvexCredentials";
import { emailOtp } from "./auth/emailOtp";
import { internal } from "./_generated/api";

// Admin allowlist — separate, password-based login for platform administrators.
// Password lives in the ADMIN_PANEL_PASSWORD deployment env var; never in code.
const ADMIN_EMAILS = (process.env.ADMIN_EMAILS ?? "")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter((e) => e.includes("@"));

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [
    // Customers: verified email + one-time code.
    emailOtp,
    // Admins: allowlisted email + shared admin password.
    ConvexCredentials({
      id: "admin-password",
      authorize: async (params, ctx) => {
        const email = typeof params.email === "string" ? params.email.trim().toLowerCase() : "";
        const password = typeof params.password === "string" ? params.password : "";
        if (!email || !password) return null;
        if (!ADMIN_EMAILS.includes(email)) return null;
        if (password !== (process.env.ADMIN_PANEL_PASSWORD ?? "")) return null;

        const { user } = await createAccount(ctx, {
          provider: "admin-password",
          account: { id: email },
          profile: {
            email,
            emailVerificationTime: Date.now(),
            role: "admin" as const,
          },
          // The admin password was just verified against the allowlist, so
          // linking to an existing OTP-created user with this email is safe.
          shouldLinkViaEmail: true,
        });
        // Elevate the user to admin role (action ctx has no db access).
        if (user.role !== "admin") {
          await ctx.runMutation(internal.authInternal.setAdminRole, { userId: user._id });
        }
        return { userId: user._id };
      },
    }),
  ],
});
