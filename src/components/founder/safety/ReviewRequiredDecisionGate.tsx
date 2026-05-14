import { useMemo, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Check, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

const ELIGIBLE_QUEUE_IDS = new Set<string>([
  "77a84330-a066-4a28-983f-e42adf295936",
  "2771e102-7d76-4ab3-bb16-29d8769d7b02",
  "0fe97fb4-1947-40d8-b983-9bfa419a21f7",
  "11d3c5bf-31d3-414d-9093-bcba5c78a618",
  "0c46352b-cf98-4bbb-98b6-a24a6aa97f64",
  "0d14b45e-2142-4db4-b66d-aab530c03cf2",
  "baec3a1a-3430-4172-940e-d99843abea3e",
]);
export const CONFIRMATION_TEXT =
  "I understand this parks selected review-required follow-ups and sends nothing";
const REQUIRED_SELECTED_COUNT = ELIGIBLE_QUEUE_IDS.size;

export function normalizeConfirmationText(value: string | null | undefined): string {
  return String(value || "").trim().replace(/\s+/g, " ");
}
const NORMALIZED_EXPECTED = normalizeConfirmationText(CONFIRMATION_TEXT);

type DecisionApplyReadinessInput = {
  acknowledgementChecked: boolean;
  confirmationValue: string;
  decisions: Record<string, DecisionOption>;
  forbiddenSelectedIds: string[];
  founderAuthenticated: boolean;
  previewMatchesSelection: boolean;
  previewResult: any | null;
  selectedIds: string[];
};

export type DecisionApplyReadiness = {
  acknowledgementChecked: boolean;
  apolloZero: boolean;
  canApply: boolean;
  confirmationExact: boolean;
  contactsBcrComplianceZero: boolean;
  disabledReasons: string[];
  emailsZero: boolean;
  expectedNormalizedLength: number;
  forbiddenStep2TouchedZero: boolean;
  founderAuthenticated: boolean;
  onlyParkFollowup: boolean;
  previewMatchesSelection: boolean;
  previewSucceeded: boolean;
  selectedCountValid: boolean;
  smtpZero: boolean;
  typedHadEdgeWhitespace: boolean;
  typedNormalizedLength: number;
};

const isZeroCounter = (value: unknown) => Number(value) === 0;

export function getDecisionApplyReadiness({
  acknowledgementChecked,
  confirmationValue,
  decisions,
  forbiddenSelectedIds,
  founderAuthenticated,
  previewMatchesSelection,
  previewResult,
  selectedIds,
}: DecisionApplyReadinessInput): DecisionApplyReadiness {
  const normalizedConfirmation = normalizeConfirmationText(confirmationValue);
  const rawConfirmation = String(confirmationValue || "");
  const previewSucceeded = Boolean(previewResult?.ok);
  const counters = previewResult?.counters ?? {};

  const readiness: DecisionApplyReadiness = {
    founderAuthenticated: Boolean(founderAuthenticated),
    previewSucceeded,
    previewMatchesSelection: previewSucceeded && previewMatchesSelection,
    selectedCountValid: selectedIds.length === REQUIRED_SELECTED_COUNT,
    onlyParkFollowup:
      selectedIds.length > 0 &&
      selectedIds.every((id) => decisions[id] === "recommend_park_followup"),
    forbiddenStep2TouchedZero:
      previewSucceeded &&
      forbiddenSelectedIds.length === 0 &&
      isZeroCounter(counters.valid_future_step_blocked_rows_touched),
    confirmationExact: normalizedConfirmation === NORMALIZED_EXPECTED,
    acknowledgementChecked,
    emailsZero: previewSucceeded && isZeroCounter(counters.emails_sent),
    smtpZero: previewSucceeded && isZeroCounter(counters.smtp_calls),
    apolloZero: previewSucceeded && isZeroCounter(counters.apollo_calls),
    contactsBcrComplianceZero:
      previewSucceeded &&
      isZeroCounter(counters.contacts_changed_if_applied) &&
      isZeroCounter(counters.bcrs_changed_if_applied) &&
      isZeroCounter(counters.compliance_records_changed_if_applied),
    canApply: false,
    disabledReasons: [],
    expectedNormalizedLength: NORMALIZED_EXPECTED.length,
    typedNormalizedLength: normalizedConfirmation.length,
    typedHadEdgeWhitespace: rawConfirmation.length > 0 && rawConfirmation.trim() !== rawConfirmation,
  };

  if (!readiness.founderAuthenticated) {
    readiness.disabledReasons.push("Founder/admin authentication required.");
  }
  if (!readiness.previewSucceeded) {
    readiness.disabledReasons.push("Preview has not been run yet.");
  }
  if (readiness.previewSucceeded && !readiness.previewMatchesSelection) {
    readiness.disabledReasons.push("Preview is stale — re-run preview after changing selection.");
  }
  if (!readiness.selectedCountValid) {
    readiness.disabledReasons.push(`Selected rows must equal ${REQUIRED_SELECTED_COUNT}.`);
  }
  if (!readiness.onlyParkFollowup) {
    readiness.disabledReasons.push("All selected rows must have decision = park_followup.");
  }
  if (forbiddenSelectedIds.length > 0) {
    readiness.disabledReasons.push("Selection contains rows outside the 7 eligible Step 4 IDs.");
  } else if (readiness.previewSucceeded && !readiness.forbiddenStep2TouchedZero) {
    readiness.disabledReasons.push("Forbidden Step 2 rows would be touched by this apply path.");
  }
  if (!readiness.confirmationExact) {
    readiness.disabledReasons.push("Confirmation text does not match exactly.");
  }
  if (!readiness.acknowledgementChecked) {
    readiness.disabledReasons.push("Acknowledgement checkbox is not ticked.");
  }
  if (readiness.previewSucceeded && !readiness.emailsZero) {
    readiness.disabledReasons.push("Preview shows non-zero emails to send.");
  }
  if (readiness.previewSucceeded && !readiness.smtpZero) {
    readiness.disabledReasons.push("Preview shows non-zero SMTP calls.");
  }
  if (readiness.previewSucceeded && !readiness.apolloZero) {
    readiness.disabledReasons.push("Preview shows non-zero Apollo calls.");
  }
  if (readiness.previewSucceeded && !readiness.contactsBcrComplianceZero) {
    readiness.disabledReasons.push("Preview shows contact/BCR/compliance mutations.");
  }

  readiness.canApply = readiness.disabledReasons.length === 0;
  return readiness;
}

export type DecisionOption =
  | "leave_under_review"
  | "recommend_park_followup"
  | "recommend_compliance_remediation_review"
  | "recommend_do_not_contact";

const OPTIONS: { id: DecisionOption; label: string; help: string }[] = [
  { id: "leave_under_review", label: "Leave under review", help: "Leave under review — no data changes." },
  { id: "recommend_park_followup", label: "Recommend park followup", help: "Recommended if founder does not want to remediate old outreach records." },
  { id: "recommend_compliance_remediation_review", label: "Recommend compliance remediation review", help: "Requires founder confirmation of lawful basis before any update." },
  { id: "recommend_do_not_contact", label: "Recommend do-not-contact", help: "Use only if founder decides no further outreach should ever be sent." },
];

const fmt = (s: string | null | undefined) => (s ? new Date(s).toISOString().slice(0, 16).replace("T", " ") : "—");
const yn = (b: boolean | null | undefined) => (b === true ? "yes" : b === false ? "no" : "—");

function defaultRecommendation(it: any): DecisionOption {
  // Conservative: prior steps sent but missing lawful_basis & unsubscribe_token → park followup.
  const priorSent = (it.prior_sent_steps?.length ?? 0) > 0;
  const missingBasis = !it.lawful_basis;
  const missingUnsub = !it.unsubscribe_token_present;
  if (priorSent && missingBasis && missingUnsub) return "recommend_park_followup";
  return "leave_under_review";
}

export const ReviewRequiredDecisionGate = ({ items }: { items: any[] }) => {
  const { session } = useAuth();
  const reviewItems = useMemo(
    () => (items ?? []).filter((i) => i.classification === "review_required"),
    [items],
  );
  const [decisions, setDecisions] = useState<Record<string, DecisionOption>>(() => {
    const init: Record<string, DecisionOption> = {};
    for (const it of reviewItems) init[it.queue_id] = defaultRecommendation(it);
    return init;
  });

  // Apply-path state.
  const eligibleItems = useMemo(
    () => reviewItems.filter((it) => ELIGIBLE_QUEUE_IDS.has(it.queue_id)),
    [reviewItems],
  );
  const [selected, setSelected] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    for (const it of reviewItems) {
      if (ELIGIBLE_QUEUE_IDS.has(it.queue_id)) init[it.queue_id] = true;
    }
    return init;
  });
  const [ack, setAck] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const [previewing, setPreviewing] = useState(false);
  const [applying, setApplying] = useState(false);
  const [previewResult, setPreviewResult] = useState<any>(null);
  const [applyResult, setApplyResult] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const confirmationInputRef = useRef<HTMLInputElement>(null);

  const selectedIds = useMemo(
    () => eligibleItems.filter((it) => selected[it.queue_id]).map((it) => it.queue_id).sort(),
    [eligibleItems, selected],
  );
  const previewedIds: string[] = useMemo(
    () => ((previewResult?.selected_queue_ids ?? []) as string[]).slice().sort(),
    [previewResult],
  );
  // Set-based (order-independent) match between preview and current selection.
  const previewMatches = useMemo(() => {
    if (previewedIds.length === 0) return false;
    if (previewedIds.length !== selectedIds.length) return false;
    const a = new Set(previewedIds);
    return selectedIds.every((id) => a.has(id));
  }, [previewedIds, selectedIds]);

  const forbiddenSelected = selectedIds.filter((id) => !ELIGIBLE_QUEUE_IDS.has(id));
  const applyReadiness = useMemo(
    () =>
      getDecisionApplyReadiness({
        acknowledgementChecked: ack,
        confirmationValue: confirmation,
        decisions,
        forbiddenSelectedIds: forbiddenSelected,
        founderAuthenticated: Boolean(session?.access_token),
        previewMatchesSelection: previewMatches,
        previewResult,
        selectedIds,
      }),
    [ack, confirmation, decisions, forbiddenSelected, previewMatches, previewResult, selectedIds, session?.access_token],
  );
  const applyButtonDisabled = !applyReadiness.canApply || applying;
  const applyButtonStateError = applyReadiness.canApply && applyButtonDisabled && !applying;

  async function callDecisionFn(payload: any) {
    const { data: sess } = await supabase.auth.getSession();
    const token = sess.session?.access_token;
    if (!token) throw new Error("Not signed in");
    const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/review-required-queue-decision`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      },
      body: JSON.stringify(payload),
    });
    const text = await res.text();
    let json: any = null;
    try { json = text ? JSON.parse(text) : null; } catch { /* ignore */ }
    if (!res.ok || !json?.ok) throw new Error(json?.error || `Request failed (${res.status})`);
    return json;
  }

  async function onPreview() {
    setErrorMsg(null);
    setApplyResult(null);
    if (selectedIds.length === 0) {
      setErrorMsg("Select at least one eligible row.");
      return;
    }
    setPreviewing(true);
    try {
      const res = await callDecisionFn({
        dry_run: true,
        decisions: selectedIds.map((id) => ({ queue_id: id, decision: "park_followup" })),
      });
      setPreviewResult(res);
    } catch (e: any) {
      setErrorMsg(e?.message ?? "Preview failed");
    } finally {
      setPreviewing(false);
    }
  }

  async function onApply() {
    setErrorMsg(null);
    if (!applyReadiness.canApply) {
      setErrorMsg(`Apply disabled because: ${applyReadiness.disabledReasons.join(" | ")}`);
      return;
    }
    setApplying(true);
    try {
      const res = await callDecisionFn({
        dry_run: false,
        decisions: selectedIds.map((id) => ({ queue_id: id, decision: "park_followup" })),
        confirmation: CONFIRMATION_TEXT,
      });
      setApplyResult(res);
      toast({
        title: "Decision applied",
        description: `Parked ${res.rows_changed} review-required follow-up(s). Re-run audit to confirm.`,
      });
    } catch (e: any) {
      setErrorMsg(e?.message ?? "Apply failed");
    } finally {
      setApplying(false);
    }
  }

  function onCopyConfirmationPhrase() {
    setConfirmation(CONFIRMATION_TEXT);
    queueMicrotask(() => {
      confirmationInputRef.current?.focus();
      confirmationInputRef.current?.setSelectionRange(CONFIRMATION_TEXT.length, CONFIRMATION_TEXT.length);
    });
  }

  const counts = useMemo(() => {
    const c = {
      total: reviewItems.length,
      park: 0,
      remediation: 0,
      do_not_contact: 0,
      under_review: 0,
      with_prior_proof: 0,
      missing_lawful_basis: 0,
      missing_unsubscribe_token: 0,
      bcr_valid: 0,
      suppression_blockers: 0,
      prior_reply: 0,
    };
    for (const it of reviewItems) {
      const d = decisions[it.queue_id] ?? defaultRecommendation(it);
      if (d === "recommend_park_followup") c.park += 1;
      if (d === "recommend_compliance_remediation_review") c.remediation += 1;
      if (d === "recommend_do_not_contact") c.do_not_contact += 1;
      if (d === "leave_under_review") c.under_review += 1;
      if ((it.prior_sent_steps?.length ?? 0) > 0) c.with_prior_proof += 1;
      if (!it.lawful_basis) c.missing_lawful_basis += 1;
      if (!it.unsubscribe_token_present) c.missing_unsubscribe_token += 1;
      if (it.bcr_business_match && it.bcr_campaign_eligible !== false && it.bcr_do_not_contact !== true) c.bcr_valid += 1;
      if ((it.blockers ?? []).some((b: string) => ["globally_suppressed", "hard_bounced", "unsubscribed", "do_not_contact"].includes(b))) c.suppression_blockers += 1;
      if (it.prior_reply) c.prior_reply += 1;
    }
    return c;
  }, [reviewItems, decisions]);

  const setDecision = (id: string, d: DecisionOption) =>
    setDecisions((prev) => ({ ...prev, [id]: d }));

  return (
    <Card id="review-required-decision-gate" data-testid="review-required-decision-gate">
      <CardHeader>
        <CardTitle>Review Required Queue Rows — Decision Gate</CardTitle>
        <p className="text-xs text-muted-foreground mt-1">
          Founder decision gate for pending rows where the compliance spine is incomplete.
          A founder-only Apply path exists only for park_followup on the 7 eligible Step 4 rows.
          No emails sent. No SMTP / Apollo / contact / BCR / compliance / campaign / inbox /
          system_settings / cron mutations.
        </p>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <Alert>
          <ShieldAlert />
          <AlertTitle>Park-only Apply path — no sending, no compliance changes</AlertTitle>
          <AlertDescription>
            This does not approve compliance, does not generate unsubscribe tokens, does not send
            emails, and does not build Manual Send Apply. It only parks old Step 4 follow-ups that
            are missing the newer compliance spine.
          </AlertDescription>
        </Alert>

        {/* Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2 text-xs">
          <Stat label="review_required total" value={counts.total} />
          <Stat label="default → park" value={counts.park} />
          <Stat label="eligible → remediation review" value={counts.remediation} />
          <Stat label="recommended do-not-contact" value={counts.do_not_contact} />
          <Stat label="left under review" value={counts.under_review} />
          <Stat label="with prior Step 1/2/3 proof" value={counts.with_prior_proof} />
          <Stat label="missing lawful_basis" value={counts.missing_lawful_basis} />
          <Stat label="missing unsubscribe_token" value={counts.missing_unsubscribe_token} />
          <Stat label="BCR valid" value={counts.bcr_valid} />
          <Stat label="suppression blockers" value={counts.suppression_blockers} />
          <Stat label="prior reply risk" value={counts.prior_reply} />
        </div>

        {/* Mutation counters */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-[11px]">
          {[
            ["dry_run", "true"],
            ["rows_changed", 0],
            ["contacts_changed", 0],
            ["bcrs_changed", 0],
            ["compliance_records_changed", 0],
            ["queue_rows_changed", 0],
            ["emails_sent", 0],
            ["smtp_calls", 0],
            ["apollo_calls", 0],
            ["system_settings_changed", 0],
            ["cron_changed", 0],
          ].map(([k, v]) => (
            <div key={String(k)} className="rounded border bg-muted/30 px-2 py-1.5">
              <div className="text-muted-foreground">{String(k)}</div>
              <div className="font-mono">{String(v)}</div>
            </div>
          ))}
        </div>

        {reviewItems.length === 0 ? (
          <div className="text-xs text-muted-foreground">No review_required rows.</div>
        ) : (
          <div className="space-y-3">
            {reviewItems.map((it) => {
              const d = decisions[it.queue_id] ?? defaultRecommendation(it);
              const isEligible = ELIGIBLE_QUEUE_IDS.has(it.queue_id);
              return (
                <div key={it.queue_id} className="rounded-md border p-3 space-y-2 bg-card">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div>
                      <div className="font-medium">
                        {isEligible && (
                          <input
                            type="checkbox"
                            className="mr-2 align-middle"
                            checked={!!selected[it.queue_id]}
                            onChange={(e) =>
                              setSelected((p) => ({ ...p, [it.queue_id]: e.target.checked }))
                            }
                            aria-label={`Select ${it.contact_email} for park_followup`}
                          />
                        )}
                        {it.contact_name ?? "—"}{" "}
                        <span className="text-muted-foreground text-xs">{it.contact_email}</span>
                      </div>
                      <div className="text-[11px] text-muted-foreground">
                        queue: <span className="font-mono">{it.queue_id}</span> · contact: <span className="font-mono">{it.contact_id}</span>
                        {it.bcr_business_match && <> · bcr: matched</>}
                        {!isEligible && <> · <Badge variant="outline" className="text-[10px]">not in apply set</Badge></>}
                      </div>
                    </div>
                    <Badge variant="outline">Step {it.sequence_step}</Badge>
                  </div>

                  <div className="grid md:grid-cols-3 gap-2 text-[11px]">
                    <Field k="scheduled_at" v={fmt(it.scheduled_at)} />
                    <Field k="last sent step" v={`${it.last_sent_step ?? "—"} @ ${fmt(it.last_sent_at)}`} />
                    <Field k="step 4 follows last" v={yn(it.follows_last_sent_step)} />
                    <Field k="prior sent steps" v={`[${(it.prior_sent_steps ?? []).join(",")}]`} />
                    <Field k="prior sent_at" v={(it.prior_sent_at ?? []).map(fmt).join(", ") || "—"} />
                    <Field k="prior msg-ids" v={(it.prior_provider_message_ids ?? []).join(", ") || "—"} />
                    <Field k="compliance_status" v={it.compliance_status ?? "—"} />
                    <Field k="lawful_basis" v={it.lawful_basis ?? "—"} />
                    <Field k="lawful_basis_recorded_at" v={fmt(it.lawful_basis_recorded_at)} />
                    <Field k="unsubscribe_token" v={yn(it.unsubscribe_token_present)} />
                    <Field k="retention_until" v={fmt(it.retention_until)} />
                    <Field k="contact_status" v={it.contact_status ?? "—"} />
                    <Field k="suppression / DNC" v={[
                      it.is_globally_suppressed && "globally_suppressed",
                      it.hard_bounced && "hard_bounced",
                      it.unsubscribed_at && "unsubscribed",
                      it.do_not_contact && "do_not_contact",
                    ].filter(Boolean).join(", ") || "none"} />
                    <Field k="bcr.current_stage" v={it.bcr_current_stage ?? "—"} />
                    <Field k="bcr.qualification" v={it.bcr_qualification ?? "—"} />
                    <Field k="bcr.campaign_eligible" v={yn(it.bcr_campaign_eligible)} />
                    <Field k="bcr.do_not_contact" v={yn(it.bcr_do_not_contact)} />
                  </div>

                  <div className="text-[11px]">
                    <span className="text-muted-foreground">blockers:</span>{" "}
                    {(it.blockers ?? []).length === 0
                      ? "none"
                      : (it.blockers ?? []).map((b: string) => (
                          <Badge key={b} variant="outline" className="ml-1 text-[10px]">{b}</Badge>
                        ))}
                  </div>
                  <div className="text-[11px]">
                    <span className="text-muted-foreground">current recommendation:</span>{" "}
                    <span className="font-mono">{it.recommended_action}</span>
                  </div>

                  <div className="rounded border bg-muted/30 p-2 space-y-1">
                    <div className="text-[11px] text-muted-foreground">
                      Safest decision options (preview only — no apply in this view):
                    </div>
                    <div className="flex flex-col gap-1">
                      {OPTIONS.map((opt) => (
                        <label key={opt.id} className="flex items-start gap-2 text-[11px]">
                          <input
                            type="radio"
                            name={`decision-${it.queue_id}`}
                            value={opt.id}
                            checked={d === opt.id}
                            onChange={() => setDecision(it.queue_id, opt.id)}
                            className="mt-0.5"
                          />
                          <span>
                            <span className="font-medium">{opt.label}</span>{" "}
                            <span className="text-muted-foreground">— {opt.help}</span>
                            {defaultRecommendation(it) === opt.id && (
                              <Badge variant="secondary" className="ml-2 text-[10px]">default</Badge>
                            )}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ===== APPLY PATH ===== */}
        <div className="rounded-md border p-3 space-y-3 bg-muted/20" data-testid="decision-apply-panel">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="font-medium">Decision Apply — Park selected follow-ups</div>
            <Badge variant="outline" className="text-[10px]">park_followup only · no send</Badge>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Selected: {selectedIds.length} of {eligibleItems.length} eligible. Default recommendation
            for all 7 rows is park_followup. Untick any row to exclude it. The 3 valid_future_step_blocked
            Step 2 rows are not selectable here and are never touched by this path.
          </p>

          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={onPreview}
              disabled={previewing || selectedIds.length === 0}
              data-testid="decision-preview-btn"
            >
              {previewing ? "Previewing…" : "1. Preview Decision Apply"}
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={onApply}
              disabled={applyButtonDisabled}
              data-testid="decision-apply-btn"
            >
              {applying ? "Applying…" : "2. Apply Decision — Park Selected Follow-ups"}
            </Button>
          </div>

          {previewResult && (
            <div className="rounded border bg-background p-2 text-[11px] space-y-1">
              <div className="font-medium">Preview ({previewMatches ? "matches selection" : "stale — re-preview after changing selection"})</div>
              <div>selected_count: <span className="font-mono">{previewResult.selected_count}</span></div>
              <div>queue_ids: <span className="font-mono break-all">{(previewResult.selected_queue_ids ?? []).join(", ")}</span></div>
              <div>proposed_new_status: <span className="font-mono">blocked</span> · reason: <span className="font-mono">{previewResult.rows?.[0]?.reason}</span></div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-1 mt-1">
                {Object.entries(previewResult.counters ?? {}).map(([k, v]) => (
                  <div key={k} className="rounded border bg-muted/30 px-1.5 py-1">
                    <div className="text-muted-foreground">{k}</div>
                    <div className="font-mono">{String(v)}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-start gap-2 text-[11px]">
            <Checkbox
              id="decision-ack-checkbox"
              checked={ack}
              onCheckedChange={(v) => setAck(v === true)}
              data-testid="decision-ack-checkbox"
              className="mt-0.5"
            />
            <Label
              htmlFor="decision-ack-checkbox"
              className="text-[11px] font-normal leading-snug cursor-pointer select-none"
            >
              I understand this will only park selected review-required follow-ups and will not send emails.
            </Label>
          </div>

          <div className="space-y-1">
            <div className="text-[11px] text-muted-foreground">
              Type exactly: <span className="font-mono">{CONFIRMATION_TEXT}</span>
            </div>
            <Input
              ref={confirmationInputRef}
              value={confirmation}
              onChange={(e) => setConfirmation(e.target.value)}
              placeholder={CONFIRMATION_TEXT}
              className="font-mono text-[11px]"
              data-testid="decision-confirmation-input"
            />
            <div className="flex flex-wrap items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                type="button"
                onClick={onCopyConfirmationPhrase}
                data-testid="decision-copy-confirmation-btn"
                className="text-[11px] h-7"
              >
                Copy confirmation phrase
              </Button>
            </div>
            <div className="text-[11px] text-muted-foreground" data-testid="decision-confirmation-debug">
              expected normalised length: <span className="font-mono">{applyReadiness.expectedNormalizedLength}</span>
              {" · "}typed normalised length: <span className="font-mono">{applyReadiness.typedNormalizedLength}</span>
              {" · "}confirmationExact: <span className="font-mono">{String(applyReadiness.confirmationExact)}</span>
              {" · "}acknowledgementChecked: <span className="font-mono">{String(applyReadiness.acknowledgementChecked)}</span>
              {" · "}canApply: <span className="font-mono">{String(applyReadiness.canApply)}</span>
              {" · "}disabledReasons: <span className="font-mono break-all">[{applyReadiness.disabledReasons.join(" | ")}]</span>
              {applyReadiness.typedHadEdgeWhitespace && (
                <span className="text-destructive"> {" · "}leading/trailing whitespace detected</span>
              )}
            </div>
          </div>

          {errorMsg && (
            <div className="text-[11px] text-destructive">{errorMsg}</div>
          )}

          {/* Apply readiness checklist */}
          <div className="rounded border bg-background p-2 text-[11px] space-y-1" data-testid="apply-readiness">
            <div className="font-medium">Apply readiness</div>
            <ul className="space-y-0.5">
              <ReadinessItem ok={applyReadiness.founderAuthenticated} label="Founder authenticated (server-enforced)" />
              <ReadinessItem ok={applyReadiness.previewSucceeded} label="Preview succeeded" />
              <ReadinessItem ok={applyReadiness.previewMatchesSelection} label="Preview matches selected rows" />
              <ReadinessItem ok={applyReadiness.selectedCountValid} label={`Selected rows: ${selectedIds.length} (need ${REQUIRED_SELECTED_COUNT})`} />
              <ReadinessItem ok={applyReadiness.onlyParkFollowup} label="Only park_followup decisions" />
              <ReadinessItem ok={applyReadiness.forbiddenStep2TouchedZero} label={`Forbidden Step 2 rows touched: ${previewResult?.counters?.valid_future_step_blocked_rows_touched ?? forbiddenSelected.length}`} />
              <ReadinessItem ok={applyReadiness.confirmationExact} label="Confirmation text exact" />
              <ReadinessItem ok={applyReadiness.acknowledgementChecked} label="Acknowledgement checked" />
              <ReadinessItem ok={applyReadiness.emailsZero} label={`Emails to send: ${previewResult?.counters?.emails_sent ?? "—"}`} />
              <ReadinessItem ok={applyReadiness.smtpZero} label={`SMTP calls: ${previewResult?.counters?.smtp_calls ?? "—"}`} />
              <ReadinessItem ok={applyReadiness.apolloZero} label={`Apollo calls: ${previewResult?.counters?.apollo_calls ?? "—"}`} />
              <ReadinessItem
                ok={applyReadiness.contactsBcrComplianceZero}
                label={`Contacts/BCR/compliance changes: ${[
                  previewResult?.counters?.contacts_changed_if_applied ?? "—",
                  previewResult?.counters?.bcrs_changed_if_applied ?? "—",
                  previewResult?.counters?.compliance_records_changed_if_applied ?? "—",
                ].join("/")}`}
              />
            </ul>
            {applyReadiness.disabledReasons.length > 0 && (
              <div className="mt-1 text-destructive">
                Apply disabled because: {applyReadiness.disabledReasons.join(" | ")}
              </div>
            )}
            {applyButtonStateError && (
              <div className="mt-1 text-destructive">UI state error: canApply true but button disabled</div>
            )}
          </div>

          {applyResult && (
            <div className="rounded border border-green-500/40 bg-green-500/10 p-2 text-[11px]">
              Decision applied. Rows changed: {applyResult.rows_changed}. Re-run audit to confirm
              pending queue count.
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

const Stat = ({ label, value }: { label: string; value: number | string }) => (
  <div className="rounded border bg-muted/30 px-2 py-1.5">
    <div className="text-[11px] text-muted-foreground">{label}</div>
    <div className="font-mono text-sm">{String(value)}</div>
  </div>
);

const Field = ({ k, v }: { k: string; v: string }) => (
  <div className="rounded border bg-muted/20 px-2 py-1">
    <div className="text-muted-foreground">{k}</div>
    <div className="font-mono break-all">{v}</div>
  </div>
);

const ReadinessItem = ({ ok, label }: { ok: boolean; label: string }) => (
  <li className="flex items-center gap-1.5">
    {ok ? (
      <Check className="h-3 w-3 text-green-600" aria-label="pass" />
    ) : (
      <X className="h-3 w-3 text-destructive" aria-label="fail" />
    )}
    <span className={ok ? "" : "text-muted-foreground"}>{label}</span>
  </li>
);

export default ReviewRequiredDecisionGate;