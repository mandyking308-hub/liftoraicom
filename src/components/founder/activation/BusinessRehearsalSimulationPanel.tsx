import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { FlaskConical, ShieldCheck, AlertTriangle, GraduationCap, Play, Trash2, Sparkles } from "lucide-react";

const REHEARSAL_TYPES = [
  "full_customer_journey", "sales_only", "support_only", "complaint_recovery",
  "onboarding", "social_content", "proposal_demo_deal", "winback_retention",
  "quarterly_report", "business_activation",
];

const TRAINING_AREAS = [
  "Command Centre basics", "business activation", "customer journey", "approvals",
  "CRM memory", "social/content", "proposals/demos/deals", "invoices/payments",
  "onboarding/support", "complaints/recovery", "Smartlead/Apollo locked actions",
  "emergency pause", "daily operations",
];

export const BusinessRehearsalSimulationPanel = () => {
  const [businesses, setBusinesses] = useState<{ id: string; name: string }[]>([]);
  const [businessId, setBusinessId] = useState("");
  const [type, setType] = useState("full_customer_journey");
  const [area, setArea] = useState("Command Centre basics");
  const [runs, setRuns] = useState<any[]>([]);
  const [scenarios, setScenarios] = useState<any[]>([]);
  const [checklists, setChecklists] = useState<any[]>([]);
  const [busy, setBusy] = useState(false);
  const [cleanliness, setCleanliness] = useState<any>(null);
  const [resetPreview, setResetPreview] = useState<any>(null);

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
    const [{ data: r }, { data: c }] = await Promise.all([
      supabase.from("business_rehearsal_runs").select("*").eq("business_id", businessId).order("created_at", { ascending: false }).limit(10),
      supabase.from("operator_training_checklists").select("*").eq("business_id", businessId).order("created_at", { ascending: false }).limit(10),
    ]);
    setRuns(r ?? []);
    setChecklists(c ?? []);
    const latest = (r ?? [])[0];
    if (latest) {
      const { data: s } = await supabase.from("business_rehearsal_scenarios").select("*").eq("rehearsal_run_id", latest.id).order("created_at");
      setScenarios(s ?? []);
    } else {
      setScenarios([]);
    }
    const { data: cc } = await supabase.from("rehearsal_cleanliness_checks").select("*").eq("business_id", businessId).order("checked_at", { ascending: false }).limit(1);
    setCleanliness((cc ?? [])[0] ?? null);
  };

  useEffect(() => { refresh(); /* eslint-disable-next-line */ }, [businessId]);

  const generate = async (dryRun: boolean) => {
    if (!businessId) return;
    setBusy(true);
    try {
      const body: any = { business_id: businessId, rehearsal_type: type, dry_run: dryRun };
      if (!dryRun) body.confirm = "CREATE BUSINESS REHEARSAL";
      const { data, error } = await supabase.functions.invoke("business-rehearsal-generate", { body });
      if (error) throw error;
      toast.success(dryRun ? `Dry-run: ${data.planned_scenarios} scenarios planned` : `Created rehearsal with ${data.scenarios_created} scenarios`);
      refresh();
    } catch (e: any) { toast.error(e.message); } finally { setBusy(false); }
  };

  const runRehearsal = async (runId: string, dryRun: boolean) => {
    setBusy(true);
    try {
      const body: any = { rehearsal_run_id: runId, dry_run: dryRun };
      if (!dryRun) body.confirm = "RUN BUSINESS REHEARSAL";
      const { data, error } = await supabase.functions.invoke("business-rehearsal-run", { body });
      if (error) throw error;
      toast.success(dryRun
        ? `Dry-run: ${data.planned_pass} pass / ${data.planned_blocked} blocked`
        : `Rehearsal ${data.pass_fail_status} · score ${data.readiness_score}%`);
      refresh();
    } catch (e: any) { toast.error(e.message); } finally { setBusy(false); }
  };

  const generateChecklist = async (dryRun: boolean) => {
    setBusy(true);
    try {
      const body: any = { business_id: businessId, training_area: area, operator_name: "Mandy", dry_run: dryRun };
      if (!dryRun) body.confirm = "CREATE OPERATOR TRAINING CHECKLIST";
      const { data, error } = await supabase.functions.invoke("operator-training-checklist-generate", { body });
      if (error) throw error;
      toast.success(dryRun ? `Dry-run: ${data.planned_tasks} tasks planned` : `Checklist created with ${data.tasks_created} tasks`);
      refresh();
    } catch (e: any) { toast.error(e.message); } finally { setBusy(false); }
  };

  const previewReset = async () => {
    if (!businessId) return;
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("rehearsal-reset-preview", { body: { business_id: businessId } });
      if (error) throw error;
      setResetPreview(data);
      toast.success(`Preview: ${data.total_test_records} test record(s) — ${data.recommended_action}`);
    } catch (e: any) { toast.error(e.message); } finally { setBusy(false); }
  };

  const applyReset = async () => {
    if (!businessId) return;
    if (!resetPreview) { toast.error("Run reset preview first"); return; }
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("rehearsal-reset-apply", {
        body: { business_id: businessId, dry_run: false, confirm: "RESET REHEARSAL DATA" },
      });
      if (error) throw error;
      toast.success(`Reset complete: ${data.deleted} deleted, ${data.archived} archived — mode: ${data.operating_mode}`);
      setResetPreview(null);
      refresh();
    } catch (e: any) { toast.error(e.message); } finally { setBusy(false); }
  };

  const runCleanliness = async () => {
    if (!businessId) return;
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("rehearsal-cleanliness-check", { body: { business_id: businessId } });
      if (error) throw error;
      toast.success(data.clean_for_real_use ? "Clean Real Mode confirmed" : `Dirty: ${data.test_records_remaining} test record(s)`);
      refresh();
    } catch (e: any) { toast.error(e.message); } finally { setBusy(false); }
  };

  const latest = runs[0];
  const passed = useMemo(() => scenarios.filter((s) => s.passed).length, [scenarios]);
  const total = scenarios.length;
  const score = latest?.readiness_score ?? (total ? Math.round((passed / total) * 100) : 0);
  const cleanReal = cleanliness?.real_mode_ready === true;
  const internalReady = score >= 80 && total > 0;
  const externalReady = false; // always locked until founder explicit go-live
  const resetRequired = (cleanliness && !cleanliness.real_mode_ready) || runs.some((r) => r.reset_status !== "reset_completed");

  return (
    <Card className="tech-card">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <FlaskConical className="h-5 w-5 text-primary" />
            Business Rehearsal · Simulation · Operator Training
          </CardTitle>
          <p className="text-xs text-muted-foreground mt-1">
            Test data only · Internal drafts only · No send / publish / DM / Apollo / Smartlead POST · No money / filing
          </p>
        </div>
        <Select value={businessId} onValueChange={setBusinessId}>
          <SelectTrigger className="w-56"><SelectValue placeholder="Select business" /></SelectTrigger>
          <SelectContent>{businesses.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}</SelectContent>
        </Select>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline"><ShieldCheck className="h-3 w-3 mr-1" /> External actions LOCKED</Badge>
          <Badge variant="outline">Test data only</Badge>
          <Badge variant={internalReady ? "secondary" : "outline"}>Internal use ready: {internalReady ? "yes" : "no"}</Badge>
          <Badge variant="destructive"><AlertTriangle className="h-3 w-3 mr-1" /> External go-live: {externalReady ? "yes" : "no"}</Badge>
          <Badge variant="outline">Latest score: {score}%</Badge>
          <Badge variant={cleanReal ? "secondary" : "destructive"}>
            {cleanReal ? <><Sparkles className="h-3 w-3 mr-1" /> Clean Real Mode</> : <>Reset required: {resetRequired ? "yes" : "unknown"}</>}
          </Badge>
          {cleanliness && <Badge variant="outline">Test records: {cleanliness.test_records_remaining}</Badge>}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-md border border-border/40 p-3 space-y-2">
            <div className="text-sm font-semibold flex items-center gap-2"><FlaskConical className="h-4 w-4" /> Rehearsal</div>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{REHEARSAL_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
            </Select>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={() => generate(true)} disabled={busy || !businessId}>Dry-run</Button>
              <Button size="sm" onClick={() => generate(false)} disabled={busy || !businessId}>Create rehearsal</Button>
              {latest && <>
                <Button size="sm" variant="outline" onClick={() => runRehearsal(latest.id, true)} disabled={busy}>Dry-run latest</Button>
                <Button size="sm" onClick={() => runRehearsal(latest.id, false)} disabled={busy}><Play className="h-3 w-3 mr-1" />Run latest</Button>
              </>}
            </div>
          </div>

          <div className="rounded-md border border-border/40 p-3 space-y-2">
            <div className="text-sm font-semibold flex items-center gap-2"><GraduationCap className="h-4 w-4" /> Operator training</div>
            <Select value={area} onValueChange={setArea}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{TRAINING_AREAS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
            </Select>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={() => generateChecklist(true)} disabled={busy}>Dry-run</Button>
              <Button size="sm" onClick={() => generateChecklist(false)} disabled={busy}>Create checklist</Button>
            </div>
          </div>
        </div>

        <div>
          <h4 className="text-sm font-semibold mb-2">Latest rehearsal scenarios</h4>
          {scenarios.length === 0 ? (
            <p className="text-sm text-muted-foreground">No scenarios yet — create a rehearsal to generate them.</p>
          ) : (
            <div className="space-y-1 text-xs">
              {scenarios.map((s) => (
                <div key={s.id} className="flex items-center justify-between rounded border border-border/40 px-2 py-1">
                  <span className="truncate">[{s.scenario_stage}] {s.scenario_title}</span>
                  <Badge variant={s.passed ? "secondary" : s.scenario_status === "blocked" ? "destructive" : "outline"}>
                    {s.scenario_status}{s.blockers?.length ? ` · ${s.blockers.length} blocker(s)` : ""}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <h4 className="text-sm font-semibold mb-2">Operator checklists</h4>
          {checklists.length === 0 ? (
            <p className="text-sm text-muted-foreground">No operator checklists yet.</p>
          ) : (
            <ul className="text-xs space-y-1">
              {checklists.map((c) => (
                <li key={c.id} className="rounded border border-border/40 px-2 py-1">
                  <div className="flex items-center justify-between">
                    <span>{c.checklist_name}</span>
                    <Badge variant="outline">{c.training_area} · {(c.tasks ?? []).length} tasks</Badge>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-md border border-border/40 p-3 space-y-2">
          <div className="text-sm font-semibold flex items-center gap-2">
            <Trash2 className="h-4 w-4" /> Rehearsal reset · Clean Real Mode
          </div>
          <p className="text-xs text-muted-foreground">
            Removes only records flagged as test/rehearsal. Real customer / CRM / proposal / invoice data is never touched.
            Apply requires confirmation phrase <code>RESET REHEARSAL DATA</code>.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={previewReset} disabled={busy || !businessId}>Reset preview</Button>
            <Button size="sm" variant="destructive" onClick={applyReset} disabled={busy || !resetPreview || !resetPreview.safe_to_purge}>
              Apply reset
            </Button>
            <Button size="sm" variant="outline" onClick={runCleanliness} disabled={busy || !businessId}>
              <Sparkles className="h-3 w-3 mr-1" /> Cleanliness check
            </Button>
          </div>
          {resetPreview && (
            <div className="text-xs text-muted-foreground">
              Planned purge: <span className="text-foreground">{resetPreview.total_test_records}</span> ·
              Suspicious: <span className="text-foreground">{resetPreview.suspicious_records}</span> ·
              {Object.entries(resetPreview.records_by_table ?? {}).map(([t, v]: any) => (
                <span key={t} className="ml-2">{t}: {v.count}</span>
              ))}
            </div>
          )}
          {cleanliness && (
            <div className="text-xs text-muted-foreground">
              Last check: {cleanliness.check_status} · ready={String(cleanliness.real_mode_ready)} ·
              modules: {(cleanliness.metadata?.affected_modules ?? []).join(", ") || "none"}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default BusinessRehearsalSimulationPanel;