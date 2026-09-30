import { PageHeader } from "@/components/shadowops/AppShell";
import { SectionLabel, ToneDot } from "@/components/shadowops/primitives";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import { useMutation } from "convex/react";
import { FileClock, Loader2, Lock, ShieldCheck, ShieldX } from "lucide-react";
import { useState } from "react";

/**
 * Client-side mirror of the server allowlist (ADMIN_EMAILS env var on the
 * deployment). Used only to decide whether to reveal the Audit nav entry —
 * the server re-checks everything.
 */
export const ADMIN_EMAILS = [
  "nsnehithreddy@gmail.com",
  "nikhil1231177@gmail.com",
  "team.devhacks@gmail.com",
  "shaikshaheerah@gmail.com",
  "nandinirao725@gmail.com",
];

export function isAdminEmail(email?: string | null): boolean {
  return !!email && ADMIN_EMAILS.includes(email.toLowerCase());
}

interface AuditRow {
  id: string;
  email: string;
  success: boolean;
  method: string;
  detail?: string;
  at: number;
}

interface AuditSummary {
  total: number;
  successful: number;
  failed: number;
  uniqueUsers: number;
  lastLoginAt?: number;
}

function fmtTime(ts: number): string {
  return new Date(ts).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export default function Audit() {
  const { user } = useAuth();
  const admin = isAdminEmail(user?.email);
  const auditAccess = useMutation(api.audit.auditAccess);

  const [password, setPassword] = useState("");
  const [rows, setRows] = useState<AuditRow[] | null>(null);
  const [summary, setSummary] = useState<AuditSummary | null>(null);
  const [deniedReason, setDeniedReason] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);

  const unlock = async () => {
    if (!password) return;
    setChecking(true);
    setDeniedReason(null);
    try {
      const res = await auditAccess({ password });
      if (res.allowed && res.rows && res.summary) {
        setRows(res.rows);
        setSummary(res.summary);
      } else {
        setDeniedReason(
          res.reason === "password"
            ? "Incorrect admin password."
            : res.reason === "email"
              ? "This account is not on the admin allowlist."
              : "Authentication required.",
        );
      }
    } catch {
      setDeniedReason("Could not reach the audit service.");
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 px-4 py-8 sm:px-6">
      <PageHeader
        eyebrow="Restricted access"
        title="Login audit"
        description="Every sign-in attempt is recorded. This log is only visible to platform administrators."
      />

      {!admin ? (
        <Card className="border-destructive/30 bg-card/70 shadow-none">
          <CardContent className="flex items-center gap-3 py-6">
            <ShieldX className="size-5 text-destructive" />
            <div>
              <p className="text-sm font-semibold">Admin access required</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {user?.email
                  ? `Signed in as ${user.email} — this account is not on the admin allowlist.`
                  : "Sign in with an administrator account to view the audit trail."}
              </p>
            </div>
          </CardContent>
        </Card>
      ) : !rows ? (
        <Card className="border-border bg-card/70 shadow-none">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Lock className="size-4 text-discovery" /> Admin verification
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2 rounded-lg border border-[#22C55E]/25 bg-[#22C55E]/10 px-3 py-2">
              <ShieldCheck className="size-4 text-[#4ADE80]" />
              <span className="text-xs text-[#4ADE80]">{user?.email} is an administrator</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Enter the admin panel password to open the login audit.
            </p>
            <div className="flex max-w-md gap-2">
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && void unlock()}
                placeholder="Admin password"
                className="h-10"
              />
              <Button onClick={() => void unlock()} disabled={checking || !password}>
                {checking ? <Loader2 className="size-4 animate-spin" /> : "Unlock"}
              </Button>
            </div>
            {deniedReason && (
              <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-red-400">
                {deniedReason}
              </p>
            )}
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: "Total events", value: summary!.total },
              { label: "Successful", value: summary!.successful },
              { label: "Failed", value: summary!.failed },
              { label: "Unique users", value: summary!.uniqueUsers },
            ].map((s) => (
              <Card key={s.label} className="border-border bg-card/70 shadow-none">
                <CardContent className="py-4">
                  <p className="font-mono text-2xl font-bold text-foreground">{s.value}</p>
                  <p className="mt-0.5 font-mono text-[9px] uppercase tracking-[0.18em] text-muted-foreground">
                    {s.label}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card className="border-border bg-card/70 shadow-none">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center justify-between text-base">
                <span className="flex items-center gap-2">
                  <FileClock className="size-4 text-discovery" /> Sign-in events
                </span>
                <span className="font-mono text-[10px] text-muted-foreground">
                  {summary!.lastLoginAt ? `LAST ${fmtTime(summary!.lastLoginAt)}` : "NO EVENTS"}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {rows.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">No login events recorded yet.</p>
              ) : (
                <div className="overflow-hidden rounded-lg border border-border">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-border bg-surface/80 font-mono text-[9px] uppercase tracking-[0.16em] text-muted-foreground">
                        <th className="px-3 py-2">When</th>
                        <th className="px-3 py-2">Email</th>
                        <th className="px-3 py-2">Result</th>
                        <th className="px-3 py-2">Method</th>
                        <th className="hidden px-3 py-2 md:table-cell">Detail</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((r) => (
                        <tr key={r.id} className="border-b border-border/50 last:border-0">
                          <td className="whitespace-nowrap px-3 py-2 font-mono text-[11px] text-muted-foreground">
                            {fmtTime(r.at)}
                          </td>
                          <td className="px-3 py-2 font-medium">{r.email}</td>
                          <td className="px-3 py-2">
                            <span className="inline-flex items-center gap-1.5">
                              <ToneDot tone={r.success ? "success" : "critical"} />
                              <span className={r.success ? "text-[#4ADE80]" : "text-red-400"}>
                                {r.success ? "SUCCESS" : "FAILED"}
                              </span>
                            </span>
                          </td>
                          <td className="px-3 py-2 font-mono text-[11px] text-muted-foreground">{r.method}</td>
                          <td className="hidden max-w-[280px] truncate px-3 py-2 text-muted-foreground md:table-cell">
                            {r.detail ?? "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <p className="mt-3 font-mono text-[10px] text-muted-foreground">
                SHOWING {Math.min(rows.length, 300)} MOST RECENT EVENTS
              </p>
            </CardContent>
          </Card>
        </>
      )}

      <SectionLabel className="block pt-2">
        Audit events are append-only and cannot be edited from the client.
      </SectionLabel>
      <span className={cn("hidden")} aria-hidden />
    </div>
  );
}
