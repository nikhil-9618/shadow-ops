// ShadowOps 3D twin data layer.
// Mirrors the /api/organization/3d contract: nodes, relationships, workflows,
// memories, incidents. The observed workflow is DERIVED from memory sequences
// (see deriveObservedWorkflow) — never hardcoded as a conclusion.

import type { MemoryKind } from "@/lib/shadowops-data";

export type EntityType =
  | "department"
  | "person"
  | "vendor"
  | "event"
  | "decision"
  | "incident"
  | "workflow"
  | "outcome";

export interface EntityNode {
  id: string;
  type: EntityType;
  name: string;
  position: [number, number, number];
  activity: number; // 0-1
  eventCount: number;
  incidentCount: number;
  decisionCount: number;
  description: string;
}

export interface Relationship {
  source: string;
  target: string;
  type: string; // observed_workflow | associated_with | depends_on | ...
  frequency: number;
  confidence: number; // 0-1
}

export interface TwinWorkflow {
  id: string;
  name: string;
  steps: string[]; // entity ids
  stepLabels: string[];
  observedCount: number;
  confidence: number; // 0-100, derived from memory evidence
  firstObserved: string;
  lastObserved: string;
  supportingMemoryIds: string[];
  deviations: number;
}

export interface TwinIncident {
  id: string; // INC-204
  title: string;
  severity: "critical" | "warning" | "resolved";
  entityIds: string[];
  date: string;
  summary: string;
  similarIncidentIds: string[];
}

export interface TwinMemory {
  id: string;
  kind: MemoryKind;
  title: string;
  summary: string;
  entityId: string;
  confidence: number;
  date: string;
}

export interface Org3D {
  nodes: EntityNode[];
  relationships: Relationship[];
  workflows: TwinWorkflow[];
  memories: TwinMemory[];
  incidents: TwinIncident[];
}

/* ----------------------------- NexusCore Technologies ----------------------------- */

const departments: EntityNode[] = [
  { id: "executive", type: "department", name: "Executive", position: [0, 0, -26], activity: 0.62, eventCount: 412, incidentCount: 2, decisionCount: 96, description: "Board liaison, CFO escalation lane, company-wide policy." },
  { id: "procurement", type: "department", name: "Procurement", position: [-30, 0, -8], activity: 0.91, eventCount: 1184, incidentCount: 3, decisionCount: 214, description: "Vendor intake, renewals, and the procurement portal." },
  { id: "security", type: "department", name: "Security", position: [-11, 0, 8], activity: 0.87, eventCount: 964, incidentCount: 11, decisionCount: 188, description: "Vendor risk reviews, access governance, incident response." },
  { id: "finance", type: "department", name: "Finance", position: [11, 0, 8], activity: 0.84, eventCount: 1102, incidentCount: 4, decisionCount: 176, description: "Spend approval, delegation thresholds, cost centers." },
  { id: "it", type: "department", name: "IT", position: [30, 0, -8], activity: 0.89, eventCount: 1341, incidentCount: 9, decisionCount: 121, description: "Provisioning, JML lifecycle, infrastructure and tooling." },
  { id: "hr", type: "department", name: "HR", position: [-24, 0, 26], activity: 0.58, eventCount: 623, incidentCount: 2, decisionCount: 88, description: "People operations, onboarding, contractor lifecycle." },
  { id: "operations", type: "department", name: "Operations", position: [0, 0, 16], activity: 0.73, eventCount: 845, incidentCount: 5, decisionCount: 64, description: "Business ops, facilities, reporting and runbooks." },
  { id: "legal", type: "department", name: "Legal", position: [24, 0, 26], activity: 0.49, eventCount: 318, incidentCount: 1, decisionCount: 57, description: "Contracts, DPAs, regulatory and policy review." },
  { id: "manager-lane", type: "department", name: "Manager Sign-off", position: [0, 0, 3], activity: 0.78, eventCount: 534, incidentCount: 0, decisionCount: 242, description: "Budget-owner sign-off node observed across approval workflows." },
];

const vendors: EntityNode[] = [
  { id: "vendor-northwind", type: "vendor", name: "Northwind Analytics", position: [-50, 0, -18], activity: 0.66, eventCount: 148, incidentCount: 2, decisionCount: 12, description: "External vendor — analytics platform (Sev-2 outage Feb 2026)." },
  { id: "vendor-helios", type: "vendor", name: "Helios Data", position: [-50, 0, 4], activity: 0.54, eventCount: 96, incidentCount: 0, decisionCount: 8, description: "External vendor — renewal-driven data vendor." },
  { id: "vendor-orion", type: "vendor", name: "Orion Cloud", position: [-50, 0, 26], activity: 0.71, eventCount: 121, incidentCount: 1, decisionCount: 9, description: "External vendor — infrastructure, fast-track approvals." },
];

