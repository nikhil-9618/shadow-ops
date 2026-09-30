import { PageHeader } from "@/components/shadowops/AppShell";
import {
  ConfidenceMeter,
  EvidenceChip,
  SectionLabel,
  StateBadge,
  StatPill,
  TONE,
} from "@/components/shadowops/primitives";
import { DiscoveryPath } from "@/components/shadowops/visualizations";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  getWorkflow,
  patterns,
  workflows,
  workflowCases,
} from "@/lib/shadowops-data";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { Boxes } from "lucide-react";
import { Link } from "react-router";
import { useMemo, useState } from "react";

export default function Workflows() {
  const [selectedId, setSelectedId] = useState(workflows[0].id);
  const workflow = getWorkflow(selectedId)!;
  const pattern = patterns.find((p) => p.id === workflow.patternId)!;

  const deps = useMemo(
    () => workflow.dependencies.map((d) => getWorkflow(d)).filter((w): w is NonNullable<typeof w> => Boolean(w)),
    [workflow],
  );
  const dependents = useMemo(
    () => workflows.filter((w) => w.dependencies.includes(workflow.id)),
    [workflow],
  );

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 px-4 py-8 sm:px-6">
      <PageHeader
        eyebrow="How does work actually happen?"
        title="Discovered Workflows"
        description="Every workflow here was derived from accumulated memory — never manually created."
        actions={
          <Link
            to="/organization-3d"
            className="group inline-flex items-center gap-2 rounded-lg border border-discovery/40 bg-discovery/10 px-4 py-2 text-sm font-medium text-discovery transition-all hover:bg-discovery/20"
          >
            <Boxes className="size-4" />
            View in 3D Twin
          </Link>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
        <div className="space-y-4">
          {/* workflow selector */}
          <div className="flex flex-wrap gap-2">
            {workflows.map((w) => (
              <button
                key={w.id}
                onClick={() => setSelectedId(w.id)}
                className={cn(
                  "rounded-lg border px-3 py-2 text-left transition-all",
                  selectedId === w.id
                    ? "border-discovery/50 bg-discovery/10 so-glow-discovery"
                    : "border-border bg-card hover:border-foreground/25",
                )}
              >
                <span
                  className={cn(
                    "font-mono text-[10px]",
                    selectedId === w.id ? "text-discovery" : "text-muted-foreground",
                  )}
                >
                  {w.id}
                </span>
                <p className="text-sm font-medium">{w.name}</p>
              </button>
            ))}
          </div>

          {/* selected workflow */}
          <Card className="border-border bg-card/70 shadow-none">
            <CardHeader className="pb-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <CardTitle className="flex items-center gap-2 text-base">
                    {workflow.name}
                    <StateBadge state={workflow.state} />
                  </CardTitle>
                  <p className="mt-0.5 font-mono text-[10px] text-muted-foreground">
                    From pattern {pattern.id} · {pattern.frequency}% frequency · confidence {pattern.confidence}
                  </p>
                </div>
                <ConfidenceMeter value={pattern.confidence} />
              </div>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* illuminated discovered path */}
              <div>
                <SectionLabel className="mb-3">Observed sequence</SectionLabel>
                <div className="flex flex-wrap items-center gap-1.5">
                  {workflow.steps.map((s, i) => (
                    <motion.div
                      key={s}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.12, duration: 0.4 }}
                      className="flex items-center gap-1.5"
                    >
                      <div
                        className={cn(
                          "relative rounded-lg border px-3 py-2",
                          i === 0
                            ? "border-[#6366F1]/40 bg-[#6366F1]/10"
                            : "border-discovery/40 bg-discovery/10",
                        )}
                      >
                        <span className="font-mono text-xs text-secondary-foreground">
                          <span className="mr-1.5 text-[10px] text-muted-foreground">{String(i + 1).padStart(2, "0")}</span>
                          {s}
                        </span>
                        {i === workflow.steps.length - 1 && (
                          <span className="absolute -right-1 -top-1 size-2 rounded-full bg-discovery so-pulse" />
                        )}
                      </div>
                      {i < workflow.steps.length - 1 && (
                        <svg width="22" height="10" aria-hidden>
                          <line x1="0" y1="5" x2="22" y2="5" stroke="#22D3EE" strokeWidth="1.4" className="so-flow" opacity="0.7" />
                        </svg>
                      )}
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* stats */}
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <StatPill label="Median cycle" value={`${workflow.avgCycleDays} days`} tone="memory" />
                <StatPill label="Success rate" value={`${workflow.successRate}%`} tone="success" />
                <StatPill label="Steps" value={String(workflow.steps.length)} tone="neutral" />
                <StatPill label="Discovered" value={workflow.discoveredAt} tone="discovery" />
              </div>

              {/* dependencies */}
              <div>
                <SectionLabel className="mb-2">What is connected to what</SectionLabel>
                <div className="grid gap-2 sm:grid-cols-2">
                  <div className="rounded-lg border border-border bg-surface/60 p-3">
                    <p className="mb-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                      Depends on
                    </p>
                    {deps.length ? (
                      deps.map((d) => (
                        <button
                          key={d.id}
                          onClick={() => setSelectedId(d.id)}
                          className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left hover:bg-accent"
                        >
                          <span className="size-1.5 rounded-full bg-discovery" />
                          <span className="font-mono text-[11px] text-discovery">{d.id}</span>
                          <span className="text-xs text-secondary-foreground">{d.name}</span>
                        </button>
                      ))
                    ) : (
                      <p className="text-xs text-muted-foreground">Nothing upstream — entry workflow</p>
                    )}
                  </div>
                  <div className="rounded-lg border border-border bg-surface/60 p-3">
                    <p className="mb-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                      Feeds into
                    </p>
                    {dependents.length ? (
                      dependents.map((d) => (
                        <button
                          key={d.id}
                          onClick={() => setSelectedId(d.id)}
                          className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left hover:bg-accent"
                        >
                          <span className="size-1.5 rounded-full bg-[#6366F1]" />
                          <span className="font-mono text-[11px] text-[#8B93F8]">{d.id}</span>
                          <span className="text-xs text-secondary-foreground">{d.name}</span>
                        </button>
                      ))
                    ) : (
                      <p className="text-xs text-muted-foreground">Nothing downstream yet</p>
                    )}
                  </div>
                </div>
              </div>

              {/* source cases */}
              <div>
                <SectionLabel className="mb-2">Traced back to memory</SectionLabel>
                <div className="flex flex-wrap gap-1.5">
                  {workflow.memoryIds.map((id) => (
                    <EvidenceChip key={id} id={id} />
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* side: discovery path + cases */}
        <div className="space-y-4">
          <Card className="border-border bg-card/70 shadow-none">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">How this was discovered</CardTitle>
            </CardHeader>
            <CardContent>
              <DiscoveryPath />
            </CardContent>
          </Card>

          <Card className="border-border bg-card/70 shadow-none">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Historical case matches</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {workflowCases.map((c) => (
                <div
                  key={c.case}
                  className="flex items-center justify-between rounded-lg border border-border bg-surface/60 px-3 py-2"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        "size-1.5 rounded-full",
                        c.status === "matched" ? TONE.success.dot : TONE.warning.dot,
                      )}
                    />
                    <span className="font-mono text-xs text-secondary-foreground">{c.case}</span>
                  </div>
                  <span className="font-mono text-[10px] text-muted-foreground">
                    {c.date} · {c.status}
                  </span>
                </div>
              ))}
              <p className="pt-1 text-[11px] leading-5 text-muted-foreground">
                Variants are cases that followed the sequence with one deviation — kept separate
                so the pattern stays honest.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
