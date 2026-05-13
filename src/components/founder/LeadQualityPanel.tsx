import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ShieldCheck, Loader2, AlertTriangle, CheckCircle2, Sparkles, KeyRound, Network } from "lucide-react";
import { toast } from "sonner";

type Overview = {
  total_leads: number;
  raw_leads: number;
  reviewed_leads: number;
  qualified_leads: number;
  rejected_leads: number;
  needs_verification: number;
  needs_founder_review: number;
  promoted_contacts: number;
  terminal_blocked: number;
  safe_to_queue: number;
  duplicate_or_risky: number;
};

type CrmSpine = {
  contacts_total: number;
  contacts_with_bcr: number;
  contacts_missing_bcr: number;
  internal_contacts: number;
  internal_identities: number;
  suppressed_contacts: number;
  apollo_promoted: number;
  apollo_needs_verification: number;
  apollo_duplicates_collapsed: number;
  proposals_needing_reconciliation: number;
  bcr_with_business_id: number;
  bcr_missing_business_id: number;
  safe_to_unlock_count: number;
};

type LastUnlockRun = {
  enrichment_credits_used: number | null;
  contacts_updated: number | null;
  notes: string | null;
  created_at: string | null;
  attempted: number;
  no_email: number;
  already_in_crm: number;
  unlocked_new: number;
};

type LifecycleSummary = {
  total_leads: number;
  active_working_leads: number;
  active_candidates: number;
  needs_verification_active: number;
  verified_ready_for_review: number;
  qualified_for_promotion: number;
  founder_review_required: number;
  promoted_to_contact: number;
  already_in_crm: number;
  duplicates_archived: number;
  poor_fit_archived: number;
  missing_contact_archived: number;
  attempted_no_email: number;
  archived_learning_only: number;
  archived_not_working: number;
  legacy_optional_unlock_candidates: number;
  verified_email_available_locked: number;
  email_reveal_required?: number;
  reveal_shortlisted?: number;
  safe_to_promote_after_reveal?: number;
  already_in_crm_after_reveal?: number;
  reveal_attempted_no_email?: number;
  reveal_invalid_email?: number;
  unlock_required: number;
  safe_to_unlock: number;
  safe_to_promote: number;
  safe_to_queue: number;
};

type AutopilotRun = {
  id: string;
  trigger: string;
  status: string;
  finished_at: string | null;
  scanned_count: number;
  duplicates_collapsed: number;
  poor_fit_archived: number;
  missing_email_held: number;
  already_in_crm_matched: number;
  no_email_attempts_excluded: number;
  safe_to_unlock: number;
  safe_to_promote: number;
  safe_to_queue: number;
  decisions_created: number;
  source_quality_score: number | null;
  next_recommended_action: string | null;
  created_at: string;
};

type FounderDecision = {
  id: string;
  decision_type: string;
  title: string;
  finding: string | null;
  recommendation: string | null;
  cost_credit_impact: string | null;
  risk: string | null;
  status: string;
  created_at: string;
};

const Tile = ({ label, value, tone = "default" }: { label: string; value: number | string; tone?: "default" | "good" | "warn" | "danger" }) => {
  const cls =
    tone === "good" ? "text-green-400" :
    tone === "warn" ? "text-yellow-400" :
    tone === "danger" ? "text-destructive" : "text-primary";
  return (
    <div className="rounded-md border border-border/50 bg-card/40 p-3">
      <p className={`text-2xl font-bold ${cls}`}>{value ?? 0}</p>
      <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
    </div>
  );
};

const ResultCard = ({ result }: { result: any }) => (
  <pre className="bg-muted/40 border border-border/50 rounded p-3 text-xs overflow-auto max-h-72">
    {JSON.stringify(result, null, 2)}
  </pre>
);

