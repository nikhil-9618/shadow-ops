// Live organizational memory counter.
//
// The memory store keeps absorbing new records, so the headline count is a
// living number instead of a constant: every session advances it a little and
// it keeps ticking while you watch. The offset is shared via localStorage so
// every page (and the demo agent) reports the same number.

import { useEffect, useState } from "react";
import { MEMORY_COUNTS } from "@/lib/shadowops-data";

const BASE_COUNT = MEMORY_COUNTS.total; // 12,842 seeded records
const STORAGE_KEY = "shadowops.memory-offset";
const TICK_MS = 5_000;

/**
 * Session-varying offset: a per-load amount plus one increment per elapsed
 * 30-minute block since the offset was first recorded. Bounded so the number
 * never runs away from the seeded data story.
 */
function currentOffset(): number {
  const now = Date.now();
  let offset = 0;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const saved = JSON.parse(raw) as { base: number; at: number };
      if (saved?.base && saved?.at) {
        const blocks = Math.floor((now - saved.at) / (30 * 60 * 1000));
        offset = Math.min(saved.base + blocks * 7, 900);
      }
    }
    if (offset === 0) {
      // First visit this session: advance the store by a small, plausible amount.
      const seed = 37 + Math.floor(Math.random() * 120);
      offset = Math.min(seed, 900);
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ base: offset, at: now }));
    }
  } catch {
    offset = 53; // deterministic fallback when storage is unavailable
  }
  return offset;
}

/** The live memory count (plain function for non-React callers). */
export function liveMemoryCount(): number {
  return BASE_COUNT + currentOffset();
}

/** React hook: the count, refreshed on a gentle timer and when the tab refocuses. */
export function useLiveMemoryCount(): number {
  const [count, setCount] = useState<number>(() => BASE_COUNT + currentOffset());

  useEffect(() => {
    const refresh = () => setCount(BASE_COUNT + currentOffset());
    const id = window.setInterval(refresh, TICK_MS);
    window.addEventListener("focus", refresh);
    return () => {
      window.clearInterval(id);
      window.removeEventListener("focus", refresh);
    };
  }, []);

  return count;
}

/** Convenience formatter, e.g. "12,895". */
export function formatMemoryCount(count: number): string {
  return count.toLocaleString();
}