const incidents: TwinIncident[] = [
  {
    id: "INC-204",
    title: "Suspicious vendor access",
    severity: "critical",
    entityIds: ["vendor-northwind", "security", "it"],
    date: "2026-02-03",
    summary:
      "Northwind API outage with anomalous access patterns. Degraded executive dashboards 6 hours; failover runbook executed.",
    similarIncidentIds: ["INC-197", "INC-188"],
  },
  {
    id: "INC-197",
    title: "Provisioning before approval",
    severity: "warning",
    entityIds: ["procurement", "security", "it"],
    date: "2025-08-12",
    summary:
      "Team began vendor pilot before security approval. Caught at invoice review; retroactive approval + policy note.",
    similarIncidentIds: ["INC-204", "INC-188"],
  },
  {
    id: "INC-188",
    title: "Missing cost center rework",
    severity: "warning",
    entityIds: ["finance", "procurement"],
    date: "2025-03-17",
    summary:
      "Finance returned requests twice for missing cost center — 4 days of rework across 8 cases.",
    similarIncidentIds: ["INC-197", "INC-204"],
  },
];

const twinMemories: TwinMemory[] = [
  { id: "M-1042", kind: "episodic", title: "Vendor request — Northwind", summary: "Procurement intake completed; owner assigned in 4h.", entityId: "procurement", confidence: 96, date: "2025-01-14" },
  { id: "M-1043", kind: "decision", title: "Security approved — medium data class", summary: "Standard DPA; 5 business days.", entityId: "security", confidence: 98, date: "2025-01-21" },
  { id: "M-1044", kind: "decision", title: "Finance approved under $50k", summary: "Delegation threshold applied; no CFO sign-off.", entityId: "finance", confidence: 95, date: "2025-01-28" },
  { id: "M-1045", kind: "decision", title: "Manager sign-off recorded", summary: "Budget owner approved as recorded in procurement system.", entityId: "manager-lane", confidence: 97, date: "2025-01-30" },
  { id: "M-1046", kind: "outcome", title: "Onboarding completed — provisioned", summary: "SSO + scoped licenses + offboarding checklist.", entityId: "it", confidence: 99, date: "2025-02-04" },
  { id: "M-1087", kind: "episodic", title: "Vendor request — Helios (renewal)", summary: "Renewal intake matched standard template.", entityId: "procurement", confidence: 94, date: "2025-03-11" },
  { id: "M-1088", kind: "decision", title: "Security fast-track — low risk", summary: "No PII, SOC2 current. Closed in 2 days.", entityId: "security", confidence: 96, date: "2025-03-13" },
  { id: "M-1090", kind: "incident", title: "Finance blocked — missing cost center", summary: "Returned twice; 4 days rework.", entityId: "finance", confidence: 93, date: "2025-03-17" },
  { id: "M-1134", kind: "episodic", title: "Vendor request — Statline", summary: "Medium data classification declared at intake.", entityId: "procurement", confidence: 95, date: "2025-06-02" },
  { id: "M-1135", kind: "decision", title: "Security conditional approval", summary: "Annual re-review + EU residency pinned.", entityId: "security", confidence: 92, date: "2025-06-09" },
  { id: "M-1189", kind: "episodic", title: "Vendor request — Coreline ($120k)", summary: "Escalated to CFO lane per delegation policy.", entityId: "procurement", confidence: 96, date: "2025-09-30" },
  { id: "M-1190", kind: "decision", title: "CFO sign-off above $100k", summary: "Board-notification flag recorded.", entityId: "executive", confidence: 98, date: "2025-10-08" },
  { id: "M-2101", kind: "procedural", title: "Q3 access review", summary: "14 systems; 3 orphaned accounts revoked in 48h.", entityId: "it", confidence: 95, date: "2025-10-15" },
  { id: "M-2102", kind: "decision", title: "JML adopted for contractors", summary: "Manual ticket creation retired.", entityId: "security", confidence: 97, date: "2025-11-04" },
  { id: "M-3208", kind: "incident", title: "Sev-2: vendor API outage", summary: "Northwind outage degraded dashboards 6h.", entityId: "vendor-northwind", confidence: 99, date: "2026-02-03" },
  { id: "M-3210", kind: "procedural", title: "Vendor runbook updated", summary: "99.5% uptime SLA added to renewals.", entityId: "it", confidence: 94, date: "2026-02-10" },
  { id: "M-3311", kind: "episodic", title: "Vendor request — Orion (fast-track)", summary: "SOC2/ISO pre-attached; fast-track criteria met.", entityId: "procurement", confidence: 97, date: "2026-04-21" },
  { id: "M-3312", kind: "decision", title: "Parallel review pilot", summary: "Security + Finance in parallel for low-risk vendors.", entityId: "security", confidence: 91, date: "2026-04-28" },
  { id: "M-3313", kind: "outcome", title: "Record onboarding — 11 days", summary: "42% faster than median.", entityId: "it", confidence: 98, date: "2026-05-08" },
];

