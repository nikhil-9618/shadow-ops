"use node";

// Hindsight memory engine — the real connection behind ShadowOps.
//
// Until this file existed, every "Hindsight" surface in the app was decorative:
// the memory store was a static fixture and the status UI was hardcoded. These
// actions are the only place that talks to a Hindsight server.
//
// Deployment note: Convex actions run in Convex's cloud runtime, NOT on the
// machine that started the dev server. A self-hosted Hindsight on
// http://localhost:8888 is therefore unreachable from here — the default target
// is Hindsight Cloud, and a self-hosted server only works if it is exposed at a
// publicly routable address and HINDSIGHT_BASE_URL is pointed at it.

import {
  HindsightClient,
  HindsightError,
  type MemoryItemInput,
} from "@vectorize-io/hindsight-client";
import { v } from "convex/values";
import { action } from "./_generated/server";
import { internal } from "./_generated/api";

const DEFAULT_BASE_URL = "https://api.hindsight.vectorize.io";
const DEFAULT_BANK_ID = "shadowops-org";

/** Mission written into the bank — this is what shapes every `reflect()` answer. */
const BANK_MISSION =
  "ShadowOps is an organizational intelligence command center. I answer questions " +
  "about how this company actually operates: vendor approvals, security reviews, " +
  "finance escalations, access lifecycle, and incident response. I answer only " +
  "from recorded organizational history, I cite the specific cases behind every " +
  "claim, and I say so plainly when the evidence is too thin to conclude.";

type Envelope<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; code: string };

type Config = { baseUrl: string; apiKey: string | undefined; bankId: string };

let cachedClient: { key: string; client: HindsightClient } | null = null;

/**
 * Resolution order: admin-saved settings (DB) → deployment env var → defaults.
 * Admins rotate the key from the app; until they do, the env var is used.
 */
async function config(ctx: { runQuery: (ref: any, args: any) => Promise<any> }): Promise<Config> {
  let admin: { apiKey?: string; baseUrl?: string; bankId?: string } | null = null;
  try {
    admin = await ctx.runQuery(internal.hindsightSettings.readRaw, {});
  } catch {
    admin = null; // table not migrated yet — env fallback still applies
  }
  return {
    baseUrl: (admin?.baseUrl || process.env.HINDSIGHT_BASE_URL || DEFAULT_BASE_URL).replace(/\/+$/, ""),
    apiKey: admin?.apiKey || process.env.HINDSIGHT_API_KEY || undefined,
    bankId: admin?.bankId || process.env.HINDSIGHT_BANK_ID || DEFAULT_BANK_ID,
  };
}

/**
 * One client per distinct credential set. Convex keeps the action isolate warm
 * between calls, so rebuilding this on every request would pay TLS setup each time.
 */
function client(cfg: Config): HindsightClient {
  const { baseUrl, apiKey } = cfg;
  const key = `${baseUrl}|${apiKey ?? ""}`;
  if (!cachedClient || cachedClient.key !== key) {
    cachedClient = {
      key,
      client: new HindsightClient({ baseUrl, apiKey, maxAttempts: 2 }),
    };
  }
  return cachedClient.client;
}

/** Turn any thrown value into a code the UI can branch on. Never rethrows. */
function describeError(e: unknown): { error: string; code: string } {
  if (e instanceof HindsightError) {
    const status = e.statusCode ?? 0;
    if (status === 401 || status === 403) {
      return {
        code: "unauthorized",
        error:
          "Hindsight rejected the credentials. Check HINDSIGHT_API_KEY in the Keys tab.",
      };
    }
    if (status === 404) {
      return {
        code: "not_found",
        error: `No Hindsight server responded at that address. Check HINDSIGHT_BASE_URL (got ${status}).`,
      };
    }
    if (status === 429 || status === 503) {
      return { code: "at_capacity", error: "Hindsight is at capacity. Try again shortly." };
    }
    return { code: `http_${status || "error"}`, error: e.message };
  }
  // Node fetch surfaces DNS/TLS/socket problems as TypeError.
  if (e instanceof TypeError) {
    return {
      code: "unreachable",
      error:
        "Could not reach Hindsight. A server on localhost is not reachable from " +
        "Convex's cloud runtime — use Hindsight Cloud or a publicly routable host.",
    };
  }
  return {
    code: "unknown",
    error: e instanceof Error ? e.message : "Unexpected Hindsight error.",
  };
}

/** Run an operation, collapsing every failure into an envelope. */
async function guard<T>(fn: () => Promise<T>): Promise<Envelope<T>> {
  try {
    return { ok: true, data: await fn() };
  } catch (e) {
    const { error, code } = describeError(e);
    return { ok: false, error, code };
  }
}

/* -------------------------------------------------------------------------- */
/* status                                                                      */
/* -------------------------------------------------------------------------- */

export interface EngineStatus {
  /** A key is present in the environment. */
  configured: boolean;
  /** We actually reached a Hindsight server. */
  connected: boolean;
  baseUrl: string;
  bankId: string;
  apiVersion: string | null;
  features: Record<string, boolean> | null;
  error: string | null;
  code: string | null;
}

