/**
 * Deterministic bulk eligibility + 30-lead pilot preflight for Kindnesss.
 * Pure functions: no I/O, no provider calls, no writes. Fails closed.
 *
 * Country policy is a conservative CONFIG requiring legal sign-off; it never
 * invents a lawful basis — the record must already carry an accepted, final
 * basis. "Provisional" bases never pass.
 */

export const KINDNESSS_BUSINESS_ID = "640de582-a112-4d16-a221-03c27f00c6ec";
export const PILOT_CAMPAIGN_ID = "4103531";
export const PILOT_SENDER_IDS = ["24265073", "24265132"] as const;
export const PILOT_MAX_LEADS = 30;
export const CURRENT_DAILY_CAP = 3;

export type LawfulBasis = "legitimate_interests" | "consent" | "conspicuous_publication";

/** Per-country accepted final bases for B2B institutional email. Unknown => blocked. */
export const COUNTRY_POLICY: Readonly<Record<string, { accepted: readonly LawfulBasis[]; regime: string }>> = Object.freeze({
  "United Kingdom": { accepted: ["legitimate_interests", "consent"], regime: "UK GDPR + PECR (corporate subscriber)" },
  Ireland: { accepted: ["legitimate_interests", "consent"], regime: "GDPR + ePrivacy" },
  Spain: { accepted: ["consent"], regime: "GDPR + LSSI art.21 (prior consent)" },
  Germany: { accepted: ["consent"], regime: "GDPR + UWG §7" },
  "United States": { accepted: ["legitimate_interests", "consent"], regime: "CAN-SPAM (opt-out)" },
  Canada: { accepted: ["consent", "conspicuous_publication"], regime: "CASL" },
  Australia: { accepted: ["consent", "conspicuous_publication"], regime: "Spam Act 2003" },
});

export interface CandidateRow {
  contactId: string;
  businessId: string;
  email: string | null;
  country: string | null;
  lawfulBasis: string | null;
  emailVerifiedStatus: string | null;
  isGloballySuppressed: boolean;
  hardBounced: boolean;
  unsubscribed: boolean;
  doNotContact: boolean;
  isInternal: boolean;
  archived: boolean;
  tags?: string[] | null;
  dataSource?: string | null;
}

export type BlockReason =
  | "wrong_business" | "private_record" | "internal" | "archived" | "invalid_email" | "unverified_email"
  | "duplicate_email" | "globally_suppressed" | "hard_bounced" | "unsubscribed" | "do_not_contact"
  | "unknown_country" | "no_lawful_basis" | "provisional_lawful_basis" | "basis_not_accepted_for_country";

export interface Classification { contactId: string; eligible: boolean; reasons: BlockReason[]; regime: string | null }

const PRIVATE_TAG = /^(home|family|education_private|private|child|ri_private)$/i;
const EMAIL = /^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,}$/;

export function classifyAll(rows: readonly CandidateRow[], businessId = KINDNESSS_BUSINESS_ID): Classification[] {
  const seen = new Set<string>();
  return rows.map((r) => {
    const reasons: BlockReason[] = [];
    if (r.businessId !== businessId) reasons.push("wrong_business");
    if ((r.tags ?? []).some((t) => PRIVATE_TAG.test(t)) || /private|family/i.test(r.dataSource ?? "")) reasons.push("private_record");
    if (r.isInternal) reasons.push("internal");
    if (r.archived) reasons.push("archived");
    const email = r.email?.trim().toLowerCase() ?? "";
    if (!EMAIL.test(email)) reasons.push("invalid_email");
    else if (seen.has(email)) reasons.push("duplicate_email");
    else seen.add(email);
    if (r.emailVerifiedStatus !== "verified") reasons.push("unverified_email");
    if (r.isGloballySuppressed) reasons.push("globally_suppressed");
    if (r.hardBounced) reasons.push("hard_bounced");
    if (r.unsubscribed) reasons.push("unsubscribed");
    if (r.doNotContact) reasons.push("do_not_contact");
    const policy = r.country ? COUNTRY_POLICY[r.country] : undefined;
    if (!policy) reasons.push("unknown_country");
    const basis = r.lawfulBasis?.trim() ?? "";
    if (!basis) reasons.push("no_lawful_basis");
    else if (/provisional/i.test(basis)) reasons.push("provisional_lawful_basis");
    else if (policy && !policy.accepted.includes(basis as LawfulBasis)) reasons.push("basis_not_accepted_for_country");
    return { contactId: r.contactId, eligible: reasons.length === 0, reasons, regime: policy?.regime ?? null };
  });
}

export function summarise(cs: readonly Classification[]) {
  const byReason: Record<string, number> = {};
  for (const c of cs) for (const r of c.reasons) byReason[r] = (byReason[r] ?? 0) + 1;
  return { total: cs.length, eligible: cs.filter((c) => c.eligible).length, blocked: cs.filter((c) => !c.eligible).length, byReason };
}

/* ---------------- Schedule: 5 steps, 4 Mon–Fri working days apart ---------------- */

const EXPIRED_STARTS = new Set(["2026-10-13"]);

