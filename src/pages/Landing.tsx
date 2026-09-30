import { BrandMark, MemoryLoop, Wordmark } from "@/components/shadowops/brand";
import { SectionLabel } from "@/components/shadowops/primitives";
import { CommandGraph } from "@/components/shadowops/visualizations";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { useLiveMemoryCount, formatMemoryCount } from "@/lib/memory-count";
import { MEMORY_COUNTS } from "@/lib/shadowops-data";
import { motion } from "framer-motion";
import { ArrowRight, BrainCircuit, GitBranch, Network, Waypoints } from "lucide-react";
import { Link } from "react-router";

const fadeUp = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-60px" },
  transition: { duration: 0.6 },
} as const;

export default function Landing() {
  const { isAuthenticated } = useAuth();
  const memoryCount = useLiveMemoryCount();

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* ambient memory field */}
      <div className="pointer-events-none fixed inset-0 so-grid-bg so-radial-fade" aria-hidden />

      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-2.5">
            <BrandMark size={30} />
            <Wordmark compact />
          </div>
          <div className="flex items-center gap-2">
            {isAuthenticated ? (
              <Button asChild size="sm" className="bg-discovery text-[#06222B] hover:bg-discovery/85">
                <Link to="/dashboard">Open Command Center</Link>
              </Button>
            ) : (
              <>
                <Button asChild variant="ghost" size="sm">
                  <Link to="/auth">Sign in</Link>
                </Button>
                <Button asChild size="sm" className="bg-discovery text-[#06222B] hover:bg-discovery/85">
                  <Link to="/auth">Request access</Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="relative">
        {/* ---------- HERO ---------- */}
        <section className="mx-auto max-w-6xl px-4 pb-16 pt-20 sm:px-6 sm:pt-28">
          <div className="grid items-center gap-12 lg:grid-cols-[1.15fr_0.85fr]">
            <div>
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="inline-flex items-center gap-2 rounded-full border border-[#6366F1]/30 bg-[#6366F1]/10 px-3 py-1"
              >
                <span className="size-1.5 rounded-full bg-discovery so-pulse" />
                <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#8B93F8]">
                  Powered by Hindsight memory
                </span>
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.08 }}
                className="mt-6 text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-6xl"
              >
                Your organization
                <br />
                already knows
                <br />
                <span className="so-gradient-text">how work happens.</span>
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.16 }}
                className="mt-6 max-w-xl text-base leading-7 text-muted-foreground sm:text-lg"
              >
                ShadowOps is the AI organizational intelligence command center. It turns years
                of hidden history — events, decisions, incidents — into discovered workflows
                with evidence you can trace back to the moment it happened.
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.24 }}
                className="mt-8 flex flex-wrap items-center gap-3"
              >
                <Button asChild size="lg" className="bg-discovery text-[#06222B] hover:bg-discovery/85">
                  <Link to={isAuthenticated ? "/dashboard" : "/auth"}>
                    Explore organizational memory
                    <ArrowRight className="size-4" />
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline" className="border-border bg-card/50">
                  <Link to={isAuthenticated ? "/intelligence" : "/auth"}>See it answer a question</Link>
                </Button>
              </motion.div>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.8, delay: 0.4 }}
                className="mt-10"
              >
                <MemoryLoop className="text-[10px]" />
              </motion.div>
            </div>

            {/* hero visual: hidden history becoming visible */}
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="relative rounded-2xl border border-border bg-card/60 p-6 so-glow-memory"
            >
              <div className="mb-4 flex items-center justify-between">
                <SectionLabel>Organizational Memory</SectionLabel>
                <span className="font-mono text-[10px] text-discovery">LIVE VIEW</span>
              </div>
              <CommandGraph className="mx-auto max-w-[340px]" />
              <div className="mt-2 grid grid-cols-3 gap-2 border-t border-border pt-4 text-center">
                <div>
                  <p className="font-mono text-lg font-semibold text-[#8B93F8]">
                    {formatMemoryCount(memoryCount)}
                  </p>
                  <p className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">Memories</p>
                </div>
                <div>
                  <p className="font-mono text-lg font-semibold text-discovery">{MEMORY_COUNTS.workflows}</p>
                  <p className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">Workflows</p>
                </div>
                <div>
                  <p className="font-mono text-lg font-semibold text-[#4ADE80]">84%</p>
                  <p className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">Top pattern</p>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* ---------- MEMORY → PATTERN → WORKFLOW ---------- */}
        <section className="border-y border-border/60 bg-surface/60">
          <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
            <motion.div {...fadeUp} className="mb-12 max-w-2xl">
              <SectionLabel className="text-discovery/80">The intelligence loop</SectionLabel>
              <h2 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
                Memory becomes pattern. Pattern becomes workflow.
              </h2>
              <p className="mt-3 text-muted-foreground">
                ShadowOps never asks you to document your processes. It watches what actually
                happened, finds the sequences that keep repeating, and shows you the workflow
                hiding inside them.
              </p>
            </motion.div>

            <div className="grid gap-4 md:grid-cols-3">
              {[
                {
                  icon: <BrainCircuit className="size-5" />,
                  title: "Memory",
                  question: "What happened?",
                  body: `Every event, decision, and outcome — ${formatMemoryCount(memoryCount)} and counting — retained as connected organizational memory.`,
                  tone: "memory" as const,
                },
                {
                  icon: <GitBranch className="size-5" />,
                  title: "Pattern",
                  question: "What keeps happening?",
                  body: "Repeated sequences merge into patterns with measured frequency and confidence — like 84 of 100 vendor cases.",
                  tone: "memory" as const,
                },
                {
                  icon: <Waypoints className="size-5" />,
                  title: "Workflow",
                  question: "How does work actually happen?",
                  body: "Discovered workflows illuminate the real path through your organization, dependencies included.",
                  tone: "discovery" as const,
                },
              ].map((c, i) => (
                <motion.div
                  key={c.title}
                  {...fadeUp}
                  transition={{ duration: 0.6, delay: i * 0.1 }}
                  className="group relative rounded-xl border border-border bg-card p-6 transition-colors hover:border-foreground/20"
                >
                  <span
                    className={`absolute inset-x-0 top-0 h-px rounded-t-xl ${
                      c.tone === "discovery" ? "bg-discovery" : "bg-[#6366F1]"
                    } opacity-50`}
                  />
                  <span
                    className={`flex size-10 items-center justify-center rounded-lg ${
                      c.tone === "discovery"
                        ? "bg-discovery/10 text-discovery"
                        : "bg-[#6366F1]/10 text-[#8B93F8]"
                    }`}
                  >
                    {c.icon}
                  </span>
                  <h3 className="mt-4 text-lg font-semibold">{c.title}</h3>
                  <p className="font-mono text-[11px] text-discovery/80">{c.question}</p>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{c.body}</p>
                </motion.div>
              ))}
            </div>

            {/* memory → pattern merge strip */}
            <motion.div
              {...fadeUp}
              className="mt-6 overflow-hidden rounded-xl border border-border bg-card/60"
            >
              <div className="grid items-center gap-6 p-6 md:grid-cols-2">
                <div>
                  <SectionLabel>Signature interaction</SectionLabel>
                  <h3 className="mt-2 text-xl font-semibold">Watch history converge into insight</h3>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    Individual historical cases flow together into a single observed pattern.
                    The merge is the moment hidden history becomes visible — and it happens
                    across every view in ShadowOps.
                  </p>
                </div>
                <div className="relative">
                  <div className="space-y-2 font-mono text-xs">
                    {["Case 1042", "Case 1087", "Case 1134", "Case 1189"].map((c, i) => (
                      <motion.div
                        key={c}
                        initial={{ opacity: 0, x: -16 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: i * 0.12, duration: 0.45 }}
                        className="flex items-center gap-2"
                      >
                        <span className="size-1.5 rounded-full bg-[#6366F1]" />
                        <span className="text-[#8B93F8]">{c}</span>
                        <motion.span
                          initial={{ width: 0 }}
                          whileInView={{ width: "72%" }}
                          viewport={{ once: true }}
                          transition={{ delay: 0.4 + i * 0.12, duration: 0.7 }}
                          className="h-px bg-gradient-to-r from-[#6366F1]/70 to-discovery/70"
                        />
                      </motion.div>
                    ))}
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: 1, duration: 0.5 }}
                      className="ml-3.5 mt-3 inline-flex items-center gap-2 rounded-lg border border-discovery/40 bg-discovery/10 px-3 py-2 text-discovery so-glow-discovery"
                    >
                      <Network className="size-3.5" />
                      PATTERN · 84% frequency · high confidence
                    </motion.div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* ---------- EVIDENCE ---------- */}
        <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <motion.div {...fadeUp}>
              <SectionLabel className="text-discovery/80">Transparency by design</SectionLabel>
              <h2 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
                Every answer carries its evidence trail
              </h2>
              <p className="mt-3 leading-7 text-muted-foreground">
                AI conclusions are never a black box. Move backward from answer to observed
                pattern to historical case to the underlying memory. If ShadowOps says it,
                it can show you where memory says it.
              </p>
              <div className="mt-6 space-y-3">
                {[
                  "Answer → Observed Pattern",
                  "Observed Pattern → Discovered Workflow",
                  "Workflow → Historical Cases",
                  "Historical Cases → Hindsight Memories",
                ].map((s, i) => (
                  <motion.div
                    key={s}
                    initial={{ opacity: 0, x: -12 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.08 }}
                    className="flex items-center gap-3 rounded-lg border border-border bg-card/60 px-4 py-2.5 font-mono text-xs text-secondary-foreground"
                  >
                    <span className="font-mono text-[10px] text-discovery">{String(i + 1).padStart(2, "0")}</span>
                    {s}
                  </motion.div>
                ))}
              </div>
            </motion.div>

            <motion.div {...fadeUp} className="rounded-2xl border border-border bg-card/60 p-6">
              <div className="rounded-lg border border-border bg-surface p-4">
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Sample query</p>
                <p className="mt-1 text-sm text-foreground">"How do we actually approve a new vendor?"</p>
                <div className="my-4 border-t border-border/70" />
                <p className="text-xs leading-6 text-secondary-foreground">
                  Based on <span className="font-semibold text-foreground">100 historical vendor cases</span>,
                  ShadowOps observed this workflow:
                </p>
                <div className="mt-3 flex flex-col items-center gap-1.5 font-mono text-xs">
                  {["Procurement", "Security", "Finance", "Manager", "IT"].map((s, i) => (
                    <div key={s} className="flex flex-col items-center">
                      <span
                        className={`rounded-md border px-3 py-1 ${
                          i === 0 || i === 4
                            ? "border-[#6366F1]/40 bg-[#6366F1]/10 text-[#8B93F8]"
                            : "border-discovery/40 bg-discovery/10 text-discovery"
                        }`}
                      >
                        {s}
                      </span>
                      {i < 4 && <span className="text-[#3B4160]">↓</span>}
                    </div>
                  ))}
                </div>
                <div className="mt-4 flex items-center justify-between rounded-lg bg-white/[0.03] px-3 py-2">
                  <span className="font-mono text-[10px] text-muted-foreground">MEMORY EVIDENCE</span>
                  <span className="font-mono text-[11px] text-[#8B93F8]">M-1042 · M-1087 · M-1134 · +81</span>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* ---------- CTA ---------- */}
        <section className="border-t border-border/60 bg-surface/60">
          <div className="mx-auto max-w-6xl px-4 py-20 text-center sm:px-6">
            <motion.div {...fadeUp}>
              <BrandMark size={48} className="mx-auto" />
              <h2 className="mx-auto mt-6 max-w-2xl text-3xl font-bold tracking-tight sm:text-4xl">
                Stop guessing how work happens. <span className="so-gradient-text">Remember it.</span>
              </h2>
              <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
                Memory → Understanding → Action → New Memory. The loop never stops.
              </p>
              <div className="mt-8 flex flex-wrap justify-center gap-3">
                <Button asChild size="lg" className="bg-discovery text-[#06222B] hover:bg-discovery/85">
                  <Link to={isAuthenticated ? "/dashboard" : "/auth"}>
                    Enter the Command Center
                    <ArrowRight className="size-4" />
                  </Link>
                </Button>
              </div>
            </motion.div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border/60 py-6">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 font-mono text-[10px] text-muted-foreground/70 sm:px-6">
          <span>SHADOWOPS · AI ORGANIZATIONAL INTELLIGENCE</span>
          <span className="flex items-center gap-1.5">
            Hindsight memory layer <span className="size-1.5 rounded-full bg-discovery so-pulse" />
          </span>
        </div>
      </footer>
    </div>
  );
}