export default function LeadQualityPanel() {
  const qc = useQueryClient();
  const [busy, setBusy] = useState<string | null>(null);
  const [batchSize, setBatchSize] = useState(25);
  const [perDomainCap, setPerDomainCap] = useState(2);
  const [aiBatchSize, setAiBatchSize] = useState(150);
  const [unlockBatchSize, setUnlockBatchSize] = useState(25);
  const [lastResult, setLastResult] = useState<any>(null);
  const [shortlistResult, setShortlistResult] = useState<any>(null);
  const [shortlistRunAt, setShortlistRunAt] = useState<string | null>(null);
  const [promotePreviewResult, setPromotePreviewResult] = useState<any>(null);
  const [stagePreviewResult, setStagePreviewResult] = useState<any>(null);
  const [stageAppliedResult, setStageAppliedResult] = useState<any>(null);
  const [compliancePreviewResult, setCompliancePreviewResult] = useState<any>(null);
  const [complianceAppliedResult, setComplianceAppliedResult] = useState<any>(null);

  const { data: overview, isLoading } = useQuery({
    queryKey: ["lead-quality-overview"],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("lead_quality_overview").select("*").maybeSingle();
      if (error) throw error;
      return data as Overview | null;
    },
  });

  const { data: crmSpine } = useQuery({
    queryKey: ["crm-spine-summary"],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("crm_spine_summary").select("*").maybeSingle();
      if (error) throw error;
      return data as CrmSpine | null;
    },
  });

  const { data: lifecycle } = useQuery({
    queryKey: ["lead-lifecycle-summary"],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("lead_lifecycle_summary").select("*").maybeSingle();
      if (error) throw error;
      return data as LifecycleSummary | null;
    },
  });

  const { data: autopilotRun, refetch: refetchAutopilot } = useQuery({
    queryKey: ["autopilot-last-run"],
    queryFn: async () => {
      const { data } = await (supabase as any).from("autopilot_runs")
        .select("*").order("created_at", { ascending: false }).limit(1).maybeSingle();
      return data as AutopilotRun | null;
    },
  });

  const { data: pendingDecisions, refetch: refetchDecisions } = useQuery({
    queryKey: ["founder-decisions-pending"],
    queryFn: async () => {
      const { data } = await (supabase as any).from("founder_decisions")
        .select("*").eq("status","pending").order("created_at", { ascending: false }).limit(20);
      return (data ?? []) as FounderDecision[];
    },
  });

  const runAutopilot = async () => {
    try {
      setBusy("Autopilot");
      const { data, error } = await supabase.functions.invoke("lead-quality-autopilot", {
        body: { trigger: "manual_founder" },
      });
      if (error) throw error;
      toast.success("Autopilot run complete", { description: data?.next_recommended_action ?? "" });
      refetchAutopilot(); refetchDecisions();
      qc.invalidateQueries({ queryKey: ["lead-lifecycle-summary"] });
    } catch (e: any) {
      toast.error("Autopilot failed", { description: e?.message ?? String(e) });
    } finally { setBusy(null); }
  };

  const decideOn = async (id: string, status: "approved"|"rejected"|"hold") => {
    // Look up the decision so promotion_approval can trigger the actual promotion.
    const decision = (pendingDecisions ?? []).find((d: any) => d.id === id);
    const note =
      status === "approved" && decision?.decision_type === "promotion_approval"
        ? "Approved via founder decision card — invoking promote-leads-to-contacts (idempotent: unique email + unique BCR)."
        : status === "approved"
          ? "Approved via founder decision card. No automatic side-effect — founder must run the relevant action."
          : status === "rejected"
            ? "Rejected via founder decision card."
            : "Held via founder decision card.";
    const { error } = await (supabase as any).from("founder_decisions")
      .update({ status, decided_at: new Date().toISOString(), resolution_note: note })
      .eq("id", id);
    if (error) { toast.error("Failed", { description: error.message }); return; }
    if (status === "approved" && decision?.decision_type === "promotion_approval") {
      try {
        const { data, error: pErr } = await supabase.functions.invoke(
          "promote-leads-to-contacts",
          { body: { dry_run: false, limit: 100 } },
        );
        if (pErr) throw pErr;
        const summary = (data as any)?.summary;
        toast.success("Promotion executed", {
          description: `Promoted ${summary?.promoted ?? 0} · ready ${summary?.ready ?? 0} · blocked ${summary?.blocked ?? 0}`,
        });
      } catch (e: any) {
        toast.error("Promotion failed (decision still marked approved)", { description: e?.message ?? String(e) });
      }
      qc.invalidateQueries({ queryKey: ["lead-lifecycle-summary"] });
      qc.invalidateQueries({ queryKey: ["crm-spine-summary"] });
      refetchAutopilot();
    } else {
      toast.success(`Decision ${status}`);
    }
    refetchDecisions();
  };

  // Last Apollo unlock run + previously-attempted-no-email count
  const { data: lastUnlockRun } = useQuery({
    queryKey: ["apollo-last-unlock-run"],
    queryFn: async () => {
      const { data: run } = await (supabase as any)
        .from("apollo_automation_runs")
        .select("enrichment_credits_used,contacts_updated,notes,created_at")
        .ilike("notes", "unlock_selected complete%")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!run) return null;
      const parse = (k: string) => {
        const m = (run.notes ?? "").match(new RegExp(`${k}=(\\d+)`));
        return m ? Number(m[1]) : 0;
      };
      return {
        ...run,
        attempted: parse("attempted"),
        no_email: parse("no_email") || parse("failed"),
        already_in_crm: parse("already_in_crm_after_unlock"),
        unlocked_new: parse("unlocked"),
      } as LastUnlockRun;
    },
  });

  const { data: attemptedNoEmail } = useQuery({
    queryKey: ["apollo-attempted-no-email-count"],
    queryFn: async () => {
      const { count } = await (supabase as any)
        .from("lead_quality_profiles")
        .select("id", { count: "exact", head: true })
        .eq("unlock_recommendation", "attempted_no_email");
      return count ?? 0;
    },
  });

  const { data: excludedRejectedCount } = useQuery({
    queryKey: ["apollo-rejected-excluded-count"],
    queryFn: async () => {
      const { count } = await (supabase as any)
        .from("apollo_raw_leads")
        .select("apollo_lead_id", { count: "exact", head: true })
        .in("quality_status", ["rejected", "needs_founder_review"]);
      return count ?? 0;
    },
  });

  // === Stage-to-Queue eligibility candidate count (live) ===
  // Counts contacts assigned to Neon Candy whose BCR is still in
  // ready_to_stage / needs_review / not eligible — i.e. waiting for
  // founder approval to move into queue eligibility.
  const { data: stageCandidateCount, refetch: refetchStageCandidates } = useQuery({
    queryKey: ["stage-to-queue-candidate-count"],
    queryFn: async () => {
      const { count } = await (supabase as any)
        .from("business_contact_relationships")
        .select("id", { count: "exact", head: true })
        .eq("business_name", "Neon Candy")
        .eq("current_stage", "ready_to_stage")
        .eq("qualification", "needs_review")
        .eq("campaign_eligible", false)
        .eq("do_not_contact", false);
      return count ?? 0;
    },
  });

  // === Compliance readiness summary (live) ===
  const { data: complianceSummary } = useQuery({
    queryKey: ["compliance-readiness-summary"],
    refetchInterval: 30000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contacts")
        .select("id, email, name, assigned_business, status, compliance_status, lawful_basis, unsubscribe_token, retention_until, is_globally_suppressed, hard_bounced, unsubscribed_at, source")
        .in("source", ["autopilot_promotion", "apollo"])
        .eq("is_internal", false);
      if (error) throw error;
      const rows = (data ?? []) as Array<{
        id: string; email: string; name: string; assigned_business: string;
        status: string; compliance_status: string | null; lawful_basis: string | null;
        unsubscribe_token: string | null; retention_until: string | null;
        is_globally_suppressed: boolean; hard_bounced: boolean; unsubscribed_at: string | null;
      }>;
      const now = Date.now();
      const summary = {
        total: rows.length,
        lawful_basis_present: rows.filter(r => !!r.lawful_basis).length,
        unsubscribe_token_present: rows.filter(r => !!r.unsubscribe_token).length,
        retention_set: rows.filter(r => r.retention_until && new Date(r.retention_until).getTime() > now).length,
        suppressed: rows.filter(r => r.is_globally_suppressed).length,
        hard_bounced: rows.filter(r => r.hard_bounced).length,
        unsubscribed: rows.filter(r => !!r.unsubscribed_at).length,
        pending_review: rows.filter(r => r.compliance_status === "pending_review").length,
        outreach_allowed: rows.filter(r => r.compliance_status === "outreach_allowed").length,
        outreach_blocked: rows.filter(r =>
          ["unsubscribed","hard_bounced","do_not_contact","retained_no_outreach","pending_review"].includes(r.compliance_status ?? "")
          || r.is_globally_suppressed || r.hard_bounced || !!r.unsubscribed_at
          || r.status === "DO_NOT_CONTACT"
        ).length,
        rows,
      };
      return summary;
    },
  });

  const call = async (
    fn: "lead-quality-scan" | "lead-fit-classify" | "promote-leads-to-contacts" | "enqueue-eligible-contacts" | "apollo-unlock-shortlist" | "apollo-unlock-selected",
    body: any,
    label: string,
  ) => {
    try {
      setBusy(label); setLastResult(null);
      const { data, error } = await supabase.functions.invoke(fn, { body });
      if (error) throw error;
      setLastResult(data);
      if (fn === "apollo-unlock-shortlist") {
        setShortlistResult(data);
        setShortlistRunAt(new Date().toISOString());
      }
      toast.success(`${label} complete`, { description: data?.dry_run ? "Dry-run preview" : "Applied" });
      qc.invalidateQueries({ queryKey: ["lead-quality-overview"] });
    } catch (e: any) {
      toast.error(`${label} failed`, { description: e?.message ?? String(e) });
    } finally {
      setBusy(null);
    }
  };

  const runPromote = async (dryRun: boolean) => {
    try {
      setBusy(dryRun ? "Promote preview" : "Promote apply");
      setLastResult(null);
      const { data, error } = await supabase.functions.invoke("promote-leads-to-contacts", {
        body: { dry_run: dryRun, limit: 100 },
      });
      if (error) throw error;
      setLastResult(data);
      if (dryRun) setPromotePreviewResult(data);
      if (!dryRun) setPromotePreviewResult(null);
      toast.success(dryRun ? "Preview complete" : "Promotion applied", {
        description: data?.dry_run ? "Dry-run preview" : "Applied",
      });
      qc.invalidateQueries({ queryKey: ["lead-quality-overview"] });
      qc.invalidateQueries({ queryKey: ["crm-spine-summary"] });
      qc.invalidateQueries({ queryKey: ["lead-lifecycle-summary"] });
      qc.invalidateQueries({ queryKey: ["autopilot-last-run"] });
      refetchDecisions();
    } catch (e: any) {
      toast.error(dryRun ? "Preview failed" : "Promotion failed", {
        description: e?.message ?? String(e),
      });
    } finally {
      setBusy(null);
    }
  };

  const runStageToQueue = async (dryRun: boolean) => {
    try {
      setBusy(dryRun ? "Stage preview" : "Stage apply");
      setLastResult(null);
      const { data, error } = await supabase.functions.invoke("stage-to-queue-eligibility", {
        body: {
          dry_run: dryRun,
          business_name: "Neon Candy",
        },
      });
      if (error) throw error;
      setLastResult(data);
      if (dryRun) { setStagePreviewResult(data); setStageAppliedResult(null); }
      else { setStageAppliedResult(data); setStagePreviewResult(null); }
      const s = data?.summary ?? {};
      toast.success(dryRun ? "Stage-to-queue preview complete" : "Stage-to-queue applied", {
        description: dryRun
          ? `eligible ${s.eligible_to_stage ?? 0} · already_staged ${s.already_staged ?? 0} · excluded ${(s.excluded_already_contacted ?? 0) + (s.excluded_rejected ?? 0)}`
          : `staged ${s.bcrs_qualified_now ?? 0} · queue rows 0 · emails 0`,
      });
      qc.invalidateQueries({ queryKey: ["lead-quality-overview"] });
      qc.invalidateQueries({ queryKey: ["crm-spine-summary"] });
      qc.invalidateQueries({ queryKey: ["lead-lifecycle-summary"] });
      refetchStageCandidates();
    } catch (e: any) {
      toast.error(dryRun ? "Stage preview failed" : "Stage apply failed", {
        description: e?.message ?? String(e),
      });
    } finally {
      setBusy(null);
    }
  };

  const runComplianceApprove = async (dryRun: boolean) => {
    try {
      setBusy(dryRun ? "Compliance preview" : "Compliance apply");
      setLastResult(null);
      const { data, error } = await supabase.functions.invoke("compliance-approve", {
        body: { dry_run: dryRun, business_name: "Neon Candy" },
      });
      if (error) throw error;
      setLastResult(data);
      if (dryRun) { setCompliancePreviewResult(data); setComplianceAppliedResult(null); }
      else { setComplianceAppliedResult(data); setCompliancePreviewResult(null); }
      const s = data?.summary ?? {};
      toast.success(dryRun ? "Compliance preview complete" : "Compliance approved", {
        description: dryRun
          ? `eligible ${s.eligible_for_compliance_approval ?? 0} · blocked ${s.blocked ?? 0} · queue 0 · sends 0`
          : `approved ${s.contacts_updated ?? 0} · queue 0 · sends 0 · Apollo 0`,
      });
      qc.invalidateQueries({ queryKey: ["compliance-readiness-summary"] });
    } catch (e: any) {
      toast.error(dryRun ? "Compliance preview failed" : "Compliance approval failed", {
        description: e?.message ?? String(e),
      });
    } finally {
      setBusy(null);
    }
  };

  // Use live founder_decisions (status='pending') as the primary source of
  // truth for "needs founder review" — never derive it from rejected or
  // phantom needs_verification rows.
  const livePendingDecisions = (pendingDecisions ?? []).length;

  const nextAction =
    (lifecycle?.safe_to_queue ?? 0) > 0
      ? `Preview queue creation for ${lifecycle?.safe_to_queue} staged contact(s). Auto-send remains OFF.`
      : (lifecycle?.safe_to_promote ?? 0) > 0
      ? `Promote ${lifecycle?.safe_to_promote} validation-clean contact(s) — preview first${livePendingDecisions > 0 ? ` · review/hold ${livePendingDecisions} founder decision(s)` : ""}`
      : (lifecycle?.active_working_leads ?? 0) > 0
      ? "Review active working leads — autopilot has no recommended unlock work"
      : "Run fresh Apollo verified-email search using NeonCandy Source Quality Brief — do not spend credits on the legacy pool";

  return (
    <Card className="bg-card border-border/50">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <ShieldCheck size={16} className="text-primary" /> Lead Quality + Queue Integrity Gate
          <Badge variant="outline" className="ml-2 text-xs">Dry-run by default</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* === Lead Quality Autopilot === */}
        <div className="rounded-md border border-primary/30 bg-primary/5 p-3 space-y-2">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <p className="text-xs font-medium text-foreground flex items-center gap-1.5">
              <Sparkles size={12} className="text-primary" /> Lead Quality Autopilot
              <Badge variant="outline" className="text-[10px]">Daily 06:00 UTC · runs after Apollo import</Badge>
              <Badge variant="outline" className="text-[10px]">No AI · No credits · No sends</Badge>
            </p>
            <Button size="sm" variant="outline" disabled={!!busy} onClick={runAutopilot}>
              {busy === "Autopilot" ? <Loader2 className="animate-spin" size={14} /> : "Run autopilot now"}
            </Button>
          </div>
          {autopilotRun ? (
            <>
              <p className="text-[11px] text-muted-foreground">
                Last run: {new Date(autopilotRun.created_at).toLocaleString()} · trigger: {autopilotRun.trigger} · status: {autopilotRun.status}
              </p>
              <div className="grid grid-cols-2 md:grid-cols-6 gap-2">
                <Tile label="Scanned" value={autopilotRun.scanned_count} />
                <Tile label="Duplicates collapsed" value={autopilotRun.duplicates_collapsed} />
                <Tile label="Poor-fit archived" value={autopilotRun.poor_fit_archived} />
                <Tile label="Missing-email → hold" value={autopilotRun.missing_email_held} />
                <Tile label="Already in CRM matched" value={autopilotRun.already_in_crm_matched} />
                <Tile label="No-email excluded" value={autopilotRun.no_email_attempts_excluded} />
                <Tile label="Safe to unlock" value={autopilotRun.safe_to_unlock} tone="good" />
                <Tile label="Safe to promote" value={autopilotRun.safe_to_promote} tone="good" />
                <Tile label="Safe to queue" value={autopilotRun.safe_to_queue} tone="good" />
                <Tile label="Source quality /10" value={autopilotRun.source_quality_score ?? "—"} />
                <Tile label="Decisions waiting" value={pendingDecisions?.length ?? 0} tone={(pendingDecisions?.length ?? 0) > 0 ? "warn" : "default"} />
                <Tile label="Decisions created (last run)" value={autopilotRun.decisions_created} />
              </div>
              <p className="text-[11px] text-foreground">
                Next recommended action: <span className="text-primary">{autopilotRun.next_recommended_action ?? "—"}</span>
              </p>
            </>
          ) : (
            <p className="text-xs text-muted-foreground">No autopilot runs yet — click “Run autopilot now”.</p>
          )}
          {(pendingDecisions?.length ?? 0) > 0 && (
            <div className="space-y-2 pt-2 border-t border-border/40">
              <p className="text-xs font-medium text-foreground">Founder decisions waiting</p>
              {pendingDecisions!.map((d) => (
                <div key={d.id} className="rounded border border-border/50 bg-card/40 p-2 text-xs space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium">{d.title}</span>
                    <Badge variant="outline" className="text-[10px]">{d.decision_type}</Badge>
                  </div>
                  {d.finding && <p className="text-muted-foreground">Finding: {d.finding}</p>}
                  {d.recommendation && <p>Recommendation: {d.recommendation}</p>}
                  {(d.cost_credit_impact || d.risk) && (
                    <p className="text-muted-foreground">
                      {d.cost_credit_impact && <>Cost: {d.cost_credit_impact} · </>}
                      {d.risk && <>Risk: {d.risk}</>}
                    </p>
                  )}
                  <div className="flex gap-2 pt-1 items-center flex-wrap">
                    <Button size="sm" variant="default" onClick={() => decideOn(d.id, "approved")}>
                      {d.decision_type === "promotion_approval" ? "Approve decision only — does not promote contacts" : "Approve"}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => decideOn(d.id, "hold")}>Hold</Button>
                    <Button size="sm" variant="outline" onClick={() => decideOn(d.id, "rejected")}>Reject</Button>
                    {d.decision_type === "promotion_approval" && (
                      <span className="text-[10px] text-muted-foreground w-full">
                        To actually promote, use the “Ready to promote to CRM” panel below.
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {crmSpine && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-foreground flex items-center gap-1.5">
              <Network size={12} className="text-primary" />
              Central CRM spine
            </p>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
              <Tile label="Central contacts" value={crmSpine.contacts_total} />
              <Tile label="With business link" value={crmSpine.contacts_with_bcr} tone="good" />
              <Tile label="Missing business link" value={crmSpine.contacts_missing_bcr} tone={crmSpine.contacts_missing_bcr > 0 ? "warn" : "good"} />
              <Tile label="Internal identities" value={crmSpine.internal_identities} />
              <Tile label="Suppressed / bounced" value={crmSpine.suppressed_contacts} tone="warn" />
              <Tile label="Apollo → contacts" value={crmSpine.apollo_promoted} tone="good" />
              <Tile label="Apollo needs verify" value={crmSpine.apollo_needs_verification} tone="warn" />
              <Tile label="Apollo dups collapsed" value={crmSpine.apollo_duplicates_collapsed} />
              <Tile label="Proposals to reconcile" value={crmSpine.proposals_needing_reconciliation} tone={crmSpine.proposals_needing_reconciliation > 0 ? "warn" : "good"} />
              <Tile label="Safe-to-unlock (CRM-checked)" value={crmSpine.safe_to_unlock_count} tone="good" />
            </div>
            {lastUnlockRun && (
              <>
                <p className="text-xs font-medium text-foreground flex items-center gap-1.5 pt-1">
                  <KeyRound size={12} className="text-primary" />
                  Last Apollo unlock run
                  {lastUnlockRun.created_at && (
                    <span className="text-muted-foreground font-normal">
                      · {new Date(lastUnlockRun.created_at).toLocaleString()}
                    </span>
                  )}
                </p>
                <div className="grid grid-cols-2 md:grid-cols-6 gap-2">
                  <Tile label="Credits used" value={lastUnlockRun.enrichment_credits_used ?? 0} tone="warn" />
                  <Tile label="Attempts" value={lastUnlockRun.attempted} />
                  <Tile label="Emails returned" value={(lastUnlockRun.attempted ?? 0) - (lastUnlockRun.no_email ?? 0)} tone="good" />
                  <Tile label="No email returned" value={lastUnlockRun.no_email ?? 0} tone="warn" />
                  <Tile label="Already in CRM" value={lastUnlockRun.already_in_crm ?? 0} tone="warn" />
                  <Tile label="Promotion-ready" value={lastUnlockRun.unlocked_new ?? 0} tone={(lastUnlockRun.unlocked_new ?? 0) > 0 ? "good" : "default"} />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <Tile label="Previously attempted — Apollo no email (excluded from estimates)" value={attemptedNoEmail ?? 0} tone="warn" />
                  <Tile label="Next action" value={(lastUnlockRun.unlocked_new ?? 0) === 0 ? "Review existing CRM matches; do not unlock more until filters improved" : "Review unlocked leads"} />
                </div>
              </>
            )}
          </div>
        )}

        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : (
          <>
          {lifecycle && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-foreground">Apollo lead lifecycle (search → reveal → promote)</p>
              <div className="grid grid-cols-2 md:grid-cols-6 gap-2">
                <Tile label="Apollo total" value={lifecycle.total_leads} />
                <Tile label="Active working" value={lifecycle.active_working_leads} tone={lifecycle.active_working_leads > 0 ? "good" : "default"} />
                <Tile label="Email reveal required" value={(lifecycle.email_reveal_required ?? 0) + (lifecycle.verified_email_available_locked ?? 0)} tone="warn" />
                <Tile label="Reveal shortlisted" value={lifecycle.reveal_shortlisted ?? 0} tone="warn" />
                <Tile label="Safe to promote (post-reveal)" value={lifecycle.safe_to_promote_after_reveal ?? lifecycle.safe_to_promote ?? 0} tone="good" />
                <Tile label="Safe to queue" value={lifecycle.safe_to_queue} tone="good" />
                <Tile label="Reveal attempted — no email" value={lifecycle.reveal_attempted_no_email ?? 0} />
                <Tile label="Already in CRM after reveal" value={lifecycle.already_in_crm_after_reveal ?? 0} />
                <Tile label="Legacy optional unlock candidates" value={lifecycle.legacy_optional_unlock_candidates} />
                <Tile label="Duplicates archived" value={lifecycle.duplicates_archived} />
                <Tile label="Poor fit archived" value={lifecycle.poor_fit_archived} />
                <Tile label="Attempted no-email" value={lifecycle.attempted_no_email} tone="warn" />
                <Tile label="Already in CRM" value={lifecycle.already_in_crm} />
                <Tile label="Promoted contacts" value={lifecycle.promoted_to_contact} tone="good" />
              </div>
              <p className="text-[11px] text-muted-foreground">
                Apollo search and Apollo email reveal are <strong>separate stages</strong>. Search returns
                candidate profiles + email-availability signal only. The actual address is only returned
                after a founder-approved reveal/enrichment, which is what spends Apollo credits.
                Promotion is impossible until <em>after</em> reveal and the post-reveal CRM check.
              </p>
            </div>
          )}
          </>
        )}

        <div className="rounded-md border border-primary/30 bg-primary/5 p-3 text-xs flex items-start gap-2">
          <Sparkles size={14} className="text-primary mt-0.5" />
          <div>
            <span className="font-medium text-foreground">Next recommended action:</span>{" "}
            {nextAction}
            {shortlistRunAt && (
              <span className="block mt-0.5 text-muted-foreground">
                Last shortlist run: {new Date(shortlistRunAt).toLocaleString()}
              </span>
            )}
          </div>
        </div>

        {/* === Ready to promote to CRM — primary action panel === */}
        {(lifecycle?.safe_to_promote ?? 0) > 0 && (
          <div className="rounded-md border border-primary/40 bg-primary/5 p-4 space-y-3">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div>
                <p className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <CheckCircle2 size={14} className="text-primary" /> Ready to promote to CRM
                </p>
                <ul className="text-xs text-muted-foreground mt-1 space-y-0.5 list-disc list-inside">
                  <li><strong className="text-foreground">{lifecycle?.safe_to_promote ?? 0}</strong> validation-clean contacts ready</li>
                  <li><strong className="text-foreground">{excludedRejectedCount ?? 0}</strong> rejected/held record(s) excluded</li>
                  <li>No emails will be sent — auto-send OFF</li>
                  <li>Queue will <strong>not</strong> run automatically — separate approval required</li>
                </ul>
              </div>
              <div className="flex gap-2 flex-wrap">
                <Button size="sm" variant="outline" disabled={!!busy} onClick={() => runPromote(true)}>
                  {busy === "Promote preview" ? <Loader2 className="animate-spin" size={14} /> : `Preview promote (${lifecycle?.safe_to_promote ?? 0})`}
                </Button>
                <Button size="sm" variant="default" disabled={!!busy || !promotePreviewResult} onClick={() => runPromote(false)}
                  title={!promotePreviewResult ? "Run preview first" : undefined}>
                  {busy === "Promote apply" ? <Loader2 className="animate-spin" size={14} /> : `Promote ${lifecycle?.safe_to_promote ?? 0} validation-clean contacts`}
                </Button>
              </div>
            </div>
            {!promotePreviewResult && (
              <p className="text-[11px] text-yellow-300">
                Apply button is disabled until <strong>Preview promote</strong> succeeds in this session.
              </p>
            )}
            {promotePreviewResult && (
              <div className="rounded border border-border/50 bg-card/40 p-3 space-y-2 text-xs">
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary" className="text-[10px]">contacts_to_create: {promotePreviewResult.summary?.contacts_to_create ?? 0}</Badge>
                  <Badge variant="secondary" className="text-[10px]">contacts_to_match: {promotePreviewResult.summary?.contacts_to_match ?? 0}</Badge>
                  <Badge variant="secondary" className="text-[10px]">bcrs_to_create: {promotePreviewResult.summary?.bcrs_to_create ?? 0}</Badge>
                  <Badge variant="secondary" className="text-[10px]">bcrs_to_match: {promotePreviewResult.summary?.bcrs_to_match ?? 0}</Badge>
                  <Badge variant="secondary" className="text-[10px]">blocked: {promotePreviewResult.summary?.blocked ?? 0}</Badge>
                  <Badge variant="secondary" className="text-[10px]">send_action: none</Badge>
                </div>
                {Array.isArray(promotePreviewResult.plan) && promotePreviewResult.plan.length > 0 && (
                  <div className="overflow-x-auto rounded border border-border/40">
                    <table className="w-full text-[11px]">
                      <thead className="bg-muted/30 text-muted-foreground">
                        <tr>
                          <th className="text-left px-2 py-1">Name</th>
                          <th className="text-left px-2 py-1">Company</th>
                          <th className="text-left px-2 py-1">Email</th>
                          <th className="text-left px-2 py-1">Contact</th>
                          <th className="text-left px-2 py-1">BCR</th>
                          <th className="text-left px-2 py-1">Apollo payload</th>
                          <th className="text-left px-2 py-1">Org payload</th>
                          <th className="text-left px-2 py-1">Profile</th>
                          <th className="text-left px-2 py-1">Queue</th>
                          <th className="text-left px-2 py-1">Send</th>
                        </tr>
                      </thead>
                      <tbody>
                        {promotePreviewResult.plan.map((p: any, idx: number) => (
                          <tr key={p.apollo_lead_id ?? idx} className="border-t border-border/30">
                            <td className="px-2 py-1">{p.name ?? "—"}</td>
                            <td className="px-2 py-1">{p.company ?? "—"}</td>
                            <td className="px-2 py-1 font-mono text-[10px]">{p.email ?? "—"}</td>
                            <td className="px-2 py-1">{p.contact_action}</td>
                            <td className="px-2 py-1">{p.bcr_action}</td>
                            <td className="px-2 py-1">{p.raw_payload_present ? "yes" : "no"}</td>
                            <td className="px-2 py-1">{p.org_payload_present ? "yes" : "no"}</td>
                            <td className="px-2 py-1">{p.profile_action}</td>
                            <td className="px-2 py-1">{p.queue_eligibility}</td>
                            <td className="px-2 py-1 text-muted-foreground">{p.send_action}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                <p className="text-[10px] text-muted-foreground">
                  Sierra and other rejected/held records are filtered server-side via <code>quality_status='qualified'</code> and never appear in this plan.
                </p>
              </div>
            )}
          </div>
        )}

        {/* === Compliance readiness === */}
        {complianceSummary && complianceSummary.total > 0 && (
          <div className="rounded-md border border-primary/30 bg-card/40 p-4 space-y-3">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <p className="text-sm font-semibold text-foreground flex items-center gap-2">
                <ShieldCheck size={14} className="text-primary" /> Compliance readiness
                <Badge variant="outline" className="text-[10px]">Per-contact legal spine</Badge>
              </p>
              <Badge variant={complianceSummary.outreach_allowed > 0 ? "default" : "outline"} className="text-[10px]">
                {complianceSummary.outreach_allowed} outreach-allowed · {complianceSummary.outreach_blocked} blocked
              </Badge>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
              <Tile label="CRM contacts (Apollo-sourced)" value={complianceSummary.total} />
              <Tile label="Lawful basis present" value={complianceSummary.lawful_basis_present} tone="good" />
              <Tile label="Unsubscribe token present" value={complianceSummary.unsubscribe_token_present} tone="good" />
              <Tile label="Retention set (active)" value={complianceSummary.retention_set} tone="good" />
              <Tile label="Compliance pending review" value={complianceSummary.pending_review} tone={complianceSummary.pending_review > 0 ? "warn" : "default"} />
              <Tile label="Outreach allowed" value={complianceSummary.outreach_allowed} tone={complianceSummary.outreach_allowed > 0 ? "good" : "default"} />
              <Tile label="Outreach blocked" value={complianceSummary.outreach_blocked} tone={complianceSummary.outreach_blocked > 0 ? "warn" : "default"} />
              <Tile label="Suppressed" value={complianceSummary.suppressed} tone={complianceSummary.suppressed > 0 ? "warn" : "default"} />
              <Tile label="Hard bounced" value={complianceSummary.hard_bounced} tone={complianceSummary.hard_bounced > 0 ? "danger" : "default"} />
              <Tile label="Unsubscribed" value={complianceSummary.unsubscribed} tone={complianceSummary.unsubscribed > 0 ? "warn" : "default"} />
            </div>
            <div className="overflow-x-auto rounded border border-border/40">
              <table className="w-full text-[11px]">
                <thead className="bg-muted/30 text-muted-foreground">
                  <tr>
                    <th className="text-left px-2 py-1">Contact</th>
                    <th className="text-left px-2 py-1">Business</th>
                    <th className="text-left px-2 py-1">Status</th>
                    <th className="text-left px-2 py-1">Lawful basis</th>
                    <th className="text-left px-2 py-1">Unsub token</th>
                    <th className="text-left px-2 py-1">Retention</th>
                    <th className="text-left px-2 py-1">Compliance</th>
                  </tr>
                </thead>
                <tbody>
                  {complianceSummary.rows
                    .filter(r => r.assigned_business === "Neon Candy")
                    .map(r => (
                      <tr key={r.id} className="border-t border-border/30">
                        <td className="px-2 py-1">{r.name || r.email}</td>
                        <td className="px-2 py-1">{r.assigned_business || "—"}</td>
                        <td className="px-2 py-1">{r.status}</td>
                        <td className="px-2 py-1">{r.lawful_basis ?? "—"}</td>
                        <td className="px-2 py-1">{r.unsubscribe_token ? "yes" : "no"}</td>
                        <td className="px-2 py-1">{r.retention_until ? new Date(r.retention_until).toLocaleDateString() : "—"}</td>
                        <td className="px-2 py-1">
                          <Badge variant="outline" className="text-[10px]">
                            {r.compliance_status ?? "—"}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
            <p className="text-[10px] text-muted-foreground">
              <code>pending_review</code> blocks outreach by design. The founder must explicitly approve <code>compliance_status='outreach_allowed'</code> per contact before any queue or send is permitted. Auto-send remains OFF.
            </p>
          </div>
        )}

        {/* === Stage-to-Queue Eligibility Gate ===
            Founder-controlled gate that flips qualified BCRs from
            ready_to_stage / needs_review / not eligible →
            qualified / staged / eligible, and assigns the inbox + campaign on
            the contact. Does NOT create queue rows or send emails. */}
        {(true) && (
          <div className="rounded-md border border-primary/40 bg-primary/5 p-4 space-y-3">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div>
                <p className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <CheckCircle2 size={14} className="text-primary" /> Stage-to-Queue Eligibility Gate
                  <Badge variant="outline" className="text-[10px]">Neon Candy · hello@neoncandy.online</Badge>
                </p>
                <ul className="text-xs text-muted-foreground mt-1 space-y-0.5 list-disc list-inside">
                  {stagePreviewResult || stageAppliedResult ? (
                    <li>
                      <strong className="text-foreground">
                        {(stageAppliedResult ?? stagePreviewResult)?.summary?.eligible_to_stage ?? 0}
                      </strong>{" "}
                      contact(s) eligible for queue staging from this Apollo promotion batch
                    </li>
                  ) : (
                    <li className="text-yellow-300"><strong>Preview required before approval.</strong> Click <em>Preview stage-to-queue eligibility</em> to compute the exact eligible set.</li>
                  )}
                  <li>Sets BCR <code>qualification=qualified</code>, <code>campaign_eligible=true</code>, <code>current_stage=staged</code></li>
                  <li>Assigns inbox + active campaign on the contact row</li>
                  <li>Does <strong>not</strong> create queue rows; does <strong>not</strong> send emails; auto-send stays OFF</li>
                  <li>Sierra (rejected) and Jack (prior sequence history) are filtered server-side</li>
                </ul>
              </div>
              <div className="flex gap-2 flex-wrap">
                <Button size="sm" variant="outline" disabled={!!busy} onClick={() => runStageToQueue(true)}>
                  {busy === "Stage preview" ? <Loader2 className="animate-spin" size={14} /> : "Preview stage-to-queue eligibility"}
                </Button>
                <Button size="sm" variant="default"
                  disabled={!!busy || !stagePreviewResult || (stagePreviewResult?.summary?.eligible_to_stage ?? 0) === 0}
                  onClick={() => runStageToQueue(false)}
                  title={!stagePreviewResult ? "Run preview first" : undefined}>
                  {busy === "Stage apply" ? <Loader2 className="animate-spin" size={14} /> : `Approve ${stagePreviewResult?.summary?.eligible_to_stage ?? 0} for queue eligibility`}
                </Button>
              </div>
            </div>
            {!stagePreviewResult && !stageAppliedResult && (
              <p className="text-[11px] text-yellow-300">
                Apply button is disabled until <strong>Preview stage-to-queue eligibility</strong> succeeds in this session.
              </p>
            )}
            {(stagePreviewResult || stageAppliedResult) && (() => {
              const r = stageAppliedResult ?? stagePreviewResult;
              const s = r?.summary ?? {};
              const planRows: any[] = Array.isArray(r?.plan) ? r.plan : [];
              return (
                <div className="rounded border border-border/50 bg-card/40 p-3 space-y-2 text-xs">
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="secondary" className="text-[10px]">candidates_checked: {s.candidates_checked ?? 0}</Badge>
                    <Badge variant="secondary" className="text-[10px]">eligible_to_stage: {s.eligible_to_stage ?? 0}</Badge>
                    <Badge variant="secondary" className="text-[10px]">already_staged: {s.already_staged ?? 0}</Badge>
                    <Badge variant="secondary" className="text-[10px]">excluded_already_contacted: {s.excluded_already_contacted ?? 0}</Badge>
                    <Badge variant="secondary" className="text-[10px]">excluded_rejected: {s.excluded_rejected ?? 0}</Badge>
                    <Badge variant="secondary" className="text-[10px]">bcrs_to_qualify: {s.bcrs_to_qualify ?? 0}</Badge>
                    <Badge variant="secondary" className="text-[10px]">contacts_to_assign_inbox: {s.contacts_to_assign_inbox ?? 0}</Badge>
                    <Badge variant="secondary" className="text-[10px]">contacts_to_assign_campaign: {s.contacts_to_assign_campaign ?? 0}</Badge>
                    <Badge variant="secondary" className="text-[10px]">queue_rows_to_create: 0</Badge>
                    <Badge variant="secondary" className="text-[10px]">sends_to_create: 0</Badge>
                  </div>
                  {stageAppliedResult && (
                    <div className="rounded border border-green-500/30 bg-green-500/5 p-2 text-[11px] text-foreground">
                      Staged for queue eligibility: <strong>{s.bcrs_qualified_now ?? 0}</strong> · Queue rows created: <strong>0</strong> · Emails sent: <strong>0</strong>.{" "}
                      Next: <span className="text-primary">Preview queue creation for {s.bcrs_qualified_now ?? s.eligible_to_stage ?? 0} staged contacts. Auto-send remains OFF.</span>
                    </div>
                  )}
                  {planRows.length > 0 && (
                    <div className="overflow-x-auto rounded border border-border/40">
                      <table className="w-full text-[11px]">
                        <thead className="bg-muted/30 text-muted-foreground">
                          <tr>
                            <th className="text-left px-2 py-1">Name</th>
                            <th className="text-left px-2 py-1">Email</th>
                            <th className="text-left px-2 py-1">Company</th>
                            <th className="text-left px-2 py-1">Stage</th>
                            <th className="text-left px-2 py-1">Qualif.</th>
                            <th className="text-left px-2 py-1">Eligible</th>
                            <th className="text-left px-2 py-1">Eligibility</th>
                            <th className="text-left px-2 py-1">Reason</th>
                          </tr>
                        </thead>
                        <tbody>
                          {planRows.map((p: any) => (
                            <tr key={p.contact_id} className="border-t border-border/30">
                              <td className="px-2 py-1">{p.name ?? "—"}</td>
                              <td className="px-2 py-1 font-mono text-[10px]">{p.email ?? "—"}</td>
                              <td className="px-2 py-1">{p.company ?? "—"}</td>
                              <td className="px-2 py-1">{p.current_stage ?? "—"}</td>
                              <td className="px-2 py-1">{p.qualification ?? "—"}</td>
                              <td className="px-2 py-1">{p.campaign_eligible ? "yes" : "no"}</td>
                              <td className={`px-2 py-1 ${p.eligibility === "eligible_to_stage" ? "text-green-300" : p.eligibility === "already_staged" ? "text-muted-foreground" : "text-yellow-300"}`}>
                                {p.eligibility}
                              </td>
                              <td className="px-2 py-1 text-muted-foreground">{p.blocker_reason ?? "—"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                  <p className="text-[10px] text-muted-foreground">
                    Sierra is filtered via <code>apollo_raw_leads.quality_status='rejected'</code>. Jack is filtered via prior sent/cancelled <code>email_queue</code> rows for the same campaign. No Apollo credits, no reveals, no contact/BCR creation.
                  </p>
                </div>
              );
            })()}
          </div>
        )}

        <details className="rounded-md border border-border/50 bg-muted/20 p-3 group">
          <summary className="cursor-pointer text-xs font-medium text-foreground flex items-center gap-2">
            <AlertTriangle size={12} className="text-yellow-400" />
            Legacy Apollo Pool — optional / not recommended
            <Badge variant="outline" className="text-[10px]">collapsed by default</Badge>
          </summary>
          <p className="text-[11px] text-muted-foreground mt-2">
            Legacy pool is retained for learning only. Autopilot does not recommend spending credits here.
            These controls operate on the old 150-lead pool (raw / needs-verification / unlock shortlist / AI classification).
            Use only if the founder explicitly overrides the verified-email-first sourcing rule.
          </p>
          {overview && (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mt-3">
              <Tile label="Apollo total" value={overview?.total_leads ?? 0} />
              <Tile label="Raw" value={overview?.raw_leads ?? 0} />
              <Tile label="Reviewed" value={overview?.reviewed_leads ?? 0} />
              <Tile label="Qualified" value={overview?.qualified_leads ?? 0} tone="good" />
              <Tile label="Promoted contacts" value={overview?.promoted_contacts ?? 0} tone="good" />
              <Tile label="Needs verification" value={overview?.needs_verification ?? 0} tone="warn" />
              <Tile label="Needs founder review (live decisions)" value={livePendingDecisions} tone={livePendingDecisions > 0 ? "warn" : "default"} />
              <Tile label="Rejected" value={overview?.rejected_leads ?? 0} tone="danger" />
              <Tile label="Terminal blocked" value={overview?.terminal_blocked ?? 0} tone="danger" />
              <Tile label="Duplicate / risky" value={overview?.duplicate_or_risky ?? 0} tone="warn" />
              <Tile label="Safe to queue" value={overview?.safe_to_queue ?? 0} tone="good" />
              <Tile label="Unlock shortlist (last run)" value={shortlistResult?.shortlist_count ?? "—"} tone="default" />
              <Tile label="Est. unlock credits (unique only)" value={shortlistResult?.shortlist_count ?? "—"} tone="default" />
              <Tile label="Duplicate rows collapsed" value={shortlistResult?.duplicate_rows_collapsed ?? "—"} tone="warn" />
              <Tile label="Unique persons in pool" value={shortlistResult?.unique_persons ?? "—"} tone="default" />
            </div>
          )}
          <div className="space-y-3 pt-3 mt-3 border-t border-border/40">
          <div className="flex flex-wrap gap-2 items-center">
            <p className="text-xs text-muted-foreground w-full">1. Cheap quality scan (no AI)</p>
            <Button size="sm" variant="outline" disabled={!!busy}
              onClick={() => call("lead-quality-scan", { dry_run: true, limit: 5000 }, "Scan preview")}>
              {busy === "Scan preview" ? <Loader2 className="animate-spin" size={14} /> : "Preview scan — all raw"}
            </Button>
            <Button size="sm" disabled={!!busy}
              onClick={() => call("lead-quality-scan", { dry_run: false, limit: 5000 }, "Scan apply")}>
              {busy === "Scan apply" ? <Loader2 className="animate-spin" size={14} /> : "Apply scan — all raw"}
            </Button>
          </div>

          <div className="flex flex-wrap gap-2 items-center">
            <p className="text-xs text-muted-foreground w-full">2. Campaign-fit classification (rules = whole batch · AI = selected, with cost confirmation)</p>
            <Button size="sm" variant="outline" disabled={!!busy}
              onClick={() => call("lead-fit-classify", { dry_run: true, method: "rules", limit: 5000 }, "Rules preview")}>
              {busy === "Rules preview" ? <Loader2 className="animate-spin" size={14} /> : "Preview rules — all eligible"}
            </Button>
            <Button size="sm" disabled={!!busy}
              onClick={() => call("lead-fit-classify", { dry_run: false, method: "rules", limit: 5000 }, "Rules apply")}>
              {busy === "Rules apply" ? <Loader2 className="animate-spin" size={14} /> : "Apply rules — all eligible"}
            </Button>
            <span className="mx-2 text-muted-foreground">|</span>
            <Input type="number" className="w-24 h-8" value={aiBatchSize} min={1} max={500}
              onChange={(e) => setAiBatchSize(Math.min(500, Math.max(1, Number(e.target.value) || 25)))} />
            <span className="text-xs text-muted-foreground">selection size (chunked internally)</span>
            <Button size="sm" variant="outline" disabled={!!busy}
              onClick={() => call("lead-fit-classify", { dry_run: true, method: "ai", limit: aiBatchSize, ai_chunk_size: 25 }, "AI preview")}>
              <Sparkles size={12} /> Preview AI ({aiBatchSize} selected)
            </Button>
            <Button size="sm" disabled={!!busy}
              onClick={() => {
                if (!confirm(`Run AI classification on ${aiBatchSize} leads?\nCost is per-lead via Lovable AI Gateway. Continue?`)) return;
                call("lead-fit-classify", { dry_run: false, method: "ai", limit: aiBatchSize, ai_chunk_size: 25, confirm_ai_cost: true }, "AI apply");
              }}>
              {busy === "AI apply" ? <Loader2 className="animate-spin" size={14} /> : `Apply AI (${aiBatchSize}, confirm cost)`}
            </Button>
            <span className="text-xs text-muted-foreground w-full">AI is internally chunked at 25 per request (one founder click). Absolute ceiling 500 / action.</span>
          </div>

          <div className="flex flex-wrap gap-2 items-center">
            <p className="text-xs text-muted-foreground w-full flex items-center gap-1">
              <KeyRound size={12} /> 3. Apollo Email Reveal Shortlist (deterministic ranking — NO Apollo calls, NO credits)
            </p>
            <span className="text-xs text-muted-foreground">Recommended reveal batch (max 25, no padding):</span>
            {[25, 50, 200].map((n) => (
              <Button key={n} size="sm" variant={unlockBatchSize === n ? "default" : "outline"} disabled={!!busy}
                onClick={() => setUnlockBatchSize(n)}>
                {n === 200 ? "All" : n}
              </Button>
            ))}
            <Button size="sm" variant="outline" disabled={!!busy}
              onClick={() => call("apollo-unlock-shortlist", { batch_size: unlockBatchSize, min_score: 4 }, "Unlock shortlist")}>
              {busy === "Unlock shortlist" ? <Loader2 className="animate-spin" size={14} /> : `Build reveal shortlist (${unlockBatchSize === 200 ? "all" : unlockBatchSize})`}
            </Button>
            <span className="text-xs text-yellow-300 w-full">
              No Apollo credits spent until founder approves the reveal/enrichment. Shortlist is generated from local data only — search results plus CRM/dedupe/bounce checks. Credit estimate counts unique recommended candidates only.
            </span>
            {shortlistResult && (
              <div className="w-full mt-2 rounded border border-border/50 bg-card/40 p-3 space-y-2">
                <div className="flex flex-wrap gap-3 text-xs">
                  <span><span className="text-muted-foreground">Recommended reveal candidates (unique):</span> <strong>{shortlistResult.shortlist_count}</strong></span>
                  <span><span className="text-muted-foreground">Deprioritised:</span> <strong>{shortlistResult.deprioritised_count}</strong></span>
                  <span><span className="text-muted-foreground">Candidate pool:</span> <strong>{shortlistResult.total_needs_verification}</strong></span>
                  <span><span className="text-muted-foreground">Unique persons:</span> <strong>{shortlistResult.unique_persons ?? "—"}</strong></span>
                  <span><span className="text-muted-foreground">Duplicates collapsed:</span> <strong>{shortlistResult.duplicate_rows_collapsed ?? 0}</strong></span>
                  <span><span className="text-muted-foreground">Excluded by CRM:</span> <strong>{shortlistResult.blocked_by_crm ?? 0}</strong></span>
                  <span><span className="text-muted-foreground">Est. Apollo reveal credits:</span> <strong>{shortlistResult.apollo_credit_estimate ?? shortlistResult.shortlist_count}</strong></span>
                  <span><span className="text-muted-foreground">Min score:</span> <strong>{shortlistResult.min_score}</strong></span>
                </div>
                {shortlistResult.fit_breakdown && (
                  <div className="flex flex-wrap gap-1.5">
                    {Object.entries(shortlistResult.fit_breakdown)
                      .sort((a: any, b: any) => b[1] - a[1])
                      .slice(0, 6)
                      .map(([fit, n]: any) => (
                        <Badge key={fit} variant="secondary" className="text-[10px]">
                          {fit}: {n}
                        </Badge>
                      ))}
                  </div>
                )}
                {Array.isArray(shortlistResult.shortlist) && shortlistResult.shortlist.length > 0 && (
                  <div className="overflow-x-auto rounded border border-border/40">
                    <table className="w-full text-[11px]">
                      <thead className="bg-muted/30 text-muted-foreground">
                        <tr>
                          <th className="text-left px-2 py-1">#</th>
                          <th className="text-left px-2 py-1">Name</th>
                          <th className="text-left px-2 py-1">Title</th>
                          <th className="text-left px-2 py-1">Company</th>
                          <th className="text-left px-2 py-1">Geo</th>
                          <th className="text-left px-2 py-1">Apollo person</th>
                          <th className="text-left px-2 py-1">Fit</th>
                          <th className="text-left px-2 py-1">Score</th>
                          <th className="text-left px-2 py-1">Reasons</th>
                          <th className="text-left px-2 py-1">Recommendation</th>
                        </tr>
                      </thead>
                      <tbody>
                        {shortlistResult.shortlist.slice(0, 25).map((r: any, idx: number) => (
                          <tr key={r.apollo_person_id ?? r.apollo_lead_id ?? idx} className="border-t border-border/30">
                            <td className="px-2 py-1">{idx + 1}</td>
                            <td className="px-2 py-1">{r.name || "—"}</td>
                            <td className="px-2 py-1">{r.title || "—"}</td>
                            <td className="px-2 py-1">{r.company || "—"}</td>
                            <td className="px-2 py-1">{r.country || "—"}</td>
                            <td className="px-2 py-1 font-mono text-[10px]">{r.apollo_person_id?.slice?.(0, 8) ?? "—"}</td>
                            <td className="px-2 py-1">{r.fit}</td>
                            <td className="px-2 py-1">{r.score}</td>
                            <td className="px-2 py-1">{(r.reasons ?? []).slice(0, 3).join(", ")}</td>
                            <td className="px-2 py-1">
                              {r.crm_safe_to_unlock && !r.previously_attempted_no_email
                                ? <span className="text-green-300">reveal</span>
                                : r.previously_attempted_no_email
                                  ? <span className="text-muted-foreground">skip</span>
                                  : <span className="text-yellow-300">hold</span>}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                <p className="text-[11px] text-muted-foreground">
                  Risk notes: domain de-dup against existing contacts, missing-title penalty, hospitality/generic-corporate negative weights applied.
                </p>
                <div className="flex flex-wrap gap-2 items-center pt-2 border-t border-border/40 mt-2">
                  <span className="text-[11px] text-yellow-300 w-full">
                    Founder approval gate: spend approximately {shortlistResult.apollo_credit_estimate ?? shortlistResult.shortlist_count} Apollo credits to reveal emails for the {shortlistResult.shortlist_count} canonical unique candidates. Duplicates ({shortlistResult.duplicate_rows_collapsed ?? 0}) are NOT charged. Promotion and queueing remain separate, manual steps.
                  </span>
                  <Button size="sm" variant="outline" disabled={!!busy}
                    onClick={() => call("apollo-unlock-selected", { dry_run: true }, "Unlock preview")}>
                    {busy === "Unlock preview" ? <Loader2 className="animate-spin" size={14} /> : "Preview reveal (no credits)"}
                  </Button>
                  <Button size="sm" disabled={!!busy}
                    onClick={() => {
                      const n = shortlistResult.shortlist_count ?? 0;
                      if (!confirm(`Reveal emails for ${n} selected Apollo candidates?\n\nEstimated cost: ${n} Apollo credits.\nApollo /people/match will be called for the ${n} canonical unique candidates only.\nDuplicates and CRM-known leads are excluded and will NOT be charged.\nContacts will NOT be promoted, enqueued, or sent automatically.`)) return;
                      call("apollo-unlock-selected", { confirm: true }, "Unlock execute");
                    }}>
                    {busy === "Unlock execute" ? <Loader2 className="animate-spin" size={14} /> : `Reveal emails for ${shortlistResult.shortlist_count ?? 0} selected Apollo candidates`}
                  </Button>
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-2 items-center">
            <p className="text-xs text-muted-foreground w-full">4. Promote {lifecycle?.safe_to_promote ?? 0} validation-clean contact(s){(overview?.needs_founder_review ?? 0) > 0 ? ` · review/hold ${overview?.needs_founder_review} founder decision(s)` : ""}</p>
            <Button size="sm" variant="outline" disabled={!!busy}
              onClick={() => call("promote-leads-to-contacts", { dry_run: true, limit: 100 }, "Promote preview")}>
              {busy === "Promote preview" ? <Loader2 className="animate-spin" size={14} /> : `Preview promote (${lifecycle?.safe_to_promote ?? 0})`}
            </Button>
            <Button size="sm" disabled={!!busy}
              onClick={() => call("promote-leads-to-contacts", { dry_run: false, limit: 100 }, "Promote apply")}>
              {busy === "Promote apply" ? <Loader2 className="animate-spin" size={14} /> : `Promote ${lifecycle?.safe_to_promote ?? 0} validation-clean contact(s)`}
            </Button>
          </div>

          <div className="flex flex-wrap gap-2 items-center">
            <p className="text-xs text-muted-foreground w-full">5. Enqueue eligible contacts (Step 1, balanced)</p>
            <Input type="number" className="w-24 h-8" value={batchSize} min={1} max={500}
              onChange={(e) => setBatchSize(Math.min(500, Math.max(1, Number(e.target.value) || 25)))} />
            <span className="text-xs text-muted-foreground">batch</span>
            <Input type="number" className="w-20 h-8" value={perDomainCap} min={1} max={50}
              onChange={(e) => setPerDomainCap(Math.min(50, Math.max(1, Number(e.target.value) || 2)))} />
            <span className="text-xs text-muted-foreground">per-domain cap</span>
            <Button size="sm" variant="outline" disabled={!!busy}
              onClick={() => call("enqueue-eligible-contacts", { dry_run: true, batch_size: batchSize, per_domain_cap: perDomainCap }, "Enqueue preview")}>
              {busy === "Enqueue preview" ? <Loader2 className="animate-spin" size={14} /> : "Preview enqueue"}
            </Button>
            <Button size="sm" disabled={!!busy}
              onClick={() => call("enqueue-eligible-contacts", { dry_run: false, batch_size: batchSize, per_domain_cap: perDomainCap }, "Enqueue apply")}>
              {busy === "Enqueue apply" ? <Loader2 className="animate-spin" size={14} /> : "Apply enqueue"}
            </Button>
          </div>
          </div>
        </details>

        <div className="rounded-md border border-yellow-500/30 bg-yellow-500/5 p-3 text-xs flex gap-2">
          <AlertTriangle size={14} className="text-yellow-400 mt-0.5" />
          <div>
            All actions default to <strong>dry-run preview</strong>. No live emails are sent by this panel.
            Sending still requires the existing Controlled Live Batch step with founder confirmation.
          </div>
        </div>

        {lastResult && (
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <CheckCircle2 size={12} /> Last result {lastResult?.dry_run ? "(dry-run)" : "(applied)"}
            </p>
            <ResultCard result={lastResult} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}