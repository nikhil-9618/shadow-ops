// ShadowOps simulated organizational memory.
// In production this data streams from the Hindsight memory engine.

export type MemoryKind =
  | "episodic"
  | "decision"
  | "workflow"
  | "incident"
  | "outcome"
  | "procedural";

export type MemoryTone = "memory" | "discovery" | "success" | "warning" | "critical" | "neutral";

export interface OrgMemory {
  id: string; // M-1042
  kind: MemoryKind;
  title: string;
  summary: string;
  date: string; // ISO
  actors: string[]; // teams or people
  tags: string[];
  outcome: "approved" | "blocked" | "delayed" | "completed" | "escalated" | "resolved";
  cycleDays: number;
  confidence: number; // 0-100
  related: string[]; // memory ids
  sequence?: string[]; // observed step sequence it contributed to
}

export interface Pattern {
  id: string; // P-01
  name: string;
  description: string;
  frequency: number; // cases
  totalCases: number;
  confidence: number;
  steps: string[];
  sourceCases: string[]; // memory ids
  discoveredAt: string;
}

export interface Workflow {
  id: string; // W-01
  name: string;
  patternId: string;
  steps: string[]; // ordered teams/stages
  avgCycleDays: number;
  successRate: number;
  discoveredAt: string;
  memoryIds: string[];
  dependencies: string[]; // other workflow ids this depends on
  state: "active" | "drifting" | "new";
}

export interface ChatAnswer {
  id: string;
  match: (q: string) => boolean;
  activity: string[];
  headline: string;
  intro: string;
  workflow?: { name: string; steps: string[] };
  patternStats?: { label: string; value: string }[];
  notes: string[];
  patternId?: string;
  workflowId?: string;
  memoryIds: string[];
  confidence: number;
}

export const MEMORY_KIND_META: Record<
  MemoryKind,
  { label: string; tone: MemoryTone }
> = {
  episodic: { label: "Episodic", tone: "memory" },
  decision: { label: "Decisions", tone: "memory" },
  workflow: { label: "Workflows", tone: "discovery" },
  incident: { label: "Incidents", tone: "critical" },
  outcome: { label: "Outcomes", tone: "success" },
  procedural: { label: "Procedural", tone: "neutral" },
};

export const MEMORY_COUNTS = {
  total: 12842,
  episodic: 6421,
  decisions: 1204,
  workflows: 284,
  incidents: 38,
  outcomes: 2891,
  procedural: 2004,
};

export const MEMORY_TIMELINE = [
  { year: "2023", events: 1840 },
  { year: "2024", events: 3126 },
  { year: "2025", events: 4812 },
  { year: "2026", events: 3064 },
];

