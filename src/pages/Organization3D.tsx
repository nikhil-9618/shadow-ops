import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  incidentById,
  memoriesForEntity,
  nodeById,
  observedWorkflow,
  officialWorkflow,
  org3d,
  runWhatIf,
  type TwinMemory,
  type WhatIfResult,
} from "@/lib/shadowops-3d";
import { getMemory, type OrgMemory } from "@/lib/shadowops-data";
import { OrgScene, type WorkflowViewMode } from "@/components/shadowops3d/OrgScene";
import { SectionLabel } from "@/components/shadowops/primitives";
import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router";
import {
  Boxes,
  Building2,
  Camera,
  CircleAlert,
  Eye,
  Loader2,
  Moon,
  Network,
  Pause,
  Play,
  RotateCcw,
  SunMedium,
} from "lucide-react";

const ORG_SCENE_READY = true;
void ORG_SCENE_READY;

const DEPT_ICON: Record<string, string> = {
  department: "DEPT",
  vendor: "VENDOR",
};

export default function Organization3D() {
  const location = useLocation();
  const initialMode = (location.state as { workflowMode?: WorkflowViewMode } | null)?.workflowMode;
  const [view, setView] = useState<"world" | "graph">("world");
  const [workflowMode, setWorkflowMode] = useState<WorkflowViewMode>(initialMode ?? "observed");
  const [selectedId, setSelectedId] = useState<string | null>(
    (location.state as { focusMemory?: string } | null)?.focusMemory ?? null,
  );
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const [paused, setPaused] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [mode, setMode] = useState<"day" | "night">("day");
  const [focusTarget, setFocusTarget] = useState<{ id: string; nonce: number } | null>(null);
  const [resetNonce, setResetNonce] = useState(0);
  const [whatIfOpen, setWhatIfOpen] = useState(false);
  const [whatIfResult, setWhatIfResult] = useState<WhatIfResult | null>(null);
  const [whatIfInput, setWhatIfInput] = useState("");
  const [booting, setBooting] = useState(true);

  useEffect(() => {
    const t = window.setTimeout(() => setBooting(false), 900);
    return () => window.clearTimeout(t);
  }, []);

  const selectedNode = selectedId ? nodeById(selectedId) : undefined;
  const selectedMemory: OrgMemory | undefined = selectedId?.startsWith("M-") ? getMemory(selectedId) : undefined;
  const selectedIncident = selectedId ? incidentById(selectedId) : undefined;

  const entityMemories: TwinMemory[] = selectedNode ? memoriesForEntity(selectedNode.id) : [];

  const focusEntity = (id: string) => {
    setFocusTarget({ id, nonce: Date.now() });
  };

  const askWhatIf = (q: string) => {
    setWhatIfResult(runWhatIf(q));
  };

  const legend = useMemo(
    () => [
      { label: "Department", color: "#5865F2" },
      { label: "Vendor", color: "#22D3EE" },
      { label: "Memory orb", color: "#6366F1" },
      { label: "Observed path", color: "#22D3EE" },
      { label: "Official path", color: "#4A5568" },
      { label: "Incident", color: "#EF4444" },
    ],
    [],
  );

  return (
    <div className="mx-auto flex h-[calc(100vh-3.5rem)] w-full max-w-[1600px] flex-col px-3 py-4 sm:px-5">
      {/* toolbar */}
      <div className="flex flex-wrap items-center gap-2 pb-3">
        <div className="flex overflow-hidden rounded-lg border border-border">
          {(
            [
              { id: "world", label: "3D World", icon: Boxes },
              { id: "graph", label: "Graph View", icon: Network },
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              onClick={() => setView(t.id)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors",
                view === t.id ? "bg-accent text-foreground" : "text-muted-foreground hover:text-foreground",
              )}
            >
              <t.icon className="size-3.5" />
              {t.label}
            </button>
          ))}
        </div>

        <div className="flex overflow-hidden rounded-lg border border-border">
          {(
            [
              { id: "observed", label: "Observed" },
              { id: "official", label: "Official" },
              { id: "compare", label: "Compare" },
            ] as const
          ).map((m) => (
            <button
              key={m.id}
              onClick={() => setWorkflowMode(m.id)}
              className={cn(
                "px-3 py-1.5 text-xs font-medium transition-colors",
                workflowMode === m.id
                  ? m.id === "observed"
                    ? "bg-discovery/15 text-discovery"
                    : "bg-accent text-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {m.label}
            </button>
          ))}
        </div>

        <div className="ml-auto flex items-center gap-1.5">
          <Button variant="outline" size="sm" onClick={() => setPaused((p) => !p)}>
            {paused ? <Play className="size-3.5" /> : <Pause className="size-3.5" />}
            {paused ? "Resume" : "Pause"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setReduceMotion((r) => !r)}
            className={cn(reduceMotion && "border-discovery/40 text-discovery")}
          >
            <Eye className="size-3.5" />
            Reduce motion
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setMode((m) => (m === "day" ? "night" : "day"))}
          >
            {mode === "day" ? <Moon className="size-3.5" /> : <SunMedium className="size-3.5" />}
            {mode === "day" ? "Night" : "Day"}
          </Button>
          <Button variant="outline" size="sm" onClick={() => setResetNonce((n) => n + 1)}>
            <RotateCcw className="size-3.5" />
            Reset view
          </Button>
        </div>
      </div>

      {/* main split */}
      <div className="grid min-h-0 flex-1 gap-3 lg:grid-cols-[1fr_340px]">
        {/* canvas */}
        <div className="relative min-h-[420px] overflow-hidden rounded-xl border border-border bg-background">
          <div className="h-full w-full">
            <OrgScene
              selectedId={selectedId}
              highlightId={highlightId}
              workflowMode={workflowMode}
              view={view}
              paused={paused || reduceMotion}
              mode={mode}
              focusTarget={focusTarget}
              resetNonce={resetNonce}
              onSelect={(id) => {
                setSelectedId(id);
                if (id && nodeById(id)) setHighlightId(null);
              }}
            />
          </div>

          {booting && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/80 backdrop-blur-sm">
              <div className="text-center">
                <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-discovery">
                  Generating twin from organizational memory
                </p>
                <p className="mt-2 font-mono text-[10px] text-muted-foreground">
                  {org3d.nodes.length} entities · {org3d.memories.length} sampled memories ·{" "}
                  {org3d.relationships.length} relationships
                </p>
              </div>
            </div>
          )}

          {/* workflow HUD */}
          {view === "world" && workflowMode !== "official" && (
            <div className="absolute left-3 top-3 rounded-lg border border-[#22D3EE]/30 bg-[#0A121C]/90 px-3 py-2 backdrop-blur-sm">
              <p className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">
                {workflowMode === "compare" ? "Observed (highlighted)" : "Observed workflow"}
              </p>
              <p className="mt-0.5 font-mono text-xs text-discovery">
                {observedWorkflow.stepLabels.join(" → ")}
              </p>
              <p className="mt-1 font-mono text-[9px] text-muted-foreground">
                {observedWorkflow.observedCount} occurrences · confidence {observedWorkflow.confidence}% · derived from memory
              </p>
            </div>
          )}

          {/* legend */}
          <div className="absolute bottom-3 left-3 flex flex-wrap gap-x-3 gap-y-1 rounded-lg border border-border bg-[#0A121C]/85 px-3 py-2 backdrop-blur-sm">
            {legend.map((l) => (
              <span key={l.label} className="flex items-center gap-1.5 font-mono text-[9px] text-muted-foreground">
                <span className="size-1.5 rounded-full" style={{ background: l.color }} />
                {l.label}
              </span>
            ))}
          </div>

          {/* controls hint */}
          <div className="absolute right-3 top-3 rounded-lg border border-border bg-[#0A121C]/85 px-3 py-2 font-mono text-[9px] leading-4 text-muted-foreground backdrop-blur-sm">
            <p className="text-[#8A94A8]">DRAG rotate · SCROLL zoom · RIGHT-DRAG pan</p>
            <p>CLICK entity · DOUBLE-CLICK building to focus</p>
          </div>
        </div>

        {/* details rail */}
        <aside className="min-h-0 space-y-3 overflow-y-auto pr-0.5">
          {/* what-if trigger */}
          <div className="rounded-xl border border-border bg-card p-3">
            <div className="flex items-center justify-between">
              <SectionLabel>What-if analysis</SectionLabel>
              <button
                onClick={() => setWhatIfOpen((o) => !o)}
                className="font-mono text-[10px] text-discovery hover:underline"
              >
                {whatIfOpen ? "HIDE" : "OPEN"}
              </button>
            </div>
            {whatIfOpen && (
              <div className="mt-2 space-y-2">
                <div className="space-y-1.5">
                  {[
                    "What happened when Security approval was skipped?",
                    "What happened when reviews ran in parallel?",
                  ].map((q) => (
                    <button
                      key={q}
                      onClick={() => {
                        setWhatIfInput(q);
                        askWhatIf(q);
                      }}
                      className={cn(
                        "w-full rounded-lg border px-2.5 py-1.5 text-left text-[11px] transition-colors",
                        whatIfInput === q
                          ? "border-discovery/40 bg-discovery/10 text-discovery"
                          : "border-border text-muted-foreground hover:border-foreground/25 hover:text-foreground",
                      )}
                    >
                      {q}
                    </button>
                  ))}
                </div>
                {whatIfResult && (
                  <div className="rounded-lg border border-[#F59E0B]/25 bg-[#F59E0B]/5 p-2.5">
                    <p className="text-[11px] font-semibold text-[#FBBF24]">{whatIfResult.queryLabel}</p>
                    <p className="mt-1 font-mono text-[10px] text-muted-foreground">
                      {whatIfResult.casesFound} historical cases found · confidence {whatIfResult.confidence}%
                    </p>
                    <div className="mt-2 space-y-1">
                      {whatIfResult.outcomes.map((o) => (
                        <div key={o.label} className="flex items-center justify-between font-mono text-[10px]">
                          <span className={cn(o.tone === "critical" ? "text-[#F87171]" : "text-[#FBBF24]")}>
                            {o.label}
                          </span>
                          <span className="text-muted-foreground">×{o.count}</span>
                        </div>
                      ))}
                    </div>
                    <p className="mt-2 text-[10px] leading-4 text-muted-foreground">{whatIfResult.narrative}</p>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {whatIfResult.caseIds.map((id) => (
                        <button
                          key={id}
                          onClick={() => setSelectedId(id)}
                          className="rounded border border-[#6366F1]/30 bg-[#6366F1]/10 px-1.5 py-0.5 font-mono text-[9px] text-[#8B93F8] hover:bg-[#6366F1]/20"
                        >
                          {id}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* details */}
          {selectedMemory ? (
            <MemoryDetailCard memory={selectedMemory} onFocus={focusEntity} />
          ) : selectedIncident ? (
            <IncidentDetailCard incidentId={selectedIncident.id} onFocus={focusEntity} onSelect={setSelectedId} />
          ) : selectedNode ? (
            <EntityDetailCard
              id={selectedNode.id}
              onFocus={focusEntity}
              onSelect={setSelectedId}
              memories={entityMemories}
            />
          ) : (
            <div className="rounded-xl border border-dashed border-border bg-card/40 p-6 text-center">
              <Building2 className="mx-auto size-6 text-muted-foreground/60" />
              <p className="mt-2 text-sm font-medium">Nothing selected</p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                Click a building or memory orb to inspect its history, evidence, and connections.
              </p>
              <div className="mt-3 flex flex-wrap justify-center gap-1.5">
                {["security", "procurement", "vendor-northwind"].map((id) => (
                  <button
                    key={id}
                    onClick={() => setSelectedId(id)}
                    className="rounded-md border border-border px-2 py-1 font-mono text-[10px] text-muted-foreground hover:text-foreground"
                  >
                    {nodeById(id)?.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* workflow stats */}
          <div className="rounded-xl border border-border bg-card p-3">
            <SectionLabel className="mb-2">Workflow evidence</SectionLabel>
            <div className="space-y-1.5">
              {[
                ["Observed count", `${observedWorkflow.observedCount} cases`],
                ["Confidence", `${observedWorkflow.confidence}% (derived)`],
                ["First observed", observedWorkflow.firstObserved],
                ["Last observed", observedWorkflow.lastObserved],
                ["Deviations recorded", String(observedWorkflow.deviations)],
                ["Official steps", officialWorkflow.stepLabels.join(" → ")],
              ].map(([k, v]) => (
                <div key={k} className="flex items-center justify-between gap-2 font-mono text-[10px]">
                  <span className="text-muted-foreground">{k}</span>
                  <span className="text-right text-secondary-foreground">{v}</span>
                </div>
              ))}
            </div>
            <div className="mt-2 flex flex-wrap gap-1">
              {observedWorkflow.supportingMemoryIds.slice(0, 6).map((id) => (
                <button
                  key={id}
                  onClick={() => setSelectedId(id)}
                  className="rounded border border-[#6366F1]/30 bg-[#6366F1]/10 px-1.5 py-0.5 font-mono text-[9px] text-[#8B93F8] hover:bg-[#6366F1]/20"
                >
                  {id}
                </button>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

/* ------------------------------- detail cards ------------------------------- */

function EntityDetailCard({
  id,
  memories,
  onFocus,
  onSelect,
}: {
  id: string;
  memories: TwinMemory[];
  onFocus: (id: string) => void;
  onSelect: (id: string) => void;
}) {
  const node = nodeById(id)!;
  const incidentLinks = org3d.incidents.filter((i) => i.entityIds.includes(id));
  return (
    <div className="rounded-xl border border-border bg-card">
      <div className="flex items-center justify-between border-b border-border bg-surface/60 px-4 py-3">
        <div className="flex items-center gap-2">
          {node.type === "vendor" ? (
            <Boxes className="size-4 text-discovery" />
          ) : (
            <Building2 className="size-4 text-[#8B93F8]" />
          )}
          <p className="text-sm font-semibold">{node.name}</p>
          <Badge variant="outline" className="border-border font-mono text-[9px] text-muted-foreground">
            {DEPT_ICON[node.type] ?? node.type.toUpperCase()}
          </Badge>
        </div>
        <button
          onClick={() => onFocus(id)}
          className="flex items-center gap-1 font-mono text-[10px] text-discovery hover:underline"
        >
          <Camera className="size-3" /> FOCUS
        </button>
      </div>
      <div className="space-y-3 p-4">
        <p className="text-xs leading-5 text-muted-foreground">{node.description}</p>
        <div className="grid grid-cols-3 gap-2">
          <Stat label="Events" value={node.eventCount.toLocaleString()} />
          <Stat label="Decisions" value={String(node.decisionCount)} />
          <Stat label="Incidents" value={String(node.incidentCount)} tone={node.incidentCount > 5 ? "critical" : "neutral"} />
        </div>
        <div>
          <p className="mb-1.5 flex items-center justify-between font-mono text-[9px] uppercase tracking-widest text-muted-foreground">
            ACTIVITY SCORE
            <span className="text-[#8B93F8]">{Math.round(node.activity * 100)}%</span>
          </p>
          <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.05]">
            <div className="h-full rounded-full bg-gradient-to-r from-[#5865F2] to-[#22D3EE]" style={{ width: `${node.activity * 100}%` }} />
          </div>
        </div>
        <div>
          <p className="mb-1.5 font-mono text-[9px] uppercase tracking-widest text-muted-foreground">
            Sampled memories ({memories.length})
          </p>
          <div className="space-y-1.5">
            {memories.map((m) => (
              <button
                key={m.id}
                onClick={() => onSelect(m.id)}
                className="w-full rounded-lg border border-border bg-surface/60 px-2.5 py-1.5 text-left transition-colors hover:border-[#6366F1]/40"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-[10px] text-[#8B93F8]">{m.id}</span>
                  <span className="font-mono text-[9px] uppercase text-muted-foreground">{m.kind}</span>
                </div>
                <p className="truncate text-[11px] text-secondary-foreground">{m.title}</p>
              </button>
            ))}
            {memories.length === 0 && (
              <p className="text-[11px] text-muted-foreground">No sampled memories for this entity yet.</p>
            )}
          </div>
        </div>
        {incidentLinks.length > 0 && (
          <div>
            <p className="mb-1.5 font-mono text-[9px] uppercase tracking-widest text-muted-foreground">
              Linked incidents
            </p>
            {incidentLinks.map((i) => (
              <button
                key={i.id}
                onClick={() => onSelect(i.id)}
                className="mb-1 flex w-full items-center gap-2 rounded-lg border border-[#EF4444]/25 bg-[#EF4444]/5 px-2.5 py-1.5 text-left hover:border-[#EF4444]/50"
              >
                <CircleAlert className="size-3.5 shrink-0 text-[#F87171]" />
                <span className="font-mono text-[10px] text-[#F87171]">{i.id}</span>
                <span className="truncate text-[11px] text-secondary-foreground">{i.title}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function MemoryDetailCard({ memory, onFocus }: { memory: OrgMemory; onFocus: (id: string) => void }) {
  const node = nodeById(memory.kind === "episodic" ? "procurement" : "security");
  void node;
  return (
    <div className="rounded-xl border border-[#22D3EE]/30 bg-card so-glow-discovery">
      <div className="flex items-center justify-between border-b border-border bg-surface/60 px-4 py-3">
        <span className="font-mono text-xs text-discovery">{memory.id}</span>
        <Badge variant="outline" className="border-[#6366F1]/30 bg-[#6366F1]/10 font-mono text-[9px] text-[#8B93F8]">
          {memory.kind.toUpperCase()}
        </Badge>
      </div>
      <div className="space-y-3 p-4">
        <p className="text-sm font-semibold leading-snug">{memory.title}</p>
        <p className="text-xs leading-5 text-muted-foreground">{memory.summary}</p>
        <div className="grid grid-cols-2 gap-2">
          <Stat label="Date" value={memory.date} />
          <Stat label="Outcome" value={memory.outcome} />
          <Stat label="Confidence" value={String(memory.confidence)} />
          <Stat label="Cycle" value={`${memory.cycleDays}d`} />
        </div>
        {memory.actors.length > 0 && (
          <div>
            <p className="mb-1 font-mono text-[9px] uppercase tracking-widest text-muted-foreground">Involved</p>
            <div className="flex flex-wrap gap-1">
              {memory.actors.map((a) => (
                <button
                  key={a}
                  onClick={() => onFocus(idForActor(a))}
                  className="rounded border border-border px-1.5 py-0.5 font-mono text-[9px] text-muted-foreground hover:text-foreground"
                  title="Focus in 3D"
                >
                  {a}
                </button>
              ))}
            </div>
          </div>
        )}
        {memory.related.length > 0 && (
          <div>
            <p className="mb-1 font-mono text-[9px] uppercase tracking-widest text-muted-foreground">
              Related memories
            </p>
            <div className="flex flex-wrap gap-1">
              {memory.related.map((r) => (
                <span
                  key={r}
                  className="rounded border border-[#6366F1]/30 bg-[#6366F1]/10 px-1.5 py-0.5 font-mono text-[9px] text-[#8B93F8]"
                >
                  {r}
                </span>
              ))}
            </div>
          </div>
        )}
        <div className="rounded-lg border border-border bg-surface/60 p-2.5 font-mono text-[10px] leading-4 text-muted-foreground">
          <p className="mb-1 text-[#8B93F8]">WHY SHADOWOPS BELIEVES THIS</p>
          <p>· Indexed by nightly consolidation</p>
          <p>· {memory.related.length} cross-referenced memories</p>
          <p>· Outcome verified against system of record</p>
        </div>
      </div>
    </div>
  );
}

function IncidentDetailCard({
  incidentId,
  onFocus,
  onSelect,
}: {
  incidentId: string;
  onFocus: (id: string) => void;
  onSelect: (id: string) => void;
}) {
  const inc = incidentById(incidentId);
  if (!inc) return null;
  return (
    <div className="rounded-xl border border-[#EF4444]/30 bg-card">
      <div className="flex items-center justify-between border-b border-border bg-surface/60 px-4 py-3">
        <div className="flex items-center gap-2">
          <CircleAlert className="size-4 text-[#F87171]" />
          <p className="font-mono text-xs text-[#F87171]">{inc.id}</p>
        </div>
        <Badge
          variant="outline"
          className={cn(
            "font-mono text-[9px]",
            inc.severity === "critical"
              ? "border-[#EF4444]/40 bg-[#EF4444]/10 text-[#F87171]"
              : "border-[#F59E0B]/40 bg-[#F59E0B]/10 text-[#FBBF24]",
          )}
        >
          {inc.severity.toUpperCase()}
        </Badge>
      </div>
      <div className="space-y-3 p-4">
        <p className="text-sm font-semibold">{inc.title}</p>
        <p className="text-xs leading-5 text-muted-foreground">{inc.summary}</p>
        <div>
          <p className="mb-1 font-mono text-[9px] uppercase tracking-widest text-muted-foreground">Affected</p>
          <div className="flex flex-wrap gap-1">
            {inc.entityIds.map((eid) => (
              <button
                key={eid}
                onClick={() => onFocus(eid)}
                className="rounded border border-border px-1.5 py-0.5 font-mono text-[9px] text-muted-foreground hover:text-foreground"
              >
                {nodeById(eid)?.name ?? eid}
              </button>
            ))}
          </div>
        </div>
        <div>
          <p className="mb-1 font-mono text-[9px] uppercase tracking-widest text-muted-foreground">
            Historical similarity
          </p>
          {inc.similarIncidentIds.map((sid) => {
            const sim = incidentById(sid);
            return sim ? (
              <button
                key={sid}
                onClick={() => onSelect(sid)}
                className="mb-1 w-full rounded-lg border border-border bg-surface/60 px-2.5 py-1.5 text-left hover:border-[#EF4444]/40"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[10px] text-[#F87171]">{sim.id}</span>
                  <span className="font-mono text-[9px] text-muted-foreground">{sim.date}</span>
                </div>
                <p className="truncate text-[11px] text-secondary-foreground">{sim.title}</p>
              </button>
            ) : null;
          })}
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, tone = "neutral" }: { label: string; value: string; tone?: "neutral" | "critical" }) {
  return (
    <div className={cn("rounded-lg border bg-surface/60 px-2.5 py-1.5", tone === "critical" && "border-[#EF4444]/30")}>
      <p className="font-mono text-[8px] uppercase tracking-widest text-muted-foreground">{label}</p>
      <p className={cn("truncate text-xs font-semibold", tone === "critical" ? "text-[#F87171]" : "text-foreground")}>
        {value}
      </p>
    </div>
  );
}

function idForActor(actor: string): string {
  const map: Record<string, string> = {
    Procurement: "procurement",
    Security: "security",
    Finance: "finance",
    IT: "it",
    Manager: "manager-lane",
    Engineering: "procurement",
    "People Ops": "hr",
    Data: "operations",
    CFO: "executive",
  };
  return map[actor] ?? "procurement";
}