/**
 * Replaces the hardcoded "Hindsight Connected" badge. Deliberately cheap:
 * one authenticated GET /version.
 */
export const getEngineStatus = action({
  args: {},
  handler: async (ctx): Promise<EngineStatus> => {
    const { baseUrl, apiKey, bankId } = await config(ctx);

    if (!apiKey && !baseUrl.startsWith("http://localhost")) {
      return {
        configured: false,
        connected: false,
        baseUrl,
        bankId,
        apiVersion: null,
        features: null,
        error: "No Hindsight API key yet. An admin can add it under System → Connection settings.",
        code: "unconfigured",
      };
    }

    const res = await guard(() => client({ baseUrl, apiKey, bankId }).getVersion());
    if (!res.ok) {
      return {
        configured: true,
        connected: false,
        baseUrl,
        bankId,
        apiVersion: null,
        features: null,
        error: res.error,
        code: res.code,
      };
    }

    return {
      configured: true,
      connected: true,
      baseUrl,
      bankId,
      apiVersion: res.data.api_version,
      features: res.data.features as unknown as Record<string, boolean>,
      error: null,
      code: null,
    };
  },
});

/* -------------------------------------------------------------------------- */
/* bank lifecycle                                                              */
/* -------------------------------------------------------------------------- */

/**
 * Create-or-update the ShadowOps bank. Safe to call repeatedly — this is the
 * idempotent entry point a "connect" button should hit.
 */
export const ensureBank = action({
  args: {},
  handler: async (ctx) => {
    const cfg = await config(ctx);
    const { bankId } = cfg;
    return guard(async () => {
      await client(cfg).createBank(bankId, {
        reflectMission: BANK_MISSION,
        // Observations are the consolidated "this is how the org really works"
        // layer that ShadowOps' pattern engine stands in for.
        enableObservations: true,
        enableTextSearch: true,
        enableTemporalRetrieval: true,
        enableGraphRetrieval: true,
        enableReranking: true,
      });
      return { bankId, created: true };
    });
  },
});

/* -------------------------------------------------------------------------- */
/* retain / recall / reflect                                                   */
/* -------------------------------------------------------------------------- */

export const retainMemories = action({
  args: {
    records: v.array(
      v.object({
        memoryId: v.string(),
        title: v.string(),
        summary: v.string(),
        kind: v.string(),
        date: v.optional(v.string()),
        actors: v.optional(v.array(v.string())),
        sequence: v.optional(v.array(v.string())),
        outcome: v.optional(v.string()),
      }),
    ),
    source: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const cfg = await config(ctx);
    const { bankId } = cfg;
    if (args.records.length === 0) {
      return { ok: true as const, data: { bankId, retained: 0 } };
    }

    const items: MemoryItemInput[] = args.records.map((r) => {
      const lines = [
        `Memory ${r.memoryId} (${r.kind}) — ${r.title}`,
        r.summary,
        r.actors?.length ? `Actors: ${r.actors.join(", ")}.` : undefined,
        r.outcome ? `Outcome: ${r.outcome}.` : undefined,
        r.sequence?.length ? `Observed sequence: ${r.sequence.join(" → ")}.` : undefined,
      ].filter(Boolean) as string[];

      return {
        content: lines.join("\n"),
        // The event date drives Hindsight's temporal retrieval arm, so a query
        // like "what happened in March" can actually reach the right records.
        timestamp: r.date ?? undefined,
        context: args.source ?? "shadowops-organizational-memory",
        tags: [r.kind, ...(r.actors ?? [])].slice(0, 6),
        metadata: { memoryId: r.memoryId, kind: r.kind, source: args.source ?? "shadowops" },
      };
    });

    return guard(async () => {
      const res = await client(cfg).retainBatch(bankId, items, { async: false });
      return {
        bankId,
        retained: res.items_count,
        success: res.success,
      };
    });
  },
});

export const recallMemories = action({
  args: {
    query: v.string(),
    budget: v.optional(v.union(v.literal("low"), v.literal("mid"), v.literal("high"))),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const cfg = await config(ctx);
    const { bankId } = cfg;
    return guard(async () => {
      const res = await client(cfg).recall(bankId, args.query, {
        budget: args.budget ?? "mid",
        maxTokens: 3000,
        includeSourceFacts: true,
        preferObservations: true,
      });
      return {
        bankId,
        // Only fields verified to exist on RecallResult in the installed
        // client are surfaced; anything else is left for a later bump.
        results: res.results.slice(0, args.limit ?? 12).map((r) => ({
          id: r.id,
          text: r.text,
          type: r.type ?? "world",
          entities: r.entities ?? [],
        })),
      };
    });
  },
});

export const reflectMemories = action({
  args: {
    query: v.string(),
    budget: v.optional(v.union(v.literal("low"), v.literal("mid"), v.literal("high"))),
  },
  handler: async (ctx, args) => {
    const cfg = await config(ctx);
    const { bankId } = cfg;
    return guard(async () => {
      const res = await client(cfg).reflect(bankId, args.query, {
        budget: args.budget ?? "mid",
        includeFacts: true,
      });
      return { bankId, text: res.text, basedOn: res.based_on ?? null };
    });
  },
});