export const memories: OrgMemory[] = [
  {
    id: "M-1042",
    kind: "episodic",
    title: "Vendor request — Northwind Analytics",
    summary:
      "Procurement received a vendor request for Northwind Analytics. Standard intake form completed; owner assigned within 4 hours.",
    date: "2025-01-14",
    actors: ["Procurement"],
    tags: ["vendor", "intake", "onboarding"],
    outcome: "completed",
    cycleDays: 2,
    confidence: 96,
    related: ["M-1043", "M-1044", "M-1047"],
    sequence: ["Procurement", "Security", "Finance", "Manager", "IT"],
  },
  {
    id: "M-1043",
    kind: "decision",
    title: "Security review approved — medium data class",
    summary:
      "Security approved Northwind Analytics under medium data classification with standard DPA. Review took 5 business days.",
    date: "2025-01-21",
    actors: ["Security"],
    tags: ["vendor", "security", "approval"],
    outcome: "approved",
    cycleDays: 5,
    confidence: 98,
    related: ["M-1042", "M-1088"],
    sequence: ["Security", "Finance"],
  },
  {
    id: "M-1044",
    kind: "decision",
    title: "Finance approved spend under $50k threshold",
    summary:
      "Finance approved the annual contract under the $50k delegation threshold. No CFO sign-off required.",
    date: "2025-01-28",
    actors: ["Finance"],
    tags: ["vendor", "finance", "approval"],
    outcome: "approved",
    cycleDays: 3,
    confidence: 95,
    related: ["M-1043", "M-1045"],
    sequence: ["Finance", "Manager"],
  },
  {
    id: "M-1045",
    kind: "decision",
    title: "Direct manager sign-off recorded",
    summary:
      "Requesting manager approved the purchase as budget owner. Sign-off logged in the procurement system of record.",
    date: "2025-01-30",
    actors: ["Engineering", "Manager"],
    tags: ["vendor", "manager", "sign-off"],
    outcome: "approved",
    cycleDays: 1,
    confidence: 97,
    related: ["M-1044", "M-1046"],
    sequence: ["Manager", "IT"],
  },
  {
    id: "M-1046",
    kind: "outcome",
    title: "Successful onboarding — accounts provisioned",
    summary:
      "IT provisioned SSO, scoped licenses, and completed offboarding checklist setup. Vendor marked onboarded.",
    date: "2025-02-04",
    actors: ["IT"],
    tags: ["vendor", "onboarding", "provisioning"],
    outcome: "completed",
    cycleDays: 4,
    confidence: 99,
    related: ["M-1045", "M-1089"],
  },
  {
    id: "M-1087",
    kind: "episodic",
    title: "Vendor request — Helios Data (repeat vendor)",
    summary:
      "Renewal-driven vendor request for Helios Data. Intake matched the standard vendor template.",
    date: "2025-03-11",
    actors: ["Procurement"],
    tags: ["vendor", "renewal", "intake"],
    outcome: "completed",
    cycleDays: 1,
    confidence: 94,
    related: ["M-1088", "M-1090", "M-1134"],
    sequence: ["Procurement", "Security", "Finance", "Manager", "IT"],
  },
  {
    id: "M-1088",
    kind: "decision",
    title: "Security fast-tracked low-risk vendor",
    summary:
      "Security used the fast-track lane: no customer PII, SOC2 current. Review closed in 2 days instead of 5.",
    date: "2025-03-13",
    actors: ["Security"],
    tags: ["vendor", "security", "fast-track"],
    outcome: "approved",
    cycleDays: 2,
    confidence: 96,
    related: ["M-1087", "M-1135"],
    sequence: ["Security", "Finance"],
  },
  {
    id: "M-1089",
    kind: "outcome",
    title: "Renewal completed ahead of deadline",
    summary:
      "Contract renewed 6 days before expiry. Procurement flagged the renewal window automatically.",
    date: "2025-03-25",
    actors: ["Procurement", "IT"],
    tags: ["vendor", "renewal", "outcome"],
    outcome: "completed",
    cycleDays: 6,
    confidence: 98,
    related: ["M-1088"],
  },
  {
    id: "M-1090",
    kind: "incident",
    title: "Finance blocked — missing cost center",
    summary:
      "Finance returned the request twice: cost center missing on the intake form. Added 4 days of rework.",
    date: "2025-03-17",
    actors: ["Finance", "Procurement"],
    tags: ["vendor", "rework", "blocked"],
    outcome: "delayed",
    cycleDays: 4,
    confidence: 93,
    related: ["M-1087", "M-1189"],
    sequence: ["Finance", "Procurement"],
  },
  {
    id: "M-1134",
    kind: "episodic",
    title: "Vendor request — Statline Research",
    summary:
      "New vendor request entered via the procurement portal. Data classification declared as medium at intake.",
    date: "2025-06-02",
    actors: ["Procurement"],
    tags: ["vendor", "intake"],
    outcome: "completed",
    cycleDays: 2,
    confidence: 95,
    related: ["M-1135", "M-1136", "M-1189"],
    sequence: ["Procurement", "Security", "Finance", "Manager", "IT"],
  },
  {
    id: "M-1135",
    kind: "decision",
    title: "Security review — conditional approval",
    summary:
      "Security approved with conditions: annual re-review and data residency pinned to EU region.",
    date: "2025-06-09",
    actors: ["Security"],
    tags: ["vendor", "security", "conditional"],
    outcome: "approved",
    cycleDays: 5,
    confidence: 92,
    related: ["M-1134", "M-1187"],
    sequence: ["Security", "Finance"],
  },
  {
    id: "M-1136",
    kind: "outcome",
    title: "Onboarding completed — 21 days end to end",
    summary:
      "Full vendor lifecycle completed in 21 days, in line with the observed median of 19 days.",
    date: "2025-06-23",
    actors: ["IT", "Procurement"],
    tags: ["vendor", "outcome", "cycle-time"],
    outcome: "completed",
    cycleDays: 21,
    confidence: 97,
    related: ["M-1135"],
  },
  {
    id: "M-1187",
    kind: "incident",
    title: "Bypass attempt — vendor started before approval",
    summary:
      "Team began pilot before security approval. Caught at invoice review; retroactive approval issued with a policy note.",
    date: "2025-08-12",
    actors: ["Security", "Finance", "Engineering"],
    tags: ["vendor", "policy", "bypass"],
    outcome: "escalated",
    cycleDays: 3,
    confidence: 99,
    related: ["M-1135", "M-1189"],
  },
  {
    id: "M-1189",
    kind: "episodic",
    title: "Vendor request — Coreline Systems",
    summary:
      "High-value vendor request ($120k) entered intake. Escalated to CFO lane per delegation policy.",
    date: "2025-09-30",
    actors: ["Procurement"],
    tags: ["vendor", "high-value", "intake"],
    outcome: "completed",
    cycleDays: 3,
    confidence: 96,
    related: ["M-1190", "M-1044"],
    sequence: ["Procurement", "Security", "Finance", "Manager", "IT"],
  },
  {
    id: "M-1190",
    kind: "decision",
    title: "CFO sign-off for spend above $100k",
    summary:
      "Finance escalated to CFO per the $100k threshold. Approval recorded with board-notification flag.",
    date: "2025-10-08",
    actors: ["Finance", "CFO"],
    tags: ["vendor", "finance", "cfo"],
    outcome: "approved",
    cycleDays: 4,
    confidence: 98,
    related: ["M-1189"],
    sequence: ["Finance", "Manager"],
  },
  {
    id: "M-2101",
    kind: "procedural",
    title: "Q3 access review procedure",
    summary:
      "Quarterly access review executed across 14 systems. 3 orphaned accounts found and revoked within 48 hours.",
    date: "2025-10-15",
    actors: ["Security", "IT"],
    tags: ["access", "review", "compliance"],
    outcome: "completed",
    cycleDays: 6,
    confidence: 95,
    related: ["M-2102", "M-2130"],
    sequence: ["IT", "Security", "Manager"],
  },
  {
    id: "M-2102",
    kind: "decision",
    title: "JML workflow adopted for all contractors",
    summary:
      "Security mandated the joiner-mover-leaver workflow for contractor lifecycle. Manual ticket creation retired.",
    date: "2025-11-04",
    actors: ["Security", "IT", "People Ops"],
    tags: ["access", "jml", "policy"],
    outcome: "approved",
    cycleDays: 2,
    confidence: 97,
    related: ["M-2101", "M-2130"],
    sequence: ["Security", "IT"],
  },
  {
    id: "M-2130",
    kind: "outcome",
    title: "Onboarding time cut from 5 days to 36 hours",
    summary:
      "After JML adoption, new contractor onboarding dropped from 5 days to 36 hours median across 47 hires.",
    date: "2025-12-19",
    actors: ["IT", "People Ops"],
    tags: ["access", "onboarding", "outcome"],
    outcome: "completed",
    cycleDays: 2,
    confidence: 96,
    related: ["M-2102"],
  },
  {
    id: "M-3208",
    kind: "incident",
    title: "Sev-2: vendor API outage affected reporting",
    summary:
      "Northwind Analytics API outage degraded executive dashboards for 6 hours. Failover runbook executed.",
    date: "2026-02-03",
    actors: ["IT", "Data"],
    tags: ["incident", "vendor", "outage"],
    outcome: "resolved",
    cycleDays: 1,
    confidence: 99,
    related: ["M-1046", "M-3210"],
  },
  {
    id: "M-3210",
    kind: "procedural",
    title: "Vendor failure runbook updated",
    summary:
      "Post-incident review added a vendor-availability clause to renewals: 99.5% uptime SLA now required.",
    date: "2026-02-10",
    actors: ["IT", "Procurement", "Security"],
    tags: ["incident", "runbook", "vendor"],
    outcome: "completed",
    cycleDays: 4,
    confidence: 94,
    related: ["M-3208", "M-1089"],
    sequence: ["IT", "Procurement"],
  },
  {
    id: "M-3311",
    kind: "episodic",
    title: "Vendor request — Orion Cloud",
    summary:
      "Infrastructure vendor request with SOC2 and ISO attestations pre-attached. Fast-track criteria met at intake.",
    date: "2026-04-21",
    actors: ["Procurement"],
    tags: ["vendor", "infrastructure", "intake"],
    outcome: "completed",
    cycleDays: 1,
    confidence: 97,
    related: ["M-1088", "M-3312"],
    sequence: ["Procurement", "Security", "Finance", "Manager", "IT"],
  },
  {
    id: "M-3312",
    kind: "decision",
    title: "Parallel review pilot approved",
    summary:
      "Security and Finance agreed to run reviews in parallel for low-risk vendors, cutting cycle time by 4 days.",
    date: "2026-04-28",
    actors: ["Security", "Finance"],
    tags: ["vendor", "process", "improvement"],
    outcome: "approved",
    cycleDays: 2,
    confidence: 91,
    related: ["M-3311", "M-3313"],
    sequence: ["Security", "Finance"],
  },
  {
    id: "M-3313",
    kind: "outcome",
    title: "Fastest vendor onboarding on record — 11 days",
    summary:
      "Parallel review plus pre-attached attestations produced an 11-day lifecycle, 42% faster than median.",
    date: "2026-05-08",
    actors: ["IT", "Procurement"],
    tags: ["vendor", "outcome", "record"],
    outcome: "completed",
    cycleDays: 11,
    confidence: 98,
    related: ["M-3312"],
  },
];

