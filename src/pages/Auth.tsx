import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InputOTP, InputOTPGroup, InputOTPSlot, InputOTPSeparator } from "@/components/ui/input-otp";
import { ShadowLogo } from "@/components/shadowops/ShadowLogo";
import { LoginScene, type FocusMode, type HoverInfo } from "@/components/shadowops3d/LoginScene";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, Loader2, Lock, Mail, MailCheck, RefreshCw, ShieldCheck } from "lucide-react";
import { Suspense, lazy, useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { useLiveMemoryCount, formatMemoryCount } from "@/lib/memory-count";
import { api } from "@/convex/_generated/api";
import { useMutation } from "convex/react";

interface AuthProps {
  redirectAfterAuth?: string;
}

function resolveRedirectAfterAuth(returnTo: string | null, fallback = "/dashboard") {
  if (returnTo?.startsWith("/") && !returnTo.startsWith("//")) {
    return returnTo;
  }
  return fallback;
}

const LoginSceneLazy = lazy(() =>
  import("@/components/shadowops3d/LoginScene").then((m) => ({ default: m.LoginScene })),
);

const STATUS = {
  online: { label: "MEMORY SYSTEM ONLINE", dot: "bg-[#22C55E]", text: "text-[#4ADE80]" },
  offline: { label: "MEMORY SYSTEM OFFLINE", dot: "bg-[#EF4444]", text: "text-[#F87171]" },
};

const RESEND_COOLDOWN_S = 30;

export default function AuthPage(props: AuthProps) {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <Auth {...props} />
    </Suspense>
  );
}

