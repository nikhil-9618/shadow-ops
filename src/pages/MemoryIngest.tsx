import { PageHeader } from "@/components/shadowops/AppShell";
import { SectionLabel, TONE, ToneDot } from "@/components/shadowops/primitives";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/convex/_generated/api";
import { cn } from "@/lib/utils";
import { useMutation, useQuery } from "convex/react";
import { motion } from "framer-motion";
import { CheckCircle2, FileJson, FileText, Loader2, ScanSearch, Upload, X } from "lucide-react";
import { useRef, useState } from "react";

interface RawRecord {
  title: string;
  summary: string;
  date?: string;
  actors?: string[];
  sequence?: string[];
}

const PIPELINE = [
  { label: "Parse input", icon: FileText },
  { label: "Validate records", icon: ScanSearch },
  { label: "Extract entities", icon: FileJson },
  { label: "Classify memory", icon: ScanSearch },
  { label: "Store in Hindsight", icon: Upload },
];

function parseCsv(text: string): RawRecord[] {
  const lines = text.trim().split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return [];
  const header = lines[0].split(",").map((h) => h.trim().toLowerCase());
  const iTitle = header.indexOf("title");
  const iSummary = header.indexOf("summary");
  const iDate = header.indexOf("date");
  const iActors = header.indexOf("actors");
  const iSeq = header.indexOf("sequence");
  if (iTitle === -1 || iSummary === -1) return [];
  return lines.slice(1).map((line) => {
    const cols = line.split(",").map((c) => c.trim());
    return {
      title: cols[iTitle] ?? "",
      summary: cols[iSummary] ?? "",
      date: iDate >= 0 ? cols[iDate] : undefined,
      actors:
        iActors >= 0 && cols[iActors] ? cols[iActors].split(/[;|]/).map((s) => s.trim()) : undefined,
      sequence:
        iSeq >= 0 && cols[iSeq] ? cols[iSeq].split(/[;|>]/).map((s) => s.trim()) : undefined,
    };
  });
}

function parseJson(text: string): RawRecord[] {
  try {
    const data = JSON.parse(text);
    const arr = Array.isArray(data) ? data : Array.isArray(data?.records) ? data.records : [data];
    return arr
      .filter((r: any) => r && typeof r.title === "string" && typeof r.summary === "string")
      .map((r: any) => ({
        title: r.title,
        summary: r.summary,
        date: r.date,
        actors: Array.isArray(r.actors) ? r.actors.map(String) : undefined,
        sequence: Array.isArray(r.sequence) ? r.sequence.map(String) : undefined,
      }));
  } catch {
    return [];
  }
}

function kindTone(kind: string) {
  if (kind === "incident") return TONE.critical;
  if (kind === "outcome") return TONE.success;
  if (kind === "workflow") return TONE.discovery;
  if (kind === "procedural") return TONE.neutral;
  return TONE.memory;
}

