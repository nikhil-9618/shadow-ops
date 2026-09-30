import { PageHeader } from "@/components/shadowops/AppShell";
import { BrandMark } from "@/components/shadowops/brand";
import {
  EvidenceChip,
  PatternMerge,
  SectionLabel,
  StatPill,
  TONE,
  ToneDot,
} from "@/components/shadowops/primitives";
import { CommandGraph, MemoryTimeline } from "@/components/shadowops/visualizations";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/use-auth";
import { useLiveMemoryCount, formatMemoryCount } from "@/lib/memory-count";
import {
  activityFeed,
  getPattern,
  MEMORY_COUNTS,
  memories,
  patterns,
  recentDiscoveries,
  workflows,
} from "@/lib/shadowops-data";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router";

export default function Dashboard() {
  const { user } = useAuth();
  const memoryCount = useLiveMemoryCount();

  const topPattern = getPattern("P-01")!;

  const statCards = [
    { label: "Memories indexed", value: formatMemoryCount(memoryCount), tone: "memory" as const, sub: `+${memoryCount - MEMORY_COUNTS.total} this session` },
    { label: "Patterns observed", value: String(patterns.length).padStart(2, "0"), tone: "memory" as const, sub: "2 high confidence" },
    { label: "Workflows discovered", value: String(workflows.length).padStart(2, "0"), tone: "discovery" as const, sub: "1 new this week" },
    { label: "Incidents retained", value: String(MEMORY_COUNTS.incidents), tone: "critical" as const, sub: "all linked to runbooks" },
  ];

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 px-4 py-8 sm:px-6">
      <PageHeader
        eyebrow="Workflow through memory"
        title={`Good to see you${user?.name ? `, ${user.name}` : ""}`}
        description="ShadowOps remembers what happened before and uses those memories to understand what happens now."
        actions={
          <Link
            to="/intelligence"
            className="group inline-flex items-center gap-2 rounded-lg border border-discovery/40 bg-discovery/10 px-4 py-2 text-sm font-medium text-discovery transition-all hover:bg-discovery/20 so-glow-discovery"
          >
            Ask ShadowOps
            <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
        }
      />

      {/* stat cards */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06, duration: 0.4 }}
          >
            <div className={cn("rounded-xl border bg-card p-4", TONE[s.tone].border)}>
              <div className="flex items-center justify-between">
                <SectionLabel>{s.label}</SectionLabel>
                <ToneDot tone={s.tone} pulse={s.tone === "discovery"} />
              </div>
              <p className={cn("mt-2 font-mono text-2xl font-bold", TONE[s.tone].text)}>{s.value}</p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">{s.sub}</p>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
        {/* signature pattern merge */}
        <Card className="border-border bg-card/70 shadow-none">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Signature discovery · this week</CardTitle>
              <span className="font-mono text-[10px] text-discovery">MEMORY → PATTERN</span>
            </div>
          </CardHeader>
          <CardContent>
            <PatternMerge
              cases={topPattern.sourceCases}
              patternName={topPattern.name}
              frequency={topPattern.frequency}
              totalCases={topPattern.totalCases}
              confidence={topPattern.confidence}
              steps={topPattern.steps}
            />
          </CardContent>
        </Card>

        {/* identity graph */}
        <Card className="border-border bg-card/70 shadow-none">
          <CardHeader className="pb-0">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Intelligence graph</CardTitle>
              <BrandMark size={22} />
            </div>
          </CardHeader>
          <CardContent>
            <CommandGraph className="mx-auto max-w-[300px]" />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* discoveries */}
        <Card className="border-border bg-card/70 shadow-none">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <ToneDot tone="discovery" pulse />
              New discoveries
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2.5">
            {recentDiscoveries.map((d) => (
              <div
                key={d.id}
                className={cn(
                  "rounded-lg border bg-surface/70 p-3 transition-colors hover:border-foreground/20",
                  TONE[d.tone].border,
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium leading-snug">{d.title}</p>
                  <span className="shrink-0 font-mono text-[10px] text-muted-foreground">{d.date}</span>
                </div>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">{d.detail}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* memory timeline */}
        <Card className="border-border bg-card/70 shadow-none">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Memory accumulation</CardTitle>
          </CardHeader>
          <CardContent>
            <MemoryTimeline compact />
            <div className="mt-4 border-t border-border pt-3">
              <SectionLabel className="mb-2">Latest evidence</SectionLabel>
              <div className="flex flex-wrap gap-1.5">
                {memories.slice(0, 4).map((m) => (
                  <EvidenceChip key={m.id} id={m.id} />
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* activity */}
        <Card className="border-border bg-card/70 shadow-none">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Memory engine activity</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {activityFeed.map((a) => (
              <div key={a.time} className="flex items-start gap-3">
                <span className="mt-0.5 font-mono text-[10px] text-muted-foreground/70">{a.time}</span>
                <span className="mt-[7px]">
                  <ToneDot tone={a.tone} />
                </span>
                <p className="text-xs leading-5 text-secondary-foreground">{a.text}</p>
              </div>
            ))}
            <div className="border-t border-border pt-3">
              <div className="flex justify-between font-mono text-[10px] text-muted-foreground">
                <span>LAST SYNC</span>
                <span className="text-[#4ADE80]">2 minutes ago</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