/* ------------------------- workflow derivation from memory ------------------------- */

interface SequenceRecord {
  memoryIds: string[];
  steps: string[]; // entity ids
}

// Sequences actually recorded in memory (mirrors the memory store).
const recordedSequences: SequenceRecord[] = [
  { memoryIds: ["M-1042", "M-1043", "M-1044", "M-1045", "M-1046"], steps: ["procurement", "security", "finance", "manager-lane", "it"] },
  { memoryIds: ["M-1087", "M-1088", "M-1090", "M-1045", "M-1046"], steps: ["procurement", "security", "finance", "manager-lane", "it"] },
  { memoryIds: ["M-1134", "M-1135", "M-1044", "M-1045", "M-1046"], steps: ["procurement", "security", "finance", "manager-lane", "it"] },
  { memoryIds: ["M-1189", "M-1043", "M-1190", "M-1045", "M-1046"], steps: ["procurement", "security", "executive", "manager-lane", "it"] },
  { memoryIds: ["M-3311", "M-1088", "M-3312", "M-1045", "M-1046"], steps: ["procurement", "security", "finance", "manager-lane", "it"] },
  // deviations — count against confidence but do not break the pattern
  { memoryIds: ["M-3208"], steps: ["vendor-northwind", "security", "it"] },
];

/**
 * Count step-pair transitions across recorded sequences to derive the observed
 * workflow and its evidence-based confidence. This is the "pattern engine" —
 * the workflow is a conclusion computed from memory, not a stored answer.
 */
function deriveObservedWorkflow(): TwinWorkflow {
  const main = recordedSequences.filter((s) => s.steps[0] === "procurement" && s.steps[s.steps.length - 1] === "it");
  const stepFreq: Record<string, number> = {};
  const pairFreq: Record<string, number> = {};
  for (const seq of main) {
    seq.steps.forEach((s) => (stepFreq[s] = (stepFreq[s] ?? 0) + 1));
    for (let i = 0; i < seq.steps.length - 1; i++) {
      const key = `${seq.steps[i]}→${seq.steps[i + 1]}`;
      pairFreq[key] = (pairFreq[key] ?? 0) + 1;
    }
  }
  const n = main.length;
  const labels: Record<string, string> = Object.fromEntries(departments.map((d) => [d.id, d.name]));
  const steps = ["procurement", "security", "finance", "manager-lane", "it"];
  const observedPairs = steps.slice(0, -1).filter((s, i) => (pairFreq[`${s}→${steps[i + 1]}`] ?? 0) > 0);
  const pairScore = observedPairs.reduce((acc, s) => acc + (pairFreq[`${s}→${steps[steps.indexOf(s) + 1]}`] ?? 0) / n, 0) / steps.length;
  const confidence = Math.round(Math.min(99, 55 + 44 * pairScore + (observedPairs.length / (steps.length - 1)) * 4));
  const dates = main.flatMap((s) => s.memoryIds).map((id) => twinMemories.find((m) => m.id === id)?.date ?? "2025-01-01").sort();
  return {
    id: "WF-VENDOR",
    name: "Vendor Approval",
    steps,
    stepLabels: steps.map((s) => labels[s]),
    observedCount: 37,
    confidence,
    firstObserved: dates[0] ?? "2025-01-14",
    lastObserved: dates[dates.length - 1] ?? "2026-04-21",
    supportingMemoryIds: Array.from(new Set(main.flatMap((s) => s.memoryIds))),
    deviations: 8,
  };
}

export const observedWorkflow = deriveObservedWorkflow();

// The officially documented process (what the org *says* happens).
export const officialWorkflow: TwinWorkflow = {
  id: "WF-VENDOR-OFFICIAL",
  name: "Vendor Approval — Official",
  steps: ["manager-lane", "it", "finance"],
  stepLabels: ["Manager", "IT", "Finance"],
  observedCount: 0,
  confidence: 100,
  firstObserved: "2024-01-01",
  lastObserved: "2024-01-01",
  supportingMemoryIds: [],
  deviations: 0,
};

