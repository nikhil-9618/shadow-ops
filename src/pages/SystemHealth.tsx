import { PageHeader } from "@/components/shadowops/AppShell";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/use-auth";
import { BrandMark } from "@/components/shadowops/brand";
import { SectionLabel, TONE, ToneDot } from "@/components/shadowops/primitives";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useLiveMemoryCount, formatMemoryCount } from "@/lib/memory-count";
import { MEMORY_COUNTS } from "@/lib/shadowops-data";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { Database, RefreshCw, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { useAction, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { isAdminEmail } from "@/pages/Audit";

interface EngineStatus {
  configured: boolean;
  connected: boolean;
  baseUrl: string;
  bankId: string;
  apiVersion: string | null;
  features: Record<string, boolean> | null;
  error: string | null;
  code: string | null;
}

export default function SystemHealth() {
  const memoryCount = useLiveMemoryCount();
  const [secondsSinceSync, setSecondsSinceSync] = useState(122);
  const getEngineStatus = useAction(api.hindsight.getEngineStatus);
  const [engine, setEngine] = useState<EngineStatus | null>(null);
  const [connecting, setConnecting] = useState(false);
  const ensureBank = useAction(api.hindsight.ensureBank);

  // Admin connection-settings panel state.
  const { user } = useAuth();
  const admin = isAdminEmail(user?.email);
  const getSettings = useMutation(api.hindsightSettings.getSettings);
  const setSettings = useMutation(api.hindsightSettings.setSettings);
  const clearSettings = useMutation(api.hindsightSettings.clearSettings);
  const [showKeys, setShowKeys] = useState(false);
  const [adminPw, setAdminPw] = useState("");
  const [newKey, setNewKey] = useState("");
  const [newBaseUrl, setNewBaseUrl] = useState("");
  const [newBankId, setNewBankId] = useState("");
  const [settingsView, setSettingsView] = useState<
    | { configured: boolean; source: string; maskedKey: string | null; baseUrl: string; bankId: string; updatedBy?: string; updatedAt?: number; error?: string }
    | null
  >(null);
  const [keysMsg, setKeysMsg] = useState<string | null>(null);
  const [savingKey, setSavingKey] = useState(false);

  const loadSettings = (pw: string) => {
    getSettings({ password: pw })
      .then((s: any) => {
        if (s.error) {
          setKeysMsg(s.error === "password" ? "Incorrect admin password." : "Admin access required.");
          setSettingsView(null);
        } else {
          setSettingsView(s);
          setKeysMsg(null);
        }
      })
      .catch(() => setKeysMsg("Could not load settings."));
  };

  const openKeysPanel = () => {
    setShowKeys(true);
    setKeysMsg(null);
    if (adminPw) loadSettings(adminPw);
  };

  const saveKey = async () => {
    if (!newKey.trim()) return;
    setSavingKey(true);
    try {
      const res: any = await setSettings({
        password: adminPw,
        apiKey: newKey.trim(),
        baseUrl: newBaseUrl.trim() || undefined,
        bankId: newBankId.trim() || undefined,
      });
      if (res.error) {
        setKeysMsg(res.error === "password" ? "Incorrect admin password." : "Could not save the key.");
      } else {
        setKeysMsg("Key saved — engine will use it immediately.");
        setNewKey("");
        loadSettings(adminPw);
        refreshEngine();
      }
    } finally {
      setSavingKey(false);
    }
  };

  const clearKey = async () => {
    setSavingKey(true);
    try {
      await clearSettings({ password: adminPw });
      setKeysMsg("Admin key removed — falling back to the deployment env var (if set).");
      loadSettings(adminPw);
      refreshEngine();
    } finally {
      setSavingKey(false);
    }
  };

  const refreshEngine = () => {
    getEngineStatus({})
      .then((s: EngineStatus) => setEngine(s))
      .catch(() => setEngine(null));
  };

  useEffect(() => {
    refreshEngine();
    const t = window.setInterval(refreshEngine, 30000);
    return () => window.clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const t = window.setInterval(() => setSecondsSinceSync((s) => s + 1), 1000);
    return () => window.clearInterval(t);
  }, []);

  const connectBank = async () => {
    setConnecting(true);
    try {
      await ensureBank({});
      refreshEngine();
    } catch {
      /* status refresh will surface the error */
    } finally {
      setConnecting(false);
    }
  };

  const syncLabel =
    secondsSinceSync < 60
      ? `${secondsSinceSync} seconds ago`
      : `${Math.floor(secondsSinceSync / 60)} minutes ago`;

  const metrics = [
    { label: "Ingestion rate", value: "142 memories / hour", tone: "memory" as const, status: "healthy" },
    { label: "Consolidation", value: "Nightly · 02:00 UTC", tone: "memory" as const, status: "healthy" },
    { label: "Pattern engine", value: "4 active analyses", tone: "discovery" as const, status: "running" },
    { label: "Evidence linking", value: "100% coverage", tone: "success" as const, status: "healthy" },
  ];

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 px-4 py-8 sm:px-6">
      <PageHeader
        eyebrow="System"
        title="Memory Engine Health"
        description="Hindsight infrastructure status. Deliberately kept out of the daily experience — this is the machinery underneath."
      />

      <Card className={cn("border-[#22C55E]/25 bg-card/70 shadow-none")}>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Database className="size-4 text-[#8B93F8]" />
            MEMORY ENGINE
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div
            className={cn(
              "flex items-center gap-3 rounded-lg border px-4 py-3",
              engine?.connected ? "border-[#22C55E]/25 bg-[#22C55E]/10" : "border-[#F59E0B]/30 bg-[#F59E0B]/10",
            )}
          >
            <ToneDot tone={engine?.connected ? "success" : "warning"} pulse />
            <span className={`text-sm font-semibold ${engine?.connected ? "text-[#4ADE80]" : "text-[#FBBF24]"}`}>
              {engine === null
                ? "Checking Hindsight…"
                : engine.connected
                  ? "Hindsight Connected"
                  : engine.configured
                    ? "Hindsight Unreachable"
                    : "Hindsight Not Configured"}
            </span>
            {engine?.connected && (
              <span className="ml-auto font-mono text-[10px] text-muted-foreground">API v{engine.apiVersion}</span>
            )}
            {!engine?.connected && engine !== null && (
              <button
                onClick={() => void connectBank()}
                disabled={connecting}
                className="ml-auto rounded-md border border-[#F59E0B]/40 px-2.5 py-1 font-mono text-[10px] text-[#FBBF24] hover:bg-[#F59E0B]/15 disabled:opacity-50"
              >
                {connecting ? "CONNECTING…" : "CONNECT"}
              </button>
            )}
          </div>
          {engine && !engine.connected && engine.error && (
            <p className="rounded-lg border border-[#F59E0B]/25 bg-[#F59E0B]/5 px-3 py-2 font-mono text-[10px] leading-4 text-[#FBBF24]/90">
              {engine.error}
            </p>
          )}

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatusStat label="Memory Status" value="Healthy" tone="success" />
            <StatusStat label="Last Sync" value={syncLabel} tone="memory" live />
            <StatusStat label="Memories" value={formatMemoryCount(memoryCount)} tone="memory" />
            <StatusStat label="Organizations" value="1" tone="neutral" />
          </div>

          {admin && (
            <div className="rounded-lg border border-border bg-surface/60 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                    Connection settings · admins only
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Rotate the Hindsight API key without a redeploy. Changes apply immediately for everyone.
                  </p>
                </div>
                <button
                  onClick={() => (showKeys ? setShowKeys(false) : openKeysPanel())}
                  className="rounded-md border border-border px-3 py-1.5 font-mono text-[10px] text-foreground hover:bg-accent"
                >
                  {showKeys ? "HIDE" : "MANAGE KEYS"}
                </button>
              </div>

              {showKeys && (
                <div className="mt-4 space-y-3">
                  {!settingsView ? (
                    <div className="flex max-w-md gap-2">
                      <Input
                        type="password"
                        value={adminPw}
                        onChange={(e) => setAdminPw(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && loadSettings(adminPw)}
                        placeholder="Admin password"
                        className="h-9"
                      />
                      <Button size="sm" onClick={() => loadSettings(adminPw)} disabled={!adminPw}>
                        Verify
                      </Button>
                    </div>
                  ) : (
                    <>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-[11px]">
                        <span className={settingsView.configured ? "text-[#4ADE80]" : "text-[#FBBF24]"}>
                          {settingsView.configured ? "● CONFIGURED" : "● NO KEY"} ({settingsView.source})
                        </span>
                        {settingsView.maskedKey && <span className="text-muted-foreground">{settingsView.maskedKey}</span>}
                        <span className="text-muted-foreground">{settingsView.baseUrl}</span>
                        <span className="text-muted-foreground">bank: {settingsView.bankId}</span>
                        {settingsView.updatedBy && (
                          <span className="text-muted-foreground">by {settingsView.updatedBy}</span>
                        )}
                      </div>
                      <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
                        <Input
                          value={newKey}
                          onChange={(e) => setNewKey(e.target.value)}
                          placeholder="hsk_…  new API key"
                          className="h-9 font-mono text-xs"
                        />
                        <Button size="sm" onClick={() => void saveKey()} disabled={savingKey || !newKey.trim()}>
                          {savingKey ? "Saving…" : "Save & apply"}
                        </Button>
                      </div>
                      <div className="grid gap-2 sm:grid-cols-2">
                        <Input
                          value={newBaseUrl}
                          onChange={(e) => setNewBaseUrl(e.target.value)}
                          placeholder={settingsView.baseUrl}
                          className="h-9 font-mono text-xs"
                        />
                        <Input
                          value={newBankId}
                          onChange={(e) => setNewBankId(e.target.value)}
                          placeholder={settingsView.bankId}
                          className="h-9 font-mono text-xs"
                        />
                      </div>
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => void clearKey()}
                          disabled={savingKey || settingsView.source !== "admin"}
                          className="font-mono text-[10px] text-red-400 hover:underline disabled:opacity-40 disabled:hover:no-underline"
                        >
                          REMOVE ADMIN KEY (fall back to env)
                        </button>
                        <button
                          onClick={() => void connectBank()}
                          disabled={connecting || !engine?.configured}
                          className="font-mono text-[10px] text-discovery hover:underline disabled:opacity-40 disabled:hover:no-underline"
                        >
                          {connecting ? "CONNECTING…" : "ENSURE BANK NOW"}
                        </button>
                      </div>
                    </>
                  )}
                  {keysMsg && <p className="font-mono text-[10px] text-muted-foreground">{keysMsg}</p>}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="border-border bg-card/70 shadow-none">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Subsystems</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2.5">
            {metrics.map((m) => (
              <div
                key={m.label}
                className="flex items-center justify-between rounded-lg border border-border bg-surface/60 px-3 py-2.5"
              >
                <div className="flex items-center gap-2.5">
                  <ToneDot tone={m.tone} />
                  <span className="text-sm">{m.label}</span>
                </div>
                <div className="text-right">
                  <p className="font-mono text-[11px] text-secondary-foreground">{m.value}</p>
                  <p className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground">{m.status}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border-border bg-card/70 shadow-none">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Memory composition</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex h-3 w-full overflow-hidden rounded-full">
              {[
                { n: MEMORY_COUNTS.episodic, cls: "bg-[#6366F1]" },
                { n: MEMORY_COUNTS.decisions, cls: "bg-[#5865F2]" },
                { n: MEMORY_COUNTS.workflows, cls: "bg-[#22D3EE]" },
                { n: MEMORY_COUNTS.incidents, cls: "bg-[#EF4444]" },
                { n: MEMORY_COUNTS.outcomes, cls: "bg-[#22C55E]" },
                { n: MEMORY_COUNTS.procedural, cls: "bg-[#4A5568]" },
              ].map((seg, i) => (
                <motion.div
                  key={i}
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ delay: i * 0.1, duration: 0.5 }}
                  className={cn("h-full origin-left", seg.cls)}
                  style={{ width: `${(seg.n / MEMORY_COUNTS.total) * 100}%` }}
                />
              ))}
            </div>
            <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2">
              {(
                [
                  ["Episodic", MEMORY_COUNTS.episodic, "memory"],
                  ["Decisions", MEMORY_COUNTS.decisions, "memory"],
                  ["Workflows", MEMORY_COUNTS.workflows, "discovery"],
                  ["Incidents", MEMORY_COUNTS.incidents, "critical"],
                  ["Outcomes", MEMORY_COUNTS.outcomes, "success"],
                  ["Procedural", MEMORY_COUNTS.procedural, "neutral"],
                ] as const
              ).map(([label, count, tone]) => (
                <div key={label} className="flex items-center justify-between">
                  <span className="flex items-center gap-2 font-mono text-[11px] text-muted-foreground">
                    <ToneDot tone={tone} />
                    {label}
                  </span>
                  <span className="font-mono text-[11px] text-secondary-foreground">
                    {count.toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
            <div className="mt-4 border-t border-border pt-3">
              <div className="flex items-center justify-between font-mono text-[10px] text-muted-foreground">
                <span>RETENTION</span>
                <span className="flex items-center gap-1.5 text-[#4ADE80]">
                  <ShieldCheck className="size-3.5" />
                  Unlimited · organization-owned
                </span>
              </div>
              <div className="mt-2 flex items-center justify-between font-mono text-[10px] text-muted-foreground">
                <span>CONSOLIDATION</span>
                <span className="flex items-center gap-1.5 text-[#8B93F8]">
                  <RefreshCw className="size-3" />
                  Nightly sequence re-index
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="rounded-xl border border-border bg-card/50 p-4">
        <SectionLabel className="mb-1.5">A note on the architecture</SectionLabel>
        <p className="text-xs leading-5 text-muted-foreground">
          The Hindsight memory layer runs underneath ShadowOps. You experience the intelligence —
          patterns, workflows, evidence — without ever touching the storage. This page exists so
          operators can verify the loop is healthy:{" "}
          <span className="font-mono text-[11px] text-[#8B93F8]">
            memory → understanding → action → new memory
          </span>
          .
        </p>
      </div>
    </div>
  );
}

function StatusStat({
  label,
  value,
  tone,
  live = false,
}: {
  label: string;
  value: string;
  tone: "success" | "memory" | "neutral";
  live?: boolean;
}) {
  return (
    <div className={cn("rounded-lg border px-3 py-2.5", TONE[tone].border)}>
      <p className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={cn("mt-1 flex items-center gap-1.5 text-sm font-semibold", TONE[tone].text)}>
        {live && <ToneDot tone="success" pulse className="size-1.5" />}
        {value}
      </p>
    </div>
  );
}