export const patterns: Pattern[] = [
  {
    id: "P-01",
    name: "Vendor Approval Chain",
    description:
      "The dominant sequence for approving and onboarding new vendors across the organization.",
    frequency: 84,
    totalCases: 100,
    confidence: 92,
    steps: ["Procurement", "Security", "Finance", "Manager", "IT"],
    sourceCases: ["M-1042", "M-1087", "M-1134", "M-1189", "M-3311"],
    discoveredAt: "2025-11-02",
  },
  {
    id: "P-02",
    name: "Security Fast-Track",
    description:
      "Low-risk vendors with current attestations skip the full review lane, closing 60% faster.",
    frequency: 31,
    totalCases: 100,
    confidence: 88,
    steps: ["Procurement", "Security (fast-track)", "Finance", "IT"],
    sourceCases: ["M-1088", "M-3311", "M-3312"],
    discoveredAt: "2026-01-18",
  },
  {
    id: "P-03",
    name: "CFO Escalation Lane",
    description:
      "Spend above $100k breaks out of the standard chain into a CFO approval lane before manager sign-off.",
    frequency: 12,
    totalCases: 100,
    confidence: 85,
    steps: ["Procurement", "Security", "Finance → CFO", "Manager", "IT"],
    sourceCases: ["M-1189", "M-1190"],
    discoveredAt: "2026-03-05",
  },
  {
    id: "P-04",
    name: "Access Lifecycle Loop",
    description:
      "Joiner-mover-leaver events follow a recurring IT → Security → Manager review cadence each quarter.",
    frequency: 47,
    totalCases: 60,
    confidence: 90,
    steps: ["IT", "Security", "Manager", "People Ops"],
    sourceCases: ["M-2101", "M-2102", "M-2130"],
    discoveredAt: "2026-02-11",
  },
];

