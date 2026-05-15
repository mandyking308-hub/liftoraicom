import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ShieldCheck, AlertTriangle, Camera, Undo2, Sparkles, ListChecks } from "lucide-react";

export const PreLiveBaselineControlPanel = () => {
  const [businesses, setBusinesses] = useState<{ id: string; name: string }[]>([]);
  const [businessId, setBusinessId] = useState("");
  const [baseline, setBaseline] = useState<any>(null);
  const [standards, setStandards] = useState<any>(null);
  const [cleanliness, setCleanliness] = useState<any>(null);
  const [rollbackPreview, setRollbackPreview] = useState<any>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("businesses").select("id,name").order("name");
      const list = (data ?? []) as any[];
      setBusinesses(list);
      const neon = list.find((b) => /neon\s*candy/i.test(b.name));
      setBusinessId(neon?.id ?? list[0]?.id ?? "");
    })();
  }, []);

  const refresh = async () => {
    if (!businessId) return;
    const [{ data: b }, { data: s }, { data: cc }] = await Promise.all([
      supabase.from("business_pre_live_baselines").select("*").eq("business_id", businessId).order("created_at", { ascending: false }).limit(1),
      supabase.from("business_operating_standards").select("*").eq("business_id", businessId).order("created_at", { ascending: false }).limit(1),
      supabase.from("rehearsal_cleanliness_checks").select("*").eq("business_id", businessId).order("checked_at", { ascending: false }).limit(1),
    ]);
    setBaseline((b ?? [])[0] ?? null);
    setStandards((s ?? [])[0] ?? null);
    setCleanliness((cc ?? [])[0] ?? null);
  };

  useEffect(() => { refresh(); /* eslint-disable-next-line */ }, [businessId]);

  const generateStandards = async (dryRun: boolean) => {
    if (!businessId) return;
    setBusy(true);
    try {
      const body: any = { business_id: businessId, dry_run: dryRun };
      if (!dryRun) body.confirm = "CREATE BUSINESS OPERATING STANDARDS";
      const { data, error } = await supabase.functions.invoke("business-operating-standards-generate", { body });
      if (error) throw error;
      toast.success(dryRun ? "Dry-run standards generated" : "Operating standards saved");
      refresh();
    } catch (e: any) { toast.error(e.message); } finally { setBusy(false); }
  };

  const createBaseline = async (dryRun: boolean) => {
    if (!businessId) return;
    setBusy(true);
    try {
      const body: any = { business_id: businessId, dry_run: dryRun };
      if (!dryRun) body.confirm = "CREATE PRE LIVE BASELINE";
      const { data, error } = await supabase.functions.invoke("business-baseline-create", { body });
      if (error) throw error;
      toast.success(dryRun
        ? `Dry-run: readiness ${data.readiness_score}% · ${data.blockers.length} blocker(s)`
        : `Baseline created · readiness ${data.readiness_score}%`);
      refresh();
    } catch (e: any) { toast.error(e.message); } finally { setBusy(false); }
  };

  const previewRollback = async () => {
    if (!businessId || !baseline) return;
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("business-rollback-preview", {
        body: { business_id: businessId, baseline_id: baseline.id },
      });
      if (error) throw error;
      setRollbackPreview(data);
      toast.success(`Rollback preview · ${data.total_changes} change(s) · ${data.safe_internal_config_count} safe`);
    } catch (e: any) { toast.error(e.message); } finally { setBusy(false); }
  };

  const applyRollback = async () => {
    if (!businessId || !baseline || !rollbackPreview) { toast.error("Run rollback preview first"); return; }
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("business-rollback-apply", {
        body: { business_id: businessId, baseline_id: baseline.id, confirm: "APPLY SAFE BUSINESS ROLLBACK" },
      });
      if (error) throw error;
      toast.success(`Rollback applied: ${data.applied_count} · refused: ${data.refused_count}`);
      setRollbackPreview(null);
      refresh();
    } catch (e: any) { toast.error(e.message); } finally { setBusy(false); }
  };

  const cleanReal = cleanliness?.real_mode_ready === true;
  const standardsApproved = !!standards?.approved_at || standards?.standards_status === "ready";
  const goLiveAllowed = !!baseline && (baseline.readiness_score ?? 0) >= 90 && (baseline.blockers?.length ?? 0) === 0 && cleanReal && standardsApproved;

  return (
    <Card className="tech-card">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5 text-primary" />
            Pre-Live Baseline · Operating Standards · Safe Rollback
          </CardTitle>
          <p className="text-xs text-muted-foreground mt-1">
            External actions LOCKED · Real customer / financial / communications data is never auto-rolled back · Founder approval required
          </p>
        </div>
        <Select value={businessId} onValueChange={setBusinessId}>
          <SelectTrigger className="w-56"><SelectValue placeholder="Select business" /></SelectTrigger>
          <SelectContent>{businesses.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}</SelectContent>
        </Select>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline"><ShieldCheck className="h-3 w-3 mr-1" /> External gates LOCKED</Badge>
          <Badge variant={cleanReal ? "secondary" : "destructive"}>
            {cleanReal ? <><Sparkles className="h-3 w-3 mr-1" /> Clean Real Mode</> : "Clean Real Mode missing"}
          </Badge>
          <Badge variant={standardsApproved ? "secondary" : "outline"}>Operating standards: {standardsApproved ? "ready" : "missing"}</Badge>
          <Badge variant={baseline ? "secondary" : "outline"}>Baseline: {baseline?.baseline_status ?? "none"}</Badge>
          <Badge variant="outline">Readiness: {baseline?.readiness_score ?? 0}%</Badge>
          <Badge variant={goLiveAllowed ? "secondary" : "destructive"}>
            {goLiveAllowed ? "Go-live allowed (still gated)" : <><AlertTriangle className="h-3 w-3 mr-1" /> Go-live BLOCKED</>}
          </Badge>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="rounded-md border border-border/40 p-3 space-y-2">
            <div className="text-sm font-semibold flex items-center gap-2"><ListChecks className="h-4 w-4" /> Operating standards</div>
            {standards ? (
              <ul className="text-xs text-muted-foreground space-y-1">
                <li>Standard response: {standards.standard_response_time_hours}h · High-priority: {standards.high_priority_response_time_hours}h</li>
                <li>Support response: {standards.support_response_time_hours}h</li>
                <li>Complaint ack: {standards.complaint_acknowledgement_hours}h · resolution: {standards.complaint_resolution_target_days}d</li>
                <li>Onboarding first check-in: {standards.onboarding_first_checkin_days}d · bedding-in: {standards.bedding_in_checkin_days}d</li>
                <li>Quarterly cadence: {standards.quarterly_report_cadence}</li>
                <li>Renewal check-in: {standards.renewal_checkin_days_before}d before · win-back after {standards.winback_after_inactive_days}d inactive</li>
              </ul>
            ) : (
              <p className="text-xs text-muted-foreground">No standards yet — run dry-run then create.</p>
            )}
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={() => generateStandards(true)} disabled={busy}>Dry-run</Button>
              <Button size="sm" onClick={() => generateStandards(false)} disabled={busy}>Create standards</Button>
            </div>
          </div>

          <div className="rounded-md border border-border/40 p-3 space-y-2">
            <div className="text-sm font-semibold flex items-center gap-2"><Camera className="h-4 w-4" /> Pre-live baseline</div>
            {baseline ? (
              <div className="text-xs text-muted-foreground space-y-1">
                <div>{baseline.baseline_summary}</div>
                {(baseline.blockers ?? []).length > 0 && (
                  <ul className="list-disc pl-4">
                    {baseline.blockers.slice(0, 6).map((b: string, i: number) => <li key={i}>{b}</li>)}
                  </ul>
                )}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">No baseline yet — run dry-run then create when blockers cleared.</p>
            )}
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={() => createBaseline(true)} disabled={busy || !businessId}>Dry-run baseline</Button>
              <Button size="sm" onClick={() => createBaseline(false)} disabled={busy || !businessId}>Create baseline</Button>
            </div>
          </div>
        </div>

        <div className="rounded-md border border-border/40 p-3 space-y-2">
          <div className="text-sm font-semibold flex items-center gap-2"><Undo2 className="h-4 w-4" /> Safe rollback (internal config only)</div>
          <p className="text-xs text-muted-foreground">
            Real customer, CRM, communications, proposals, deals, invoices, payments, suppliers and documents are PROTECTED
            and refused by the rollback engine. Only safe internal config rows with rollback_possible=true are eligible.
            Apply requires confirmation phrase <code>APPLY SAFE BUSINESS ROLLBACK</code>.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={previewRollback} disabled={busy || !baseline}>Rollback preview</Button>
            <Button size="sm" variant="destructive" onClick={applyRollback} disabled={busy || !rollbackPreview || rollbackPreview.safe_internal_config_count === 0}>
              Apply safe rollback
            </Button>
          </div>
          {rollbackPreview && (
            <div className="text-xs text-muted-foreground">
              total: {rollbackPreview.total_changes} ·
              safe: {rollbackPreview.safe_internal_config_count} ·
              customer-data refused: {rollbackPreview.customer_data_changes_count} ·
              financial refused: {rollbackPreview.financial_records_count} ·
              external refused: {rollbackPreview.external_action_records_count} ·
              risky refused: {rollbackPreview.risky_changes_count}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default PreLiveBaselineControlPanel;