function isWorkingDay(d: Date, holidays: ReadonlySet<string>) {
  const w = d.getUTCDay();
  return w !== 0 && w !== 6 && !holidays.has(d.toISOString().slice(0, 10));
}

export interface PilotSchedule { sendDates: string[]; calendarGaps: number[] }

export function buildPilotSchedule(startIso: string, todayIso: string, holidays: readonly string[] = []): PilotSchedule {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(startIso)) throw new Error("start_date_invalid");
  if (EXPIRED_STARTS.has(startIso)) throw new Error("start_date_expired");
  if (startIso < todayIso) throw new Error("start_date_in_past");
  const hol = new Set(holidays);
  const start = new Date(`${startIso}T00:00:00Z`);
  if (!isWorkingDay(start, hol)) throw new Error("start_date_not_working_day");
  const dates = [start];
  const gaps: number[] = [];
  for (let step = 1; step < 5; step++) {
    const d = new Date(dates[dates.length - 1]);
    let worked = 0, gap = 0;
    while (worked < 4) { d.setUTCDate(d.getUTCDate() + 1); gap++; if (isWorkingDay(d, hol)) worked++; }
    dates.push(d); gaps.push(gap);
  }
  return { sendDates: dates.map((d) => d.toISOString().slice(0, 10)), calendarGaps: gaps };
}

/* ---------------- Copy rendering + stop rules ---------------- */

export function checkStepCopy(steps: readonly { subject: string; body: string }[]) {
  const problems: string[] = [];
  if (steps.length !== 5) problems.push(`expected_5_steps_got_${steps.length}`);
  steps.forEach((s, i) => {
    if (!s.body.includes("%signature%")) problems.push(`step_${i + 1}_missing_signature`);
    if (!s.body.includes("%unsubscribe-text%")) problems.push(`step_${i + 1}_missing_unsubscribe`);
    if (i > 0 && s.subject.trim() !== "") problems.push(`step_${i + 1}_breaks_thread_subject`);
  });
  return { ok: problems.length === 0, problems };
}

export type LeadEvent = "sent" | "reply" | "unsubscribe" | "bounce" | "complaint" | "objection" | "suppressed" | "open";
const STOP_EVENTS = new Set<LeadEvent>(["reply", "unsubscribe", "bounce", "complaint", "objection", "suppressed"]);

/** A lead may receive the next step only if no stop event has occurred. */
export function mayReceiveNextStep(events: readonly LeadEvent[]): boolean {
  return !events.some((e) => STOP_EVENTS.has(e));
}

/* ---------------- Pilot preflight ---------------- */

export interface SenderEvidence {
  smartleadId: string; smtpOk: boolean; imapOk: boolean; warmupStatus: string | null; readinessState: string | null;
}

export interface PreflightInput {
  classifications: readonly Classification[];
  senders: readonly SenderEvidence[];
  campaign: { id: string; status: string; remoteLeadCount: number; maxLeadsPerDay: number; stopOnReply: boolean };
  gates: Record<string, boolean>;
  webhookSigningVerified: boolean;
  copy: { ok: boolean; launchApprovedInLiftor: boolean; renderedTestVerified: boolean };
  schedule: PilotSchedule | null;
}

export function pilotPreflight(p: PreflightInput) {
  const blockers: string[] = [];
  const s = summarise(p.classifications);
  if (s.eligible < PILOT_MAX_LEADS) blockers.push(`eligible_${s.eligible}_of_${PILOT_MAX_LEADS}`);
  for (const id of PILOT_SENDER_IDS) {
    const e = p.senders.find((x) => x.smartleadId === id);
    if (!e) { blockers.push(`sender_${id}_no_evidence`); continue; }
    if (!e.smtpOk || !e.imapOk) blockers.push(`sender_${id}_connectivity`);
    if (e.readinessState !== "campaign_ready") blockers.push(`sender_${id}_not_campaign_ready(${e.readinessState ?? "unknown"})`);
  }
  if (p.campaign.id !== PILOT_CAMPAIGN_ID) blockers.push("wrong_campaign");
  if (!["DRAFTED", "PAUSED"].includes(p.campaign.status)) blockers.push(`campaign_status_${p.campaign.status}`);
  if (p.campaign.remoteLeadCount !== 0) blockers.push(`campaign_holds_${p.campaign.remoteLeadCount}_preloaded_leads_reconcile_without_deleting`);
  if (p.campaign.maxLeadsPerDay > CURRENT_DAILY_CAP) blockers.push("daily_cap_above_approved");
  if (!p.campaign.stopOnReply) blockers.push("stop_on_reply_off");
  for (const g of ["smartlead_campaign_start_gate", "smartlead_lead_push_gate"]) if (!p.gates[g]) blockers.push(`gate_off:${g}`);
  if (!p.webhookSigningVerified) blockers.push("webhook_signing_unverified");
  if (!p.copy.ok) blockers.push("copy_tokens_invalid");
  if (!p.copy.launchApprovedInLiftor) blockers.push("copy_not_launch_approved");
  if (!p.copy.renderedTestVerified) blockers.push("signature_unsubscribe_render_untested");
  if (!p.schedule) blockers.push("no_actual_start_date");
  return { go: blockers.length === 0, eligibleCount: s.eligible, summary: s, blockers };
}