export const workflows: Workflow[] = [
  {
    id: "W-01",
    name: "Vendor Onboarding",
    patternId: "P-01",
    steps: ["Procurement", "Security", "Finance", "Manager", "IT"],
    avgCycleDays: 19,
    successRate: 92,
    discoveredAt: "2025-11-09",
    memoryIds: ["M-1042", "M-1087", "M-1134", "M-1189", "M-3311", "M-1046", "M-3313"],
    dependencies: ["W-02"],
    state: "active",
  },
  {
    id: "W-02",
    name: "Security Review",
    patternId: "P-02",
    steps: ["Intake Triage", "Evidence Check", "Risk Scoring", "Approval Decision"],
    avgCycleDays: 4,
    successRate: 96,
    discoveredAt: "2026-01-25",
    memoryIds: ["M-1088", "M-1135", "M-3312", "M-1043"],
    dependencies: [],
    state: "active",
  },
  {
    id: "W-03",
    name: "Access Lifecycle",
    patternId: "P-04",
    steps: ["Joiner Event", "Role Assignment", "Security Review", "Provisioning", "Quarterly Attest"],
    avgCycleDays: 2,
    successRate: 98,
    discoveredAt: "2026-02-18",
    memoryIds: ["M-2101", "M-2102", "M-2130"],
    dependencies: ["W-02"],
    state: "active",
  },
  {
    id: "W-04",
    name: "High-Value Escalation",
    patternId: "P-03",
    steps: ["Intake", "Value Gate ($100k)", "CFO Lane", "Manager", "IT"],
    avgCycleDays: 26,
    successRate: 89,
    discoveredAt: "2026-03-12",
    memoryIds: ["M-1189", "M-1190", "M-1044"],
    dependencies: ["W-01"],
    state: "new",
  },
];

