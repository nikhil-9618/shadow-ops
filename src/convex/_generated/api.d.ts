/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as ai from "../ai.js";
import type * as audit from "../audit.js";
import type * as auth from "../auth.js";
import type * as authInternal from "../authInternal.js";
import type * as auth_emailOtp from "../auth/emailOtp.js";
import type * as hindsight from "../hindsight.js";
import type * as hindsightSettings from "../hindsightSettings.js";
import type * as http from "../http.js";
import type * as memories from "../memories.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  ai: typeof ai;
  audit: typeof audit;
  auth: typeof auth;
  authInternal: typeof authInternal;
  "auth/emailOtp": typeof auth_emailOtp;
  hindsight: typeof hindsight;
  hindsightSettings: typeof hindsightSettings;
  http: typeof http;
  memories: typeof memories;
  users: typeof users;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
