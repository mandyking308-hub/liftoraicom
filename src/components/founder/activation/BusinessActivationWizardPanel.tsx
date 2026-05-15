import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, ShieldCheck, AlertTriangle, Pause, Play, ListChecks } from "lucide-react";

interface StatusResp {
  business_id: string;
  readiness_score: number;
  go_live_allowed: boolean;
  external_actions_gate: string;
  activation_profile: any;
  checklist_count: number;
  checklist_complete: number;
  checklist_blockers: number;
  integrations: any[];
  data_imports: any[];
  template_library: any[];
  missing_modules: string[];
  next_actions: { area: string; item: string; next_action: string; blocker?: string }[];
}

export const BusinessActivationWizardPanel = () => {
  const [businesses, setBusinesses] = useState<{ id: string; name: string }[]>([]);
  const [businessId, setBusinessId] = useState<string>("");
  const [data, setData] = useState<StatusResp | null>(null);
  const [loading, setLoading] = useState(false);
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
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("business-activation-status", { body: { business_id: businessId } });
      if (error) throw error;
      setData(data as StatusResp);
    } catch (e: any) {
      toast.error(e.message ?? "Failed to load activation status");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { refresh(); /* eslint-disable-next-line */ }, [businessId]);

  const generateChecklist = async (dryRun: boolean) => {
    if (!businessId) return;
    setBusy(true);
    try {
      const body: any = { business_id: businessId, dry_run: dryRun };
      if (!dryRun) body.confirm = "CREATE BUSINESS ACTIVATION CHECKLIST";
      const { data, error } = await supabase.functions.invoke("business-activation-checklist-generate", { body });
      if (error) throw error;
      toast.success(dryRun ? `Dry-run: ${data.planned_count} items planned` : `Created ${data.created} checklist items`);
      refresh();
    } catch (e: any) { toast.error(e.message); } finally { setBusy(false); }
  };

  const goLive = async () => {
    if (!data?.go_live_allowed) { toast.error("Go-live blocked: readiness < 90% or blockers present"); return; }
    // Block go-live if rehearsal test data still exists for this business
    const { data: cc } = await supabase.from("rehearsal_cleanliness_checks")
      .select("real_mode_ready,test_records_remaining")
      .eq("business_id", businessId)
      .order("checked_at", { ascending: false })
      .limit(1);
    const latestClean = (cc ?? [])[0] as any;
    if (!latestClean || latestClean.real_mode_ready !== true) {
      toast.error("Go-live blocked: run Cleanliness check and Rehearsal Reset first (Clean Real Mode required)");
      return;
    }
    // Block go-live if no pre-live baseline exists or it has blockers
    const { data: bl } = await supabase.from("business_pre_live_baselines")
      .select("baseline_status,readiness_score,blockers")
      .eq("business_id", businessId)
      .order("created_at", { ascending: false })
      .limit(1);
    const latestBaseline = (bl ?? [])[0] as any;
    if (!latestBaseline || (latestBaseline.readiness_score ?? 0) < 90 || (latestBaseline.blockers?.length ?? 0) > 0) {
      toast.error("Go-live blocked: create a Pre-Live Baseline (readiness ≥ 90%, zero blockers) first");
      return;
    }
    setBusy(true);
    try {
      const { data: r, error } = await supabase.functions.invoke("business-go-live-approval", {
        body: { business_id: businessId, operating_mode: "founder_approved_live", confirm: "APPROVE BUSINESS GO LIVE" },
      });
      if (error) throw error;
      toast.success(`Go-live approved. Gate: ${r.external_actions_gate}`);
      refresh();
    } catch (e: any) { toast.error(e.message); } finally { setBusy(false); }
  };

  const pause = async () => {
    setBusy(true);
    try {
      const { error } = await supabase.functions.invoke("pause-business-operations", {
        body: { business_id: businessId, confirm: "PAUSE BUSINESS OPERATIONS" },
      });
      if (error) throw error;
      toast.success("Business paused");
      refresh();
    } catch (e: any) { toast.error(e.message); } finally { setBusy(false); }
  };

  const grouped = useMemo(() => {
    const m = new Map<string, number>();
    (data?.next_actions ?? []).forEach((a) => m.set(a.area, (m.get(a.area) ?? 0) + 1));
    return Array.from(m.entries());
  }, [data]);

  return (
    <Card className="tech-card">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            Business Activation Wizard
          </CardTitle>
          <p className="text-xs text-muted-foreground mt-1">
            External actions LOCKED · No send / publish / DM / Apollo / Smartlead POST · No money / filing / secret · Founder approval required
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={businessId} onValueChange={setBusinessId}>
            <SelectTrigger className="w-56"><SelectValue placeholder="Select business" /></SelectTrigger>
            <SelectContent>
              {businesses.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button size="sm" variant="outline" onClick={refresh} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Refresh"}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <Stat label="Status" value={data?.activation_profile?.activation_status ?? "draft"} />
          <Stat label="Mode" value={data?.activation_profile?.operating_mode ?? "sandbox"} />
          <Stat label="Readiness" value={data ? `${data.readiness_score}%` : "—"} />
          <Stat label="Checklist" value={data ? `${data.checklist_complete}/${data.checklist_count}` : "—"} />
          <Stat label="Blockers" value={data ? `${data.checklist_blockers}` : "—"} />
        </div>

        <div className="flex flex-wrap gap-2">
          <Badge variant="outline"><ShieldCheck className="h-3 w-3 mr-1" /> External actions LOCKED</Badge>
          <Badge variant="outline">auto_send: false</Badge>
          <Badge variant="outline">cron: off</Badge>
          {data?.go_live_allowed
            ? <Badge variant="secondary">Go-live allowed</Badge>
            : <Badge variant="destructive"><AlertTriangle className="h-3 w-3 mr-1" /> Go-live blocked</Badge>}
        </div>

        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={() => generateChecklist(true)} disabled={busy || !businessId}>
            <ListChecks className="h-4 w-4 mr-2" /> Dry-run checklist
          </Button>
          <Button size="sm" onClick={() => generateChecklist(false)} disabled={busy || !businessId}>
            Create checklist
          </Button>
          <Button size="sm" variant="default" onClick={goLive} disabled={busy || !data?.go_live_allowed}>
            <Play className="h-4 w-4 mr-2" /> Approve go-live
          </Button>
          <Button size="sm" variant="destructive" onClick={pause} disabled={busy || !businessId}>
            <Pause className="h-4 w-4 mr-2" /> Pause business
          </Button>
        </div>

        {grouped.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold mb-2">Missing setup by area</h4>
            <div className="flex flex-wrap gap-2">
              {grouped.map(([area, count]) => (
                <Badge key={area} variant="outline">{area} · {count}</Badge>
              ))}
            </div>
          </div>
        )}

        <div>
          <h4 className="text-sm font-semibold mb-2">Next 10 setup actions</h4>
          {(data?.next_actions ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">No outstanding blockers — run the checklist generator to populate setup items.</p>
          ) : (
            <ol className="text-sm text-muted-foreground space-y-1 list-decimal pl-5">
              {data!.next_actions.slice(0,10).map((a, i) => (
                <li key={i}><span className="text-foreground">[{a.area}]</span> {a.item} — {a.next_action}</li>
              ))}
            </ol>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          <MiniList title="Integrations" rows={(data?.integrations ?? []).map((i:any)=> `${i.integration_name}: ${i.integration_status}`)} empty="No integrations recorded" />
          <MiniList title="Data imports" rows={(data?.data_imports ?? []).map((i:any)=> `${i.source_name} (${i.data_type}): ${i.import_status}`)} empty="No imports recorded" />
          <MiniList title="Template library" rows={(data?.template_library ?? []).map((t:any)=> `${t.template_name}: ${t.approval_status}`)} empty="No templates approved" />
        </div>
      </CardContent>
    </Card>
  );
};

const Stat = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-md border border-border/40 bg-muted/20 p-3">
    <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
    <div className="text-sm font-semibold mt-1 truncate">{value}</div>
  </div>
);

const MiniList = ({ title, rows, empty }: { title: string; rows: string[]; empty: string }) => (
  <div className="rounded-md border border-border/40 bg-muted/10 p-3">
    <div className="text-xs font-semibold mb-1">{title}</div>
    {rows.length === 0 ? <div className="text-muted-foreground">{empty}</div> : (
      <ul className="space-y-1">{rows.slice(0,8).map((r,i)=> <li key={i} className="truncate">{r}</li>)}</ul>
    )}
  </div>
);

export default BusinessActivationWizardPanel;