export const workflowCases = [
  { case: "Case 1042", date: "Jan 2025", status: "matched" },
  { case: "Case 1087", date: "Mar 2025", status: "matched" },
  { case: "Case 1134", date: "Jun 2025", status: "matched" },
  { case: "Case 1189", date: "Sep 2025", status: "variant" },
  { case: "Case 3311", date: "Apr 2026", status: "matched" },
] as const;

export const chatAnswers: ChatAnswer[] = [
  {
    id: "A-01",
    match: (q) => /vendor|approv|procure|onboard/i.test(q),
    activity: [
      "Accessing organizational memory...",
      "18 relevant memories found",
      "7 related historical cases found",
      "Analyzing repeated sequences...",
      "Observed workflow identified",
    ],
    headline: "Based on 100 historical vendor cases, ShadowOps observed this workflow:",
    intro:
      "Most vendor requests follow one dominant sequence. It was not documented anywhere — it is what the organization actually does.",
    workflow: {
      name: "Vendor Onboarding",
      steps: ["Procurement", "Security", "Finance", "Manager", "IT"],
    },
    patternStats: [
      { label: "Cases followed", value: "84 / 100" },
      { label: "Frequency", value: "84%" },
      { label: "Confidence", value: "High (92)" },
      { label: "Median cycle", value: "19 days" },
    ],
    notes: [
      "Spend above $100k breaks into a CFO escalation lane before manager sign-off.",
      "Low-risk vendors with current attestations can run Security and Finance in parallel — recorded 42% faster.",
    ],
    patternId: "P-01",
    workflowId: "W-01",
    memoryIds: ["M-1042", "M-1087", "M-1134", "M-1189", "M-3311"],
    confidence: 92,
  },
  {
    id: "A-02",
    match: (q) => /security|review|risk|fast/i.test(q),
    activity: [
      "Accessing organizational memory...",
      "12 relevant memories found",
      "5 related historical cases found",
      "Analyzing repeated sequences...",
      "Observed workflow identified",
    ],
    headline: "Security reviews split into two lanes — and the fast lane is real:",
    intro:
      "Vendors with current SOC2/ISO attestations and no customer PII consistently bypass the full review. 31 of the last 100 cases closed this way.",
    workflow: {
      name: "Security Review",
      steps: ["Intake Triage", "Evidence Check", "Risk Scoring", "Approval Decision"],
    },
    patternStats: [
      { label: "Fast-track cases", value: "31 / 100" },
      { label: "Full review time", value: "5 days" },
      { label: "Fast-track time", value: "2 days" },
      { label: "Confidence", value: "High (88)" },
    ],
    notes: [
      "Conditional approvals carry an annual re-review clause — track these or they expire silently.",
      "One bypass incident (M-1187) led to a policy note; retroactive approvals are now flagged at invoice review.",
    ],
    patternId: "P-02",
    workflowId: "W-02",
    memoryIds: ["M-1043", "M-1088", "M-1135", "M-1187", "M-3312"],
    confidence: 88,
  },
  {
    id: "A-03",
    match: (q) => /access|onboarding time|joiner|contractor|jml|offboard/i.test(q),
    activity: [
      "Accessing organizational memory...",
      "9 relevant memories found",
      "4 related historical cases found",
      "Analyzing repeated sequences...",
      "Observed workflow identified",
    ],
    headline: "Contractor onboarding moved from 5 days to 36 hours after JML adoption:",
    intro:
      "The joiner-mover-leaver workflow is followed in 47 of 60 lifecycle events since the November decision retired manual tickets.",
    workflow: {
      name: "Access Lifecycle",
      steps: ["Joiner Event", "Role Assignment", "Security Review", "Provisioning", "Quarterly Attest"],
    },
    patternStats: [
      { label: "Adoption", value: "47 / 60 events" },
      { label: "Before", value: "5.0 days median" },
      { label: "After", value: "36 hours median" },
      { label: "Confidence", value: "High (90)" },
    ],
    notes: [
      "Quarterly attestation is the weakest step — 3 orphaned accounts were caught only at review time.",
      "Access reviews now run IT → Security → Manager in a fixed cadence every quarter.",
    ],
    patternId: "P-04",
    workflowId: "W-03",
    memoryIds: ["M-2101", "M-2102", "M-2130"],
    confidence: 90,
  },
];

