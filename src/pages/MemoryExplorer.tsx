import { PageHeader } from "@/components/shadowops/AppShell";
import {
  ConfidenceMeter,
  EvidenceChip,
  KindBadge,
  SectionLabel,
  TONE,
  ToneDot,
} from "@/components/shadowops/primitives";
import { MemoryTimeline } from "@/components/shadowops/visualizations";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  getMemory,
  MEMORY_COUNTS,
  MEMORY_KIND_META,
  memories,
  relatedMemories,
  type MemoryKind,
  type OrgMemory,
} from "@/lib/shadowops-data";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { Clock, Users } from "lucide-react";
import { useMemo, useState } from "react";
import { useLocation } from "react-router";

const KINDS: (MemoryKind | "all")[] = [
  "all",
  "episodic",
  "decision",
  "workflow",
  "incident",
  "outcome",
  "procedural",
];

const OUTCOME_TONE = {
  approved: "success",
  completed: "success",
  resolved: "success",
  delayed: "warning",
  escalated: "warning",
  blocked: "critical",
} as const;

export default function MemoryExplorer() {
  const [kind, setKind] = useState<MemoryKind | "all">("all");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<OrgMemory | null>(null);
  const location = useLocation();

  const filtered = useMemo(() => {
    return memories
      .filter((m) => (kind === "all" ? true : m.kind === kind))
      .filter((m) =>
        query.trim()
          ? (m.title + m.summary + m.tags.join(" ")).toLowerCase().includes(query.toLowerCase())
          : true,
      );
  }, [kind, query]);

  // deep-link support: /memory with state.focusMemory
  const focusId = (location.state as { focusMemory?: string } | null)?.focusMemory;
  const focusMemory = focusId ? getMemory(focusId) : undefined;

  const shown = focusMemory ?? selected;

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 px-4 py-8 sm:px-6">
      <PageHeader
        eyebrow="What happened?"
        title="Organizational Memory"
        description="The retained history of the organization — events, decisions, incidents, and outcomes, connected."
      />

      {/* overview */}
      <div className="grid gap-4 lg:grid-cols-[0.9fr_1.4fr]">
        <Card className="border-border bg-card/70 shadow-none">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center justify-between text-base">
              Memory index
              <span className="font-mono text-xl font-bold text-[#8B93F8]">
                {MEMORY_COUNTS.total.toLocaleString()}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {(
              [
                { key: "episodic", kind: "episodic", count: MEMORY_COUNTS.episodic },
                { key: "decisions", kind: "decision", count: MEMORY_COUNTS.decisions },
                { key: "workflows", kind: "workflow", count: MEMORY_COUNTS.workflows },
                { key: "incidents", kind: "incident", count: MEMORY_COUNTS.incidents },
                { key: "outcomes", kind: "outcome", count: MEMORY_COUNTS.outcomes },
                { key: "procedural", kind: "procedural", count: MEMORY_COUNTS.procedural },
              ] as const
            ).map(({ key, kind, count }) => {
              const tone = TONE[
                kind === "workflow"
                  ? "discovery"
                  : kind === "incident"
                    ? "critical"
                    : kind === "outcome"
                      ? "success"
                      : kind === "procedural"
                        ? "neutral"
                        : "memory"
              ];
              const pct = (count / MEMORY_COUNTS.total) * 100;
              return (
                <button
                  key={key}
                  onClick={() => setKind(kind)}
                  className={cn(
                    "group flex w-full items-center gap-3 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-accent/50",
                    kind === kind && "bg-accent",
                  )}
                >
                  <ToneDot tone={
                    kind === "workflow"
                      ? "discovery"
                      : kind === "incident"
                        ? "critical"
                        : kind === "outcome"
                          ? "success"
                          : kind === "procedural"
                            ? "neutral"
                            : "memory"
                  } />
                  <span className="w-24 font-mono text-[11px] uppercase tracking-wider text-secondary-foreground">
                    {MEMORY_KIND_META[kind].label}
                  </span>
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/[0.05]">
                    <div className={cn("h-full rounded-full", tone.dot)} style={{ width: `${Math.max(pct * 4, 2)}%` }} />
                  </div>
                  <span className="w-12 text-right font-mono text-[11px] text-muted-foreground">
                    {count.toLocaleString()}
                  </span>
                </button>
              );
            })}
          </CardContent>
        </Card>

        <Card className="border-border bg-card/70 shadow-none">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Historical timeline</CardTitle>
          </CardHeader>
          <CardContent>
            <MemoryTimeline />
          </CardContent>
        </Card>
      </div>

      {/* explorer */}
      <div className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search memory..."
              className="h-9 w-56 bg-card"
            />
            <div className="flex flex-wrap gap-1.5">
              {KINDS.map((k) => (
                <button
                  key={k}
                  onClick={() => setKind(k)}
                  className={cn(
                    "rounded-full border px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider transition-colors",
                    kind === k
                      ? "border-[#5865F2]/60 bg-[#5865F2]/20 text-[#8B93F8]"
                      : "border-border text-muted-foreground hover:border-foreground/25 hover:text-foreground",
                  )}
                >
                  {k === "all" ? "All" : MEMORY_KIND_META[k].label}
                </button>
              ))}
            </div>
            <span className="ml-auto font-mono text-[10px] text-muted-foreground">
              {filtered.length} shown of {memories.length} sampled
            </span>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {filtered.map((m, i) => (
              <motion.button
                key={m.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i * 0.04, 0.3), duration: 0.35 }}
                onClick={() => setSelected(m)}
                className={cn(
                  "rounded-xl border bg-card p-4 text-left transition-all hover:-translate-y-0.5 hover:border-foreground/25",
                  TONE[
                    m.kind === "incident"
                      ? "critical"
                      : m.kind === "workflow"
                        ? "discovery"
                        : m.kind === "outcome"
                          ? "success"
                          : m.kind === "procedural"
                            ? "neutral"
                            : "memory"
                  ].border,
                  shown?.id === m.id && "border-[#22D3EE]/50 so-glow-discovery",
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-[11px] text-[#8B93F8]">{m.id}</span>
                  <KindBadge kind={m.kind} />
                </div>
                <p className="mt-2 text-sm font-semibold leading-snug">{m.title}</p>
                <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">{m.summary}</p>
                <div className="mt-3 flex items-center gap-3 font-mono text-[10px] text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Clock className="size-3" />
                    {m.date}
                  </span>
                  <span className="flex items-center gap-1">
                    <Users className="size-3" />
                    {m.actors.join(", ")}
                  </span>
                </div>
              </motion.button>
            ))}
            {filtered.length === 0 && (
              <div className="col-span-full rounded-xl border border-dashed border-border py-12 text-center">
                <p className="text-sm text-muted-foreground">No memories match this filter yet.</p>
              </div>
            )}
          </div>
        </div>

        {/* detail panel */}
        <div className="lg:sticky lg:top-20 lg:self-start">
          {shown ? (
            <MemoryDetail memory={shown} onClose={() => { setSelected(null); }} />
          ) : (
            <Card className="border-dashed border-border bg-card/40 shadow-none">
              <CardContent className="flex flex-col items-center py-14 text-center">
                <span className="flex size-10 items-center justify-center rounded-xl border border-[#6366F1]/30 bg-[#6366F1]/10">
                  <ToneDot tone="memory" pulse />
                </span>
                <p className="mt-3 text-sm font-medium">Select a memory</p>
                <p className="mt-1 max-w-[240px] text-xs text-muted-foreground">
                  Open any memory to see what happened, who was involved, and what it connected to.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function MemoryDetail({ memory, onClose }: { memory: OrgMemory; onClose: () => void }) {
  const related = relatedMemories(memory);
  return (
    <motion.div
      key={memory.id}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="overflow-hidden rounded-xl border border-[#22D3EE]/30 bg-card so-glow-discovery"
    >
      <div className="flex items-center justify-between border-b border-border bg-surface/70 px-4 py-3">
        <span className="font-mono text-xs text-discovery">{memory.id}</span>
        <button onClick={onClose} className="font-mono text-[10px] text-muted-foreground hover:text-foreground">
          CLEAR ✕
        </button>
      </div>
      <div className="space-y-4 p-4">
        <div>
          <KindBadge kind={memory.kind} />
          <p className="mt-2 text-sm font-semibold leading-snug">{memory.title}</p>
          <p className="mt-1.5 text-xs leading-5 text-muted-foreground">{memory.summary}</p>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <StatBox label="Date" value={memory.date} />
          <StatBox label="Outcome" value={memory.outcome} tone={OUTCOME_TONE[memory.outcome]} />
          <StatBox label="Cycle" value={`${memory.cycleDays}d`} />
          <StatBox label="Actors" value={memory.actors.join(", ")} />
        </div>

        <div>
          <SectionLabel className="mb-1.5">Memory confidence</SectionLabel>
          <ConfidenceMeter value={memory.confidence} tone="memory" />
        </div>

        {memory.sequence && (
          <div>
            <SectionLabel className="mb-1.5">Observed sequence</SectionLabel>
            <div className="flex flex-wrap items-center gap-1 font-mono text-[10px]">
              {memory.sequence.map((s, i) => (
                <span key={s} className="flex items-center gap-1">
                  <span className="rounded border border-[#6366F1]/30 bg-[#6366F1]/10 px-1.5 py-0.5 text-[#8B93F8]">
                    {s}
                  </span>
                  {i < memory.sequence!.length - 1 && <span className="text-[#3B4160]">→</span>}
                </span>
              ))}
            </div>
          </div>
        )}

        <div>
          <SectionLabel className="mb-1.5">Connected memories</SectionLabel>
          <div className="flex flex-wrap gap-1.5">
            {related.map((r) => (
              <EvidenceChip key={r.id} id={r.id} />
            ))}
            {related.length === 0 && (
              <span className="text-xs text-muted-foreground">No linked memories</span>
            )}
          </div>
        </div>

        <div>
          <SectionLabel className="mb-1.5">Supporting evidence</SectionLabel>
          <div className="rounded-lg border border-border bg-surface/60 p-3 font-mono text-[10px] leading-5 text-muted-foreground">
            <p>· Indexed by nightly consolidation</p>
            <p>· Cross-referenced with {related.length} linked memories</p>
            <p>· Outcome verified against system of record</p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function StatBox({ label, value, tone }: { label: string; value: string; tone?: "success" | "warning" | "critical" }) {
  return (
    <div className={cn("rounded-lg border bg-surface/60 px-3 py-2", tone && TONE[tone].border)}>
      <p className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={cn("truncate text-xs font-semibold capitalize", tone && TONE[tone].text)}>{value}</p>
    </div>
  );
}