export default function MemoryIngest() {
  const [raw, setRaw] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [stage, setStage] = useState(-1);
  const [result, setResult] = useState<{ stored: number; related: number; patterns: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const ingested = useQuery(api.memories.listIngested, {});
  const stats = useQuery(api.memories.ingestStats, {});
  const ingest = useMutation(api.memories.ingestMemories);

  const parsed: RawRecord[] = (() => {
    if (!raw.trim()) return [];
    const t = raw.trim();
    if (t.startsWith("{") || t.startsWith("[")) return parseJson(t);
    return parseCsv(t);
  })();

  const runPipeline = async () => {
    if (!parsed.length || stage >= 0) return;
    setError(null);
    setResult(null);
    for (let i = 0; i < PIPELINE.length; i++) {
      setStage(i);
      await new Promise((r) => window.setTimeout(r, 420));
    }
    try {
      const res = await ingest({
        source: fileName?.endsWith(".json") || raw.trim().startsWith("{") ? "json" : "csv",
        sourceName: fileName ?? "pasted-input",
        records: parsed,
      });
      setResult({ stored: res.stored, related: res.relatedFound, patterns: res.patternsUpdated });
      setRaw("");
      setFileName(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ingestion failed");
    } finally {
      setStage(-1);
    }
  };

  const readFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      setRaw(String(reader.result ?? ""));
      setFileName(file.name);
    };
    reader.readAsText(file);
  };

  const clearInput = () => {
    setRaw("");
    setFileName(null);
    setResult(null);
    setError(null);
  };

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 px-4 py-8 sm:px-6">
      <PageHeader
        eyebrow="Memory ingestion"
        title="Feed the memory engine"
        description="Upload historical records — CSV, JSON, or pasted text. ShadowOps parses, classifies, and stores them as organizational memory."
      />

      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <Card className="border-border bg-card/70 shadow-none">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center justify-between text-base">
              New records
              <span className="font-mono text-[10px] text-muted-foreground">{parsed.length} parsed</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                const f = e.dataTransfer.files?.[0];
                if (f) readFile(f);
              }}
              onClick={() => fileRef.current?.click()}
              className={cn(
                "flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-8 text-center transition-colors",
                dragOver
                  ? "border-discovery/60 bg-discovery/5"
                  : "border-border hover:border-[#5865F2]/50 hover:bg-accent/30",
              )}
            >
              <Upload className={cn("size-6", dragOver ? "text-discovery" : "text-muted-foreground")} />
              <p className="mt-2 text-sm font-medium">
                Drop a file or <span className="text-discovery">browse</span>
              </p>
              <p className="mt-1 font-mono text-[10px] text-muted-foreground">
                CSV: title,summary,date,actors,sequence · JSON array · or paste below
              </p>
              <input
                ref={fileRef}
                type="file"
                accept=".csv,.json,.txt,.md"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) readFile(f);
                  e.target.value = "";
                }}
              />
            </div>

            <textarea
              value={raw}
              onChange={(e) => {
                setRaw(e.target.value);
                setFileName(null);
              }}
              rows={7}
              placeholder={
                "title,summary,date,actors,sequence\nVendor kickoff,Northwind onboarding started,2026-05-01,Procurement,Procurement>Security>Finance"
              }
              className="w-full resize-y rounded-lg border border-input bg-background p-3 font-mono text-xs text-foreground placeholder:text-muted-foreground/50 focus:border-[#5865F2]/60 focus:outline-none"
            />

            <div>
              <SectionLabel className="mb-2">Ingestion pipeline</SectionLabel>
              <div className="flex flex-wrap items-center gap-1.5">
                {PIPELINE.map((p, i) => {
                  const done = stage > i || (Boolean(result) && stage === -1);
                  const active = stage === i;
                  return (
                    <div key={p.label} className="flex items-center gap-1.5">
                      <div
                        className={cn(
                          "flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 font-mono text-[10px] transition-all",
                          done
                            ? "border-[#22C55E]/40 bg-[#22C55E]/10 text-[#4ADE80]"
                            : active
                              ? "border-discovery/50 bg-discovery/10 text-discovery so-glow-discovery"
                              : "border-border text-muted-foreground",
                        )}
                      >
                        {active ? (
                          <Loader2 className="size-3 animate-spin" />
                        ) : done ? (
                          <CheckCircle2 className="size-3" />
                        ) : (
                          <p.icon className="size-3" />
                        )}
                        {p.label}
                      </div>
                      {i < PIPELINE.length - 1 && <span className="text-[#3B4160]">→</span>}
                    </div>
                  );
                })}
              </div>
            </div>

            {error && (
              <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-red-400">
                {error}
              </p>
            )}

            {result && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-lg border border-[#22C55E]/30 bg-[#22C55E]/10 px-4 py-3"
              >
                <p className="text-sm font-semibold text-[#4ADE80]">{result.stored} memories stored</p>
                <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">
                  Related memories found: {result.related} · Pattern statistics updated:{" "}
                  {result.patterns} · 3D twin updated
                </p>
              </motion.div>
            )}

            <div className="flex items-center gap-2">
              <Button
                onClick={runPipeline}
                disabled={!parsed.length || stage >= 0}
                className="bg-discovery text-[#06222B] hover:bg-discovery/85"
              >
                {stage >= 0 ? (
                  <>
                    <Loader2 className="size-4 animate-spin" /> Ingesting…
                  </>
                ) : (
                  <>
                    <Upload className="size-4" /> Ingest {parsed.length || ""} records
                  </>
                )}
              </Button>
              {(raw || fileName) && (
                <Button variant="ghost" size="sm" onClick={clearInput}>
                  <X className="size-3.5" /> Clear
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card className="border-border bg-card/70 shadow-none">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Ingestion stats</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center justify-between rounded-lg border border-border bg-surface/60 px-3 py-2">
                <span className="text-xs text-muted-foreground">Total ingested</span>
                <span className="font-mono text-sm font-bold text-[#8B93F8]">
                  {stats ? stats.total : "…"}
                </span>
              </div>
              {stats &&
                Object.entries(stats.byKind).map(([kind, n]) => {
                  const tone = kindTone(kind);
                  return (
                    <div key={kind} className="flex items-center justify-between px-1 font-mono text-[10px]">
                      <span className="flex items-center gap-2 text-muted-foreground">
                        <ToneDot tone={tone === TONE.critical ? "critical" : tone === TONE.success ? "success" : tone === TONE.discovery ? "discovery" : tone === TONE.neutral ? "neutral" : "memory"} />
                        {kind}
                      </span>
                      <span className="text-secondary-foreground">{n}</span>
                    </div>
                  );
                })}
            </CardContent>
          </Card>

          <Card className="border-border bg-card/70 shadow-none">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Recently stored</CardTitle>
            </CardHeader>
            <CardContent className="max-h-[340px] space-y-2 overflow-y-auto">
              {(ingested ?? []).slice(0, 12).map((m) => {
                const tone = kindTone(m.kind);
                return (
                  <div key={m._id} className="rounded-lg border border-border bg-surface/60 px-3 py-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-[10px] text-[#8B93F8]">{m.memoryId}</span>
                      <span
                        className={cn(
                          "rounded-full border px-1.5 py-0.5 font-mono text-[9px] uppercase",
                          tone.bg,
                          tone.border,
                          tone.text,
                        )}
                      >
                        {m.kind}
                      </span>
                    </div>
                    <p className="mt-1 truncate text-xs text-secondary-foreground">{m.title}</p>
                    <p className="font-mono text-[9px] text-muted-foreground">
                      {m.date} · conf {m.confidence} · {m.sourceName}
                    </p>
                  </div>
                );
              })}
              {ingested && ingested.length === 0 && (
                <p className="py-6 text-center text-xs text-muted-foreground">
                  Nothing ingested yet — records you store persist across sessions via Convex.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