export const fallbackAnswer: ChatAnswer = {
  id: "A-00",
  match: () => true,
  activity: [
    "Accessing organizational memory...",
    "6 relevant memories found",
    "2 related historical cases found",
    "Analyzing repeated sequences...",
    "Confidence below threshold — showing partial view",
  ],
  headline: "ShadowOps found related memory, but no confident workflow yet:",
  intro:
    "These events do not yet repeat enough to form a discovered workflow. As more cases accumulate, a pattern may emerge.",
  patternStats: [
    { label: "Related memories", value: "6" },
    { label: "Observations", value: "2" },
    { label: "Confidence", value: "Low (41)" },
  ],
  notes: [
    "Ask about vendor approvals, security reviews, or access lifecycle for high-confidence answers.",
  ],
  memoryIds: ["M-3208", "M-3210", "M-1090"],
  confidence: 41,
};

export const recentDiscoveries = [
  {
    id: "D-07",
    title: "Parallel review pilot for low-risk vendors",
    detail: "Security + Finance running in parallel cuts 4 days per case.",
    date: "2h ago",
    tone: "discovery" as const,
  },
  {
    id: "D-06",
    title: "CFO escalation lane confirmed",
    detail: "12 cases above $100k share a distinct approval sequence.",
    date: "1d ago",
    tone: "discovery" as const,
  },
  {
    id: "D-05",
    title: "Quarterly attestation is the bottleneck",
    detail: "3 orphaned accounts found only at review time.",
    date: "2d ago",
    tone: "warning" as const,
  },
  {
    id: "D-04",
    title: "Vendor uptime SLA clause adopted",
    detail: "Renewals now require 99.5% uptime after Sev-2 outage.",
    date: "5d ago",
    tone: "success" as const,
  },
];

export const activityFeed = [
  { time: "09:41", text: "12 new memories ingested from procurement portal", tone: "memory" as const },
  { time: "09:12", text: "Pattern P-02 confidence raised 86 → 88", tone: "discovery" as const },
  { time: "08:57", text: "Workflow W-04 'High-Value Escalation' discovered", tone: "discovery" as const },
  { time: "08:30", text: "Incident memory M-3208 linked to renewal runbook", tone: "warning" as const },
  { time: "07:58", text: "Nightly memory consolidation completed — 1,204 sequences indexed", tone: "memory" as const },
];

export function findAnswer(query: string): ChatAnswer {
  return chatAnswers.find((a) => a.match(query)) ?? fallbackAnswer;
}

export function getMemory(id: string): OrgMemory | undefined {
  return memories.find((m) => m.id === id);
}

export function getPattern(id: string): Pattern | undefined {
  return patterns.find((p) => p.id === id);
}

export function getWorkflow(id: string): Workflow | undefined {
  return workflows.find((w) => w.id === id);
}

export function relatedMemories(m: OrgMemory): OrgMemory[] {
  return m.related.map((id) => getMemory(id)).filter((x): x is OrgMemory => Boolean(x));
}
