import { supabase } from "@/integrations/supabase/client";

export type ContaminationKind =
  | "wrong_business_link"
  | "mixed_crm_ownership"
  | "memory_contamination"
  | "wrong_campaign_ownership"
  | "mismatched_envelope"
  | "orphaned_record"
  | "invalid_module_relationship";

export type Severity = "low" | "medium" | "high" | "critical";

export type ContaminationFinding = {
  id: string;
  kind: ContaminationKind;
  severity: Severity;
  businessId: string | null;
  affectedBusinesses: string[];
  recordRef: string;
  module: string;
  summary: string;
  recommendedRepair: string;
  quarantined: boolean;
  blocksOutbound: boolean;
};

export type LinkRow = {
  id: string;
  business_id: string | null;
  source_module: string;
  source_table: string;
  source_record_id: string;
  target_module: string;
  target_table: string;
  target_record_id: string;
  link_type: string;
  link_status: string;
};

export type EnvelopeRow = { id: string; business_id: string; brand_name: string };

const ALLOWED_MODULE_LINKS: Record<string, string[]> = {
  crm: ["agents", "campaigns", "envelopes", "memory", "communications"],
  agents: ["crm", "campaigns", "memory", "envelopes"],
  campaigns: ["crm", "agents", "envelopes"],
  memory: ["crm", "agents", "envelopes"],
  envelopes: ["crm", "agents", "campaigns", "memory", "communications"],
  communications: ["crm", "envelopes"],
};

const SEVERITY_BY_KIND: Record<ContaminationKind, Severity> = {
  wrong_business_link: "critical",
  mixed_crm_ownership: "critical",
  memory_contamination: "high",
  wrong_campaign_ownership: "high",
  mismatched_envelope: "high",
  orphaned_record: "medium",
  invalid_module_relationship: "medium",
};

