import { PageHeader } from "@/components/shadowops/AppShell";
import { SectionLabel, TONE, ToneDot } from "@/components/shadowops/primitives";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { askAgent, agentActivity, type AgentAnswer, type AgentStep } from "@/lib/shadowops-agent";
import { getMemory, type OrgMemory } from "@/lib/shadowops-data";
import { cn } from "@/lib/utils";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowUp,
  Box,
  BrainCircuit,
  CheckCircle2,
  CircleAlert,
  ListOrdered,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";

interface Exchange {
  role: "user" | "shadowops";
  text?: string;
  answer?: AgentAnswer;
}

const SUGGESTIONS = [
  "How do we actually approve a new vendor?",
  "Why does Security appear before Finance?",
  "What happened when Security approval was skipped?",
  "How do we fast-track a low-risk vendor?",
  "What spend goes to the CFO lane?",
  "Compare the official vs observed workflow.",
];

function isOrgQuestion(q: string): boolean {
  return /(vendor|approv|procure|security|finance|onboard|access|jml|incident|workflow|pattern|evidence|cfo|fast|skip|compare|policy|reject|memory|our|how|why|what)/i.test(
    q,
  );
}

export default function Intelligence() {
  const [exchanges, setExchanges] = useState<Exchange[]>([]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState<string[] | null>(null);
  const timers = useRef<number[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const busy = thinking !== null;

  useEffect(() => {
    return () => timers.current.forEach((t) => window.clearTimeout(t));
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [exchanges, thinking]);

  const ask = (question: string) => {
    if (!question.trim() || busy) return;
    const q = question.trim();
    setInput("");
    setExchanges((ex) => [...ex, { role: "user", text: q }]);

    const answer = askAgent(q);
    const activity = isOrgQuestion(q)
      ? agentActivity(answer)
      : [
          "Accessing organizational memory...",
          "Scanning for related historical evidence...",
          "No stronger evidence available — answering from memory context",
        ];
    const shown = activity.slice(0, 3 + (q.length % 2));
    setThinking([]);
    shown.forEach((line, i) => {
      const t = window.setTimeout(() => setThinking((p) => [...(p ?? []), line]), 380 + i * 520);
      timers.current.push(t);
    });
    const done = window.setTimeout(() => {
      setThinking(null);
      setExchanges((ex) => [...ex, { role: "shadowops", answer }]);
    }, 380 + shown.length * 520 + 280);
    timers.current.push(done);
  };

  const openTwin = (answer: AgentAnswer) => {
    navigate("/organization-3d", {
      state: {
        workflowMode: answer.workflowMode ?? "observed",
        focusMemory: answer.memoryIds[0],
      },
    });
  };

  return (
    <div className="mx-auto flex h-[calc(100vh-3.5rem)] w-full max-w-4xl flex-col px-4 sm:px-6">
      <div className="pt-6">
        <PageHeader
          eyebrow="What does ShadowOps understand?"
          title="Intelligence"
          description="Every answer is computed from organizational memory — with the steps and evidence behind it."
        />
      </div>

      <div ref={scrollRef} className="flex-1 space-y-6 overflow-y-auto py-6">
        {exchanges.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <div className="flex size-12 items-center justify-center rounded-2xl border border-[#6366F1]/30 bg-[#6366F1]/10 so-glow-memory">
              <BrainCircuit className="size-6 text-[#8B93F8]" />
            </div>
            <h2 className="mt-4 text-xl font-semibold">Ask organizational memory</h2>
            <p className="mt-1 max-w-md text-sm text-muted-foreground">
              Questions answer from recorded history only — with step-by-step actions grounded in evidence.
            </p>
            <div className="mt-6 grid w-full max-w-lg gap-2">
              {SUGGESTIONS.map((s, i) => (
                <motion.button
                  key={s}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  onClick={() => ask(s)}
                  className="flex items-center justify-between rounded-lg border border-border bg-card/60 px-4 py-2.5 text-left text-sm text-secondary-foreground transition-colors hover:border-discovery/40 hover:bg-discovery/5"
                >
                  {s}
                  <ArrowUp className="size-3.5 -rotate-45 text-muted-foreground" />
                </motion.button>
              ))}
            </div>
          </div>
        )}

        {exchanges.map((ex, i) =>
          ex.role === "user" ? (
            <div key={i} className="flex justify-end">
              <div className="max-w-[85%] rounded-2xl rounded-br-md border border-[#5865F2]/30 bg-[#5865F2]/15 px-4 py-2.5 text-sm text-foreground">
                {ex.text}
              </div>
            </div>
          ) : (
            <AgentAnswerCard key={i} answer={ex.answer!} onOpenTwin={openTwin} />
          ),
        )}

        <AnimatePresence>
          {thinking && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="rounded-xl border border-[#6366F1]/25 bg-card/60 px-4 py-3"
            >
              <div className="space-y-1.5">
                {thinking.map((line, i) => (
                  <motion.p
                    key={`${line}-${i}`}
                    initial={{ opacity: 0, x: -6 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex items-center gap-2 font-mono text-[11px] text-[#8B93F8]"
                  >
                    <ToneDot tone="memory" pulse />
                    {line}
                  </motion.p>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="pb-6">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            ask(input);
          }}
          className="flex items-center gap-2 rounded-2xl border border-border bg-card p-2 shadow-lg focus-within:border-[#5865F2]/50"
        >
          <BrainCircuit className="ml-2 size-4 shrink-0 text-discovery/70" />
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask your organization's memory..."
            className="border-0 bg-transparent shadow-none focus-visible:ring-0"
            disabled={busy}
          />
          <Button
            type="submit"
            size="icon"
            disabled={busy || !input.trim()}
            className="size-9 shrink-0 rounded-xl bg-discovery text-[#06222B] hover:bg-discovery/85"
          >
            <ArrowUp className="size-4" />
          </Button>
        </form>
        <p className="mt-2 text-center font-mono text-[10px] text-muted-foreground/60">
          Memory-grounded agent · evidence included · no general-knowledge answers
        </p>
      </div>
    </div>
  );
}

/* ---------------- answer rendering ---------------- */

function AgentAnswerCard({
  answer,
  onOpenTwin,
}: {
  answer: AgentAnswer;
  onOpenTwin: (a: AgentAnswer) => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-3"
    >
      <div className="rounded-2xl border border-border bg-card p-5">
        <div className="flex items-center gap-2">
          <span className="flex size-7 items-center justify-center rounded-lg bg-[#6366F1]/15 text-[#8B93F8]">
            <BrainCircuit className="size-4" />
          </span>
          <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            ShadowOps · from memory
          </span>
          <span className="ml-auto font-mono text-[10px] text-discovery">
            confidence {answer.confidence}
          </span>
        </div>

        <p className="mt-4 text-sm font-semibold leading-6 text-foreground">{answer.summary}</p>

        {answer.stats.length > 0 && (
          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {answer.stats.map((s) => (
              <div key={s.label} className="rounded-lg border border-border bg-surface/60 px-3 py-2">
                <p className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground">{s.label}</p>
                <p className="mt-0.5 truncate text-xs font-semibold text-foreground">{s.value}</p>
              </div>
            ))}
          </div>
        )}

        {answer.workflow && (
          <div className="mt-4 rounded-xl border border-discovery/30 bg-discovery/5 p-4">
            <div className="flex items-center justify-between">
              <SectionLabel>Observed workflow · {answer.workflow.name}</SectionLabel>
              <button
                onClick={() => onOpenTwin(answer)}
                className="flex items-center gap-1 font-mono text-[10px] text-discovery hover:underline"
              >
                <Box className="size-3" /> VIEW IN 3D
              </button>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-1">
              {answer.workflow.steps.map((s, i) => (
                <div key={`${s}-${i}`} className="flex items-center gap-1">
                  <motion.span
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.15 + i * 0.08 }}
                    className={cn(
                      "rounded-md border px-2.5 py-1 font-mono text-[11px]",
                      i === 0
                        ? "border-[#6366F1]/40 bg-[#6366F1]/10 text-[#8B93F8]"
                        : "border-discovery/35 bg-discovery/10 text-discovery",
                    )}
                  >
                    {s}
                  </motion.span>
                  {i < answer.workflow!.steps.length - 1 && <span className="text-[#3B4160]">→</span>}
                </div>
              ))}
            </div>
          </div>
        )}

        {answer.steps.length > 0 && (
          <div className="mt-5">
            <div className="mb-2 flex items-center gap-2">
              <ListOrdered className="size-3.5 text-[#8B93F8]" />
              <SectionLabel>Recommended steps</SectionLabel>
            </div>
            <div className="space-y-2">
              {answer.steps.map((s, i) => (
                <StepRow key={`${s.label}-${i}`} step={s} index={i} />
              ))}
            </div>
          </div>
        )}

        {answer.caution && (
          <div className="mt-4 flex items-start gap-2 rounded-lg border border-warning/25 bg-warning/5 px-3 py-2">
            <CircleAlert className="mt-0.5 size-3.5 shrink-0 text-warning/80" />
            <p className="text-xs leading-5 text-muted-foreground">{answer.caution}</p>
          </div>
        )}

        {answer.memoryIds.length > 0 && (
          <div className="mt-5">
            <SectionLabel className="mb-2">Memory evidence</SectionLabel>
            <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-border bg-surface/60 p-3">
              {answer.memoryIds.slice(0, 8).map((id) => (
                <EvidenceButton key={id} id={id} />
              ))}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}

function StepRow({ step, index }: { step: AgentStep; index: number }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-lg border border-border bg-surface/50">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-3 px-3 py-2.5 text-left"
      >
        <span className="flex size-5 shrink-0 items-center justify-center rounded-md bg-[#5865F2]/20 font-mono text-[10px] font-bold text-[#8B93F8]">
          {index + 1}
        </span>
        <span className="flex-1 text-xs font-medium text-foreground">{step.label}</span>
        {step.memoryIds && step.memoryIds.length > 0 && (
          <Badge variant="outline" className="border-[#6366F1]/30 bg-[#6366F1]/10 font-mono text-[9px] text-[#8B93F8]">
            {step.memoryIds.length} evidence
          </Badge>
        )}
        <CheckCircle2 className="size-3.5 shrink-0 text-[#22C55E]/60" />
      </button>
      {open && (
        <div className="border-t border-border/70 px-3 py-2 pl-10">
          <p className="text-xs leading-5 text-muted-foreground">{step.detail}</p>
          {step.memoryIds && step.memoryIds.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {step.memoryIds.map((id) => (
                <EvidenceButton key={id} id={id} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function EvidenceButton({ id }: { id: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-md border px-2 py-1 font-mono text-[11px] transition-colors",
          TONE.memory.bg,
          TONE.memory.border,
          TONE.memory.text,
          "hover:border-[#6366F1]/60 hover:bg-[#6366F1]/20",
        )}
      >
        {id}
      </button>
      {open && <MemoryDialog id={id} onClose={() => setOpen(false)} />}
    </>
  );
}

function MemoryDialog({ id, onClose }: { id: string; onClose: () => void }) {
  const memory: OrgMemory | undefined = getMemory(id);
  if (!memory) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-xl border border-border bg-popover p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <span className="font-mono text-xs text-[#8B93F8]">{memory.id}</span>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground" aria-label="Close">
            <X className="size-4" />
          </button>
        </div>
        <p className="mt-2 text-sm font-semibold">{memory.title}</p>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">{memory.summary}</p>
        <div className="mt-3 flex flex-wrap gap-1.5">
          <span className="rounded-md border border-border px-2 py-0.5 font-mono text-[10px] text-muted-foreground">
            {memory.kind} · {memory.date}
          </span>
          {memory.actors.map((a) => (
            <span key={a} className="rounded-md border border-border px-2 py-0.5 font-mono text-[10px] text-muted-foreground">
              {a}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