function Auth({ redirectAfterAuth }: AuthProps) {
  const { isLoading: authLoading, isAuthenticated, signIn } = useAuth();
  const memoryCount = useLiveMemoryCount();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirect = resolveRedirectAfterAuth(searchParams.get("returnTo"), redirectAfterAuth);

  // Login mode: customers sign in with email OTP, admins with email + password.
  const [mode, setMode] = useState<"customer" | "admin">("customer");
  const [adminPassword, setAdminPassword] = useState("");
  // OTP flow: ask for email, then verify the one-time code.
  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [resendIn, setResendIn] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [focusMode, setFocusMode] = useState<FocusMode>("idle");
  const [authStage, setAuthStage] = useState(0);
  const [hover, setHover] = useState<HoverInfo | null>(null);
  const [webglOk, setWebglOk] = useState(true);
  const [reducedMotion] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  const busy = sending || verifying || focusMode === "authenticating";
  const webglChecked = useRef(false);
  const otpWrapRef = useRef<HTMLDivElement>(null);
  const recordLogin = useMutation(api.audit.recordLogin);

  useEffect(() => {
    if (!authLoading && isAuthenticated) navigate(redirect);
  }, [authLoading, isAuthenticated, navigate, redirect]);

  useEffect(() => {
    if (webglChecked.current) return;
    webglChecked.current = true;
    try {
      const c = document.createElement("canvas");
      setWebglOk(Boolean(c.getContext("webgl2") ?? c.getContext("webgl")));
    } catch {
      setWebglOk(false);
    }
  }, []);

  // Resend countdown
  useEffect(() => {
    if (resendIn <= 0) return;
    const t = window.setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => window.clearTimeout(t);
  }, [resendIn]);

  // Focus the OTP input when the code step mounts
  useEffect(() => {
    if (step !== "code") return;
    const input = otpWrapRef.current?.querySelector("input");
    input?.focus();
  }, [step]);

  /** Sends a 6-digit one-time code to the given email. */
  const sendCode = async (resend = false) => {
    if (busy) return;
    setError(null);
    setSending(true);
    setFocusMode("authenticating");
    setAuthStage(1);
    try {
      await signIn("email-otp", { email: email.trim() });
      setStep("code");
      setCode("");
      setResendIn(RESEND_COOLDOWN_S);
      setAuthStage(0);
      setFocusMode("idle");
    } catch (e) {
      setAuthStage(0);
      setFocusMode("idle");
      void recordLogin({
        email: email.trim(),
        success: false,
        method: "email-otp",
        detail: `Code send failed: ${e instanceof Error ? e.message.slice(0, 160) : "unknown error"}`,
      }).catch(() => {});
      setError(
        e instanceof Error
          ? friendlyError(e.message, "We couldn't send the code. Please try again.")
          : "We couldn't send the code. Please try again.",
      );
      if (resend) setResendIn(0);
    } finally {
      setSending(false);
    }
  };

  /** Verifies the code and completes sign-in. */
  const verifyCode = async () => {
    if (busy || code.length !== 6) return;
    setError(null);
    setVerifying(true);
    setFocusMode("authenticating");
    try {
      // signIn resolves to { signingIn: boolean } (or throws on rejection) —
      // a resolved promise with signingIn: true means tokens were issued.
      const result = (await signIn("email-otp", { email: email.trim(), code })) as
        | { signingIn?: boolean }
        | null;
      if (!result?.signingIn) {
        // Server did not issue a session — treat as a failed verification.
        throw new Error("Could not verify code");
      }
      void recordLogin({ email: email.trim(), success: true, method: "email-otp", detail: "Signed in via email OTP" }).catch(() => {});
      setAuthStage(2);
      await new Promise((r) => window.setTimeout(r, 900));
      setAuthStage(3);
      await new Promise((r) => window.setTimeout(r, 1000));
      navigate(redirect);
    } catch (e) {
      void recordLogin({
        email: email.trim(),
        success: false,
        method: "email-otp",
        detail: `Code verification failed: ${e instanceof Error ? e.message.slice(0, 160) : "invalid code"}`,
      }).catch(() => {});
      setFocusMode("idle");
      setError(
        e instanceof Error
          ? friendlyError(e.message, "Invalid or expired code. Please try again.")
          : "Invalid or expired code. Please try again.",
      );
    } finally {
      setVerifying(false);
    }
  };

  /** Admin sign-in: allowlisted email + shared admin password. */
  const adminSignIn = async () => {
    if (busy || !email.trim() || !adminPassword) return;
    setError(null);
    setVerifying(true);
    setFocusMode("authenticating");
    setAuthStage(1);
    try {
      await signIn("admin-password", { email: email.trim(), password: adminPassword });
      void recordLogin({ email: email.trim(), success: true, method: "admin-password", detail: "Admin signed in with password" }).catch(() => {});
      setAuthStage(2);
      await new Promise((r) => window.setTimeout(r, 900));
      setAuthStage(3);
      await new Promise((r) => window.setTimeout(r, 1000));
      navigate(redirect);
    } catch (e) {
      setAuthStage(0);
      setFocusMode("idle");
      void recordLogin({
        email: email.trim(),
        success: false,
        method: "admin-password",
        detail: `Admin sign-in failed: ${e instanceof Error ? e.message.slice(0, 160) : "invalid credentials"}`,
      }).catch(() => {});
      setError("Invalid admin email or password.");
    } finally {
      setVerifying(false);
    }
  };

  const switchMode = (next: "customer" | "admin") => {
    setMode(next);
    setStep("email");
    setCode("");
    setAdminPassword("");
    setError(null);
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-background text-foreground">
      {/* 3D gateway (with graceful fallback) */}
      {webglOk ? (
        <div className="absolute inset-0" aria-hidden>
          <LoginSceneLazy
            focus={focusMode}
            authStage={authStage}
            onHover={setHover}
            reducedMotion={reducedMotion}
          />
        </div>
      ) : (
        <div className="absolute inset-0 so-grid-bg" aria-hidden />
      )}
      {/* vignette to keep the card readable */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 60% 70% at 62% 50%, rgba(8,11,18,0.55) 0%, rgba(8,11,18,0.12) 55%, rgba(8,11,18,0.6) 100%)",
        }}
        aria-hidden
      />

      {/* status HUD */}
      <div className="absolute right-5 top-5 z-20 flex items-center gap-2 rounded-full border border-[#202938] bg-[#0D111A]/85 px-3.5 py-1.5 backdrop-blur-md">
        <span className={`size-2 rounded-full ${STATUS.online.dot} so-pulse`} />
        <span className={`font-mono text-[10px] tracking-[0.18em] ${STATUS.online.text}`}>
          {STATUS.online.label}
        </span>
      </div>

      {/* live memory HUD */}
      <div className="absolute left-5 top-5 z-20 hidden rounded-xl border border-[#202938] bg-[#0D111A]/85 px-4 py-3 backdrop-blur-md md:block">
        <p className="font-mono text-[9px] tracking-[0.22em] text-[#8A94A8]">ORGANIZATIONAL MEMORY</p>
        <div className="mt-2 space-y-1.5">
          {[
            { v: formatMemoryCount(memoryCount), k: "MEMORIES" },
            { v: "1,284", k: "RELATIONSHIPS" },
            { v: "87", k: "WORKFLOWS" },
          ].map((s) => (
            <div key={s.k} className="flex items-baseline gap-2">
              <span className="font-mono text-sm font-bold text-[#F8FAFC]">{s.v}</span>
              <span className="font-mono text-[9px] tracking-[0.16em] text-[#8A94A8]">{s.k}</span>
            </div>
          ))}
        </div>
      </div>

      {/* hover info card */}
      <AnimatePresence>
        {hover && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="pointer-events-none fixed z-30 max-w-[240px] rounded-lg border border-[#26314A] bg-[#0D111A]/95 p-3 shadow-xl backdrop-blur-md"
            style={{ left: Math.min(hover.x + 14, window.innerWidth - 260), top: hover.y + 14 }}
          >
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-discovery">{hover.kind}</p>
            <p className="mt-1 text-xs font-semibold leading-snug text-foreground">{hover.title}</p>
            <div className="mt-1.5 space-y-0.5">
              {hover.lines.map((l) => (
                <p key={l} className="font-mono text-[10px] leading-4 text-muted-foreground">
                  {l}
                </p>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* login card — right of center */}
      <div className="relative z-10 flex min-h-screen items-center justify-center px-4 py-10 lg:justify-end lg:pr-[9vw]">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: authStage >= 2 ? 0.35 : 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="w-full max-w-[420px] rounded-2xl border border-[#26314A]/80 bg-[#0D111A]/78 p-7 shadow-[0_24px_80px_rgb(3_6_12_/_0.6)] backdrop-blur-2xl sm:p-8"
        >
          {/* wordmark — crisp HTML text + official glyph */}
          <div className="flex items-center gap-3">
            <ShadowLogo variant="mark" className="h-11 w-11 shrink-0" />
            <div className="leading-none">
              <p className="text-[22px] font-extrabold tracking-tight text-[#F8FAFC]">
                Shadow<span className="so-gradient-text">Ops</span>
              </p>
              <p className="mt-1 font-mono text-[9px] tracking-[0.3em] text-[#8A94A8]">
                WORKFLOW THROUGH MEMORY
              </p>
            </div>
          </div>

          {/* login mode switcher — customer (OTP) vs admin (password) */}
          <div className="mt-6 grid grid-cols-2 gap-1 rounded-xl border border-[#26314A] bg-[#080B12]/70 p-1">
            {([
              { key: "customer", label: "Customer", icon: Mail },
              { key: "admin", label: "Admin", icon: ShieldCheck },
            ] as const).map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => switchMode(t.key)}
                className={
                  "flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition-all " +
                  (mode === t.key
                    ? t.key === "admin"
                      ? "bg-[#22D3EE]/15 text-[#7DEBFC] shadow-inner"
                      : "bg-[#5865F2]/20 text-[#A5AEFF] shadow-inner"
                    : "text-[#8A94A8] hover:text-[#C9D3E8]")
                }
              >
                <t.icon className="size-3.5" />
                {t.label.toUpperCase()}
              </button>
            ))}
          </div>

          {mode === "admin" ? (
            <motion.div
              key="admin-mode"
              initial={{ opacity: 0, x: 14 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -14 }}
              transition={{ duration: 0.22 }}
            >
              <h1 className="mt-7 text-xl font-bold text-[#F8FAFC]">Admin access</h1>
              <p className="mt-1 text-sm leading-6 text-[#94A3B8]">
                Restricted to platform administrators. Password required.
              </p>
              <form
                className="mt-6 space-y-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  void adminSignIn();
                }}
              >
                <div>
                  <label htmlFor="admin-email" className="mb-1.5 block font-mono text-[10px] tracking-[0.18em] text-[#8A94A8]">
                    ADMIN EMAIL
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#8A94A8]" />
                    <Input
                      id="admin-email"
                      type="email"
                      autoComplete="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      onFocus={() => setFocusMode("email")}
                      onBlur={() => setFocusMode("idle")}
                      placeholder="admin@shadowops.com"
                      className="h-11 border-[#26314A] bg-[#080B12]/60 pl-9 text-sm focus-visible:border-[#22D3EE] focus-visible:ring-[#22D3EE]/25"
                    />
                  </div>
                </div>
                <div>
                  <label htmlFor="admin-password" className="mb-1.5 block font-mono text-[10px] tracking-[0.18em] text-[#8A94A8]">
                    ADMIN PASSWORD
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#8A94A8]" />
                    <Input
                      id="admin-password"
                      type="password"
                      autoComplete="current-password"
                      required
                      value={adminPassword}
                      onChange={(e) => setAdminPassword(e.target.value)}
                      onFocus={() => setFocusMode("password")}
                      onBlur={() => setFocusMode("idle")}
                      placeholder="••••••••••••"
                      className="h-11 border-[#26314A] bg-[#080B12]/60 pl-9 text-sm focus-visible:border-[#22D3EE] focus-visible:ring-[#22D3EE]/25"
                    />
                  </div>
                </div>
                {error && (
                  <p className="rounded-lg border border-[#EF4444]/30 bg-[#EF4444]/10 px-3 py-2 text-xs text-[#F87171]" role="alert">
                    {error}
                  </p>
                )}
                <Button
                  type="submit"
                  disabled={busy || !email.trim() || !adminPassword}
                  className="h-11 w-full bg-[#22D3EE] text-sm font-semibold tracking-wide text-[#06222B] hover:bg-[#22D3EE]/85"
                >
                  {verifying ? (
                    <>
                      <Loader2 className="size-4 animate-spin" /> AUTHENTICATING…
                    </>
                  ) : (
                    "ADMIN SIGN IN"
                  )}
                </Button>
              </form>
            </motion.div>
          ) : (
          <AnimatePresence mode="wait" initial={false}>
            {step === "email" ? (
              <motion.div
                key="email-step"
                initial={{ opacity: 0, x: -14 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -14 }}
                transition={{ duration: 0.22 }}
              >
                <h1 className="mt-7 text-xl font-bold text-[#F8FAFC]">Welcome back</h1>
                <p className="mt-1 text-sm leading-6 text-[#94A3B8]">
                  Enter your work email and we'll send you a one-time code. No password needed.
                </p>

                <form
                  className="mt-6 space-y-4"
                  onSubmit={(e) => {
                    e.preventDefault();
                    void sendCode();
                  }}
                >
                  <div>
                    <label htmlFor="email" className="mb-1.5 block font-mono text-[10px] tracking-[0.18em] text-[#8A94A8]">
                      WORK EMAIL
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#8A94A8]" />
                      <Input
                        id="email"
                        type="email"
                        autoComplete="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        onFocus={() => setFocusMode("email")}
                        onBlur={() => setFocusMode("idle")}
                        placeholder="you@company.com"
                        className="h-11 border-[#26314A] bg-[#080B12]/60 pl-9 text-sm focus-visible:border-[#5865F2] focus-visible:ring-[#5865F2]/25"
                      />
                    </div>
                  </div>

                  {error && (
                    <p className="rounded-lg border border-[#EF4444]/30 bg-[#EF4444]/10 px-3 py-2 text-xs text-[#F87171]" role="alert">
                      {error}
                    </p>
                  )}

                  <Button
                    type="submit"
                    disabled={busy || !email.trim()}
                    className="h-11 w-full bg-[#5865F2] text-sm font-semibold tracking-wide text-white hover:bg-[#5865F2]/90"
                  >
                    {sending ? (
                      <>
                        <Loader2 className="size-4 animate-spin" /> SENDING CODE…
                      </>
                    ) : (
                      "SEND CODE"
                    )}
                  </Button>
                </form>
              </motion.div>
            ) : (
              <motion.div
                key="code-step"
                initial={{ opacity: 0, x: 14 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 14 }}
                transition={{ duration: 0.22 }}
              >
                <div className="mt-7 flex size-11 items-center justify-center rounded-xl border border-[#22D3EE]/30 bg-[#22D3EE]/10">
                  <MailCheck className="size-5 text-[#22D3EE]" />
                </div>
                <h1 className="mt-4 text-xl font-bold text-[#F8FAFC]">Check your inbox</h1>
                <p className="mt-1 text-sm leading-6 text-[#94A3B8]">
                  We sent a 6-digit code to <span className="font-medium text-[#F8FAFC]">{email.trim()}</span>.
                </p>

                <div
                  className="mt-6 space-y-4"
                  ref={otpWrapRef}
                  onFocus={() => setFocusMode("email")}
                  onBlur={() => setFocusMode("idle")}
                >
                  <InputOTP
                    maxLength={6}
                    value={code}
                    onChange={setCode}
                    disabled={busy}
                    containerClassName="justify-between"
                    autoFocus
                  >
                    <InputOTPGroup>
                      <InputOTPSlot index={0} className="h-12 w-10 rounded-md border border-[#26314A] text-base font-mono" />
                      <InputOTPSlot index={1} className="h-12 w-10 rounded-md border border-[#26314A] text-base font-mono" />
                      <InputOTPSlot index={2} className="h-12 w-10 rounded-md border border-[#26314A] text-base font-mono" />
                    </InputOTPGroup>
                    <InputOTPSeparator />
                    <InputOTPGroup>
                      <InputOTPSlot index={3} className="h-12 w-10 rounded-md border border-[#26314A] text-base font-mono" />
                      <InputOTPSlot index={4} className="h-12 w-10 rounded-md border border-[#26314A] text-base font-mono" />
                      <InputOTPSlot index={5} className="h-12 w-10 rounded-md border border-[#26314A] text-base font-mono" />
                    </InputOTPGroup>
                  </InputOTP>

                  {error && (
                    <p className="rounded-lg border border-[#EF4444]/30 bg-[#EF4444]/10 px-3 py-2 text-xs text-[#F87171]" role="alert">
                      {error}
                    </p>
                  )}

                  <Button
                    type="button"
                    onClick={() => void verifyCode()}
                    disabled={busy || code.length !== 6}
                    className="h-11 w-full bg-[#5865F2] text-sm font-semibold tracking-wide text-white hover:bg-[#5865F2]/90"
                  >
                    {verifying ? (
                      <>
                        <Loader2 className="size-4 animate-spin" /> VERIFYING…
                      </>
                    ) : (
                      "VERIFY CODE"
                    )}
                  </Button>

                  <div className="flex items-center justify-between text-xs">
                    <button
                      type="button"
                      onClick={() => {
                        setStep("email");
                        setCode("");
                        setError(null);
                      }}
                      className="flex items-center gap-1.5 text-[#94A3B8] hover:text-foreground"
                      disabled={busy}
                    >
                      <ArrowLeft className="size-3.5" /> Change email
                    </button>
                    <button
                      type="button"
                      onClick={() => void sendCode(true)}
                      disabled={busy || resendIn > 0}
                      className="flex items-center gap-1.5 font-mono text-discovery disabled:opacity-50 disabled:hover:no-underline hover:underline"
                    >
                      <RefreshCw className={`size-3.5 ${sending ? "animate-spin" : ""}`} />
                      {resendIn > 0 ? `RESEND IN ${resendIn}s` : "RESEND CODE"}
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          )}

          {mode === "customer" && (
            <p className="mt-5 text-center font-mono text-[10px] leading-5 text-[#8A94A8]">
              VERIFIED EMAIL REQUIRED · NO GUEST ACCESS
            </p>
          )}

          <div className="mt-6 flex items-center justify-center gap-2 border-t border-[#202938] pt-4">
            <span className="size-1.5 rounded-full bg-[#22C55E] so-pulse" />
            <span className="font-mono text-[9px] tracking-[0.2em] text-[#8A94A8]">
              MEMORY ENGINE ONLINE
            </span>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

/** Map raw Convex auth errors to short, human-friendly messages. */
function friendlyError(raw: string, fallback: string): string {
  const msg = raw.toLowerCase();
  if (msg.includes("provider") && msg.includes("not configured")) {
    return "Sign-in method unavailable. Please try the demo mode.";
  }
  if (msg.includes("rate limit") || msg.includes("too many")) {
    return "Too many attempts. Please wait a moment and try again.";
  }
  if (msg.includes("invalid") || msg.includes("could not verify")) {
    return "Invalid or expired code. Please try again.";
  }
  if (msg.includes("email")) {
    return "We couldn't deliver the code to that email. Please check it and try again.";
  }
  return fallback;
}