/** Pure detector — given links + a set of valid business IDs, return findings. */
export function detectContamination(
  links: LinkRow[],
  envelopes: EnvelopeRow[],
  // Optional override: map of source_record_id -> the business it SHOULD belong to
  expectedOwner: Map<string, string> = new Map(),
): ContaminationFinding[] {
  const findings: ContaminationFinding[] = [];
  const validBusinessIds = new Set(envelopes.map((e) => e.business_id));
  const envelopeByBusiness = new Map(envelopes.map((e) => [e.business_id, e]));

  // Group by source record to detect mixed ownership
  const bySource = new Map<string, LinkRow[]>();
  for (const l of links) {
    const k = `${l.source_module}:${l.source_record_id}`;
    const arr = bySource.get(k) ?? [];
    arr.push(l);
    bySource.set(k, arr);
  }

  for (const l of links) {
    const ref = `${l.source_module}/${l.source_record_id}`;

    // 1. Orphaned: link has no business_id
    if (!l.business_id) {
      findings.push(make("orphaned_record", l, ref, [], "Link is missing business_id (orphaned record).",
        "Backfill business_id via context envelope, then re-validate."));
      continue;
    }

    // 2. Wrong business: business_id not in known envelopes
    if (!validBusinessIds.has(l.business_id)) {
      findings.push(make("wrong_business_link", l, ref, [l.business_id],
        `Link points to business_id ${l.business_id.slice(0, 8)}… with no envelope.`,
        "Quarantine link and reassign to the correct envelope owner."));
      continue;
    }

    // 3. Expected-owner mismatch (CRM ownership / campaign ownership)
    const expected = expectedOwner.get(l.source_record_id);
    if (expected && expected !== l.business_id) {
      const kind: ContaminationKind =
        l.source_module === "crm" ? "mixed_crm_ownership" :
        l.source_module === "campaigns" ? "wrong_campaign_ownership" :
        l.source_module === "memory" ? "memory_contamination" :
        "wrong_business_link";
      findings.push(make(kind, l, ref, [expected, l.business_id],
        `${l.source_module} record assigned to wrong business (expected ${expected.slice(0, 8)}…, got ${l.business_id.slice(0, 8)}…).`,
        "Reassign business_id to expected owner and re-link envelope."));
      continue;
    }

    // 4. Invalid module relationship
    const allowed = ALLOWED_MODULE_LINKS[l.source_module];
    if (allowed && !allowed.includes(l.target_module)) {
      findings.push(make("invalid_module_relationship", l, ref, [l.business_id],
        `Disallowed link: ${l.source_module} → ${l.target_module}.`,
        "Drop link or re-route via context fabric envelope."));
      continue;
    }

    // 5. Mismatched envelope (links target a different business's envelope)
    if (l.target_module === "envelopes") {
      const targetEnv = envelopes.find((e) => e.id === l.target_record_id);
      if (targetEnv && targetEnv.business_id !== l.business_id) {
        findings.push(make("mismatched_envelope", l, ref, [l.business_id, targetEnv.business_id],
          `Envelope link crosses business boundary (${envelopeByBusiness.get(l.business_id)?.brand_name ?? "?"} → ${targetEnv.brand_name}).`,
          "Replace target envelope with the source business's envelope."));
        continue;
      }
    }
  }

  // 6. Mixed CRM ownership: same source record linked under multiple business_ids
  for (const [, group] of bySource) {
    const businesses = new Set(group.map((g) => g.business_id).filter(Boolean) as string[]);
    if (businesses.size > 1) {
      const sample = group[0];
      const kind: ContaminationKind = sample.source_module === "memory" ? "memory_contamination" : "mixed_crm_ownership";
      findings.push(make(kind, sample, `${sample.source_module}/${sample.source_record_id}`,
        Array.from(businesses),
        `Record ${sample.source_record_id} appears under ${businesses.size} businesses.`,
        "Quarantine all links, choose canonical owner, drop duplicates."));
    }
  }

  // Dedup by (kind, recordRef)
  const seen = new Set<string>();
  return findings.filter((f) => {
    const k = `${f.kind}:${f.recordRef}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

function make(
  kind: ContaminationKind,
  l: LinkRow,
  ref: string,
  affected: string[],
  summary: string,
  recommendedRepair: string,
): ContaminationFinding {
  const severity = SEVERITY_BY_KIND[kind];
  return {
    id: `${l.id}:${kind}`,
    kind,
    severity,
    businessId: l.business_id,
    affectedBusinesses: affected,
    recordRef: ref,
    module: l.source_module,
    summary,
    recommendedRepair,
    quarantined: severity === "critical" || severity === "high",
    blocksOutbound: severity === "critical" || severity === "high",
  };
}

/** Severity-based protection rules. */
export function shouldQuarantine(f: ContaminationFinding): boolean {
  return f.severity === "critical" || f.severity === "high";
}
export function shouldBlockOutbound(f: ContaminationFinding): boolean {
  return shouldQuarantine(f);
}

export type IntegrityScan = {
  generatedAt: string;
  totalLinks: number;
  totalEnvelopes: number;
  findings: ContaminationFinding[];
  bySeverity: Record<Severity, number>;
  affectedBusinessCount: number;
  outboundBlocks: number;
};

export async function runIntegrityScan(): Promise<IntegrityScan> {
  const [linksRes, envRes] = await Promise.all([
    supabase.from("cross_module_record_links")
      .select("id,business_id,source_module,source_table,source_record_id,target_module,target_table,target_record_id,link_type,link_status")
      .limit(5000),
    supabase.from("business_context_envelopes")
      .select("id,business_id,brand_name")
      .limit(500),
  ]);
  const links = (linksRes.data ?? []) as LinkRow[];
  const envelopes = (envRes.data ?? []) as EnvelopeRow[];
  const findings = detectContamination(links, envelopes);
  const bySeverity: Record<Severity, number> = { low: 0, medium: 0, high: 0, critical: 0 };
  const affected = new Set<string>();
  let outboundBlocks = 0;
  for (const f of findings) {
    bySeverity[f.severity] += 1;
    f.affectedBusinesses.forEach((b) => affected.add(b));
    if (f.businessId) affected.add(f.businessId);
    if (shouldBlockOutbound(f)) outboundBlocks += 1;
  }
  return {
    generatedAt: new Date().toISOString(),
    totalLinks: links.length,
    totalEnvelopes: envelopes.length,
    findings,
    bySeverity,
    affectedBusinessCount: affected.size,
    outboundBlocks,
  };
}

/** Persist a validation event + repair recommendation. Used to "quarantine" a finding. */
export async function quarantineFinding(f: ContaminationFinding, founderApproved = false) {
  const eventRes = await supabase
    .from("business_context_validation_events")
    .insert({
      business_id: f.businessId,
      source_module: f.module,
      source_record_id: f.recordRef.split("/")[1] ?? null,
      validation_type: f.kind,
      severity: f.severity,
      validation_summary: f.summary,
      action_taken: shouldQuarantine(f) ? "quarantined" : "warned",
      recommended_fix: f.recommendedRepair,
      audit_metadata: { affected_businesses: f.affectedBusinesses, blocks_outbound: shouldBlockOutbound(f) },
    })
    .select("id")
    .single();
  if (eventRes.error || !eventRes.data) return { ok: false, error: eventRes.error?.message };
  const repairRes = await supabase
    .from("context_repair_actions")
    .insert({
      validation_event_id: eventRes.data.id,
      business_id: f.businessId,
      repair_type: `auto_repair_${f.kind}`,
      repair_status: founderApproved ? "approved" : "draft",
      irreversible: false,
      founder_approval_required: true,
      audit_metadata: { recommended_fix: f.recommendedRepair, kind: f.kind, simulated: !founderApproved },
    })
    .select("id")
    .single();
  return { ok: !repairRes.error, eventId: eventRes.data.id, repairId: repairRes.data?.id, error: repairRes.error?.message };
}