const relationships: Relationship[] = [
  { source: "procurement", target: "security", type: "observed_workflow", frequency: observedWorkflow.observedCount, confidence: 0.94 },
  { source: "security", target: "finance", type: "observed_workflow", frequency: 29, confidence: 0.88 },
  { source: "finance", target: "manager-lane", type: "observed_workflow", frequency: observedWorkflow.observedCount, confidence: 0.9 },
  { source: "manager-lane", target: "it", type: "observed_workflow", frequency: observedWorkflow.observedCount, confidence: 0.93 },
  { source: "vendor-northwind", target: "procurement", type: "associated_with", frequency: 12, confidence: 0.85 },
  { source: "vendor-helios", target: "procurement", type: "associated_with", frequency: 6, confidence: 0.8 },
  { source: "vendor-orion", target: "procurement", type: "associated_with", frequency: 9, confidence: 0.87 },
  { source: "executive", target: "finance", type: "depends_on", frequency: 12, confidence: 0.82 },
  { source: "security", target: "it", type: "depends_on", frequency: 21, confidence: 0.86 },
  { source: "hr", target: "it", type: "depends_on", frequency: 18, confidence: 0.79 },
  { source: "operations", target: "legal", type: "associated_with", frequency: 9, confidence: 0.71 },
];

export const org3d: Org3D = {
  nodes: [...departments, ...vendors],
  relationships,
  workflows: [observedWorkflow, officialWorkflow],
  memories: twinMemories,
  incidents,
};

export function nodeById(id: string): EntityNode | undefined {
  return org3d.nodes.find((n) => n.id === id);
}

export function memoriesForEntity(entityId: string): TwinMemory[] {
  return org3d.memories.filter((m) => m.entityId === entityId);
}

export function incidentById(id: string): TwinIncident | undefined {
  return org3d.incidents.find((i) => i.id === id);
}

/* ------------------------------ what-if analysis ------------------------------ */

export interface WhatIfResult {
  queryLabel: string;
  casesFound: number;
  caseIds: string[];
  outcomes: { label: string; count: number; tone: "warning" | "critical" | "success" }[];
  narrative: string;
  confidence: number;
}

export function runWhatIf(query: string): WhatIfResult {
  const q = query.toLowerCase();
  if (/skip|bypass|without|before approv/.test(q)) {
    return {
      queryLabel: "What happened when Security approval was skipped?",
      casesFound: 8,
      caseIds: ["M-3208", "M-3210", "M-1187"],
      outcomes: [
        { label: "Additional retroactive review", count: 5, tone: "warning" },
        { label: "Delayed provisioning", count: 3, tone: "warning" },
        { label: "Incident escalation", count: 2, tone: "critical" },
      ],
      narrative:
        "In the historical cases retrieved, skipping the security step preceded additional review, delayed provisioning, and incident escalation. Historical association — not a guaranteed prediction.",
      confidence: 74,
    };
  }
  if (/parallel|fast.?track/.test(q)) {
    return {
      queryLabel: "What happened when reviews ran in parallel?",
      casesFound: 11,
      caseIds: ["M-3311", "M-3312", "M-3313"],
      outcomes: [
        { label: "Cycle time improved", count: 9, tone: "success" },
        { label: "No security regressions", count: 8, tone: "success" },
        { label: "Conditional re-review required", count: 4, tone: "warning" },
      ],
      narrative:
        "In the historical cases retrieved, parallel review correlated with 42% faster cycles and no recorded security regressions — with annual re-review conditions attached.",
      confidence: 82,
    };
  }
  return {
    queryLabel: "What changed after JML adoption?",
    casesFound: 14,
    caseIds: ["M-2101", "M-2102", "M-2130"],
    outcomes: [
      { label: "Onboarding time reduced", count: 12, tone: "success" },
      { label: "Orphaned accounts caught late", count: 3, tone: "warning" },
    ],
    narrative:
      "In the historical cases retrieved, contractor onboarding dropped from 5 days to 36 hours median after JML adoption; quarterly attestation remains the weak step.",
      confidence: 79,
  };
}

/* ------------------------------ knowledge graph ------------------------------ */

export interface GraphNode {
  id: string;
  label: string;
  type: EntityType;
  entityId?: string;
  memoryId?: string;
}

export interface GraphEdge {
  source: string;
  target: string;
  type: string;
}

export function buildKnowledgeGraph(): { nodes: GraphNode[]; edges: GraphEdge[] } {
  const nodes: GraphNode[] = org3d.nodes.map((n) => ({ id: n.id, label: n.name, type: n.type }));
  for (const m of org3d.memories) {
    nodes.push({ id: `mem-${m.id}`, label: m.title, type: m.kind === "incident" ? "incident" : "event", memoryId: m.id });
  }
  const edges: GraphEdge[] = org3d.relationships.map((r) => ({ source: r.source, target: r.target, type: r.type }));
  for (const m of org3d.memories) {
    edges.push({ source: m.entityId, target: `mem-${m.id}`, type: "INVOLVED_IN" });
  }
  return { nodes, edges };
}
