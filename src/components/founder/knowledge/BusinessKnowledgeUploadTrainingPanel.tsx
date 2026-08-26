import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Upload, BrainCircuit, Package, ShieldCheck } from "lucide-react";
import BusinessSourceManifestBlock from "./BusinessSourceManifestBlock";

const UPLOAD_TYPES = [
  "technical_manual","user_manual","website","brand_guide","offer_sheet","pricing_sheet",
  "customer_list","email_history","social_assets","proposal_template","support_policy",
  "complaints_policy","onboarding_instructions","contracts","compliance_policy","FAQ",
  "sales_script","marketing_plan","product_documentation","operations_manual","other",
];
const SOURCE_KINDS = ["file_upload","pasted_text","website_url","manual_entry","internal_record"];

export const BusinessKnowledgeUploadTrainingPanel = () => {
  const [businesses, setBusinesses] = useState<{ id: string; name: string }[]>([]);
  const [businessId, setBusinessId] = useState("");
  const [uploads, setUploads] = useState<any[]>([]);
  const [runs, setRuns] = useState<any[]>([]);
  const [packs, setPacks] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ upload_type: "technical_manual", upload_title: "", source_kind: "manual_entry", source_url: "", summary: "" });

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
      const [u, r, p] = await Promise.all([
        supabase.from("business_knowledge_uploads").select("*").eq("business_id", businessId).order("created_at", { ascending: false }),
        supabase.from("business_training_runs").select("*").eq("business_id", businessId).order("created_at", { ascending: false }),
        supabase.from("business_execution_starter_packs").select("*").eq("business_id", businessId).order("created_at", { ascending: false }),
      ]);
      setUploads(u.data ?? []);
      setRuns(r.data ?? []);
      setPacks(p.data ?? []);
    } finally { setLoading(false); }
  };

  useEffect(() => { refresh(); /* eslint-disable-next-line */ }, [businessId]);

  const register = async () => {
    if (!businessId || !form.upload_title) { toast.error("Title and business required"); return; }
    setBusy(true);
    try {
      const body: any = { business_id: businessId, ...form };
      if (form.source_kind === "website_url") body.confirm = "REGISTER WEBSITE KNOWLEDGE SOURCE";
      const { error } = await supabase.functions.invoke("business-knowledge-upload-register", { body });
      if (error) throw error;
      toast.success("Knowledge source registered");
      setForm({ ...form, upload_title: "", source_url: "", summary: "" });
      refresh();
    } catch (e: any) { toast.error(e.message); } finally { setBusy(false); }
  };

  const train = async (dryRun: boolean) => {
    setBusy(true);
    try {
      const body: any = { business_id: businessId, dry_run: dryRun };
      if (!dryRun) body.confirm = "TRAIN BUSINESS KNOWLEDGE";
      const { data, error } = await supabase.functions.invoke("business-training-run", { body });
      if (error) throw error;
      toast.success(dryRun ? `Dry-run: ${data?.planned?.sources ?? 0} sources` : "Training run completed");
      refresh();
    } catch (e: any) { toast.error(e.message); } finally { setBusy(false); }
  };

  const generatePack = async () => {
    setBusy(true);
    try {
      const { error } = await supabase.functions.invoke("business-execution-starter-pack-generate", {
        body: { business_id: businessId, confirm: "CREATE BUSINESS STARTER PACK" },
      });
      if (error) throw error;
      toast.success("Starter pack generated (draft)");
      refresh();
    } catch (e: any) { toast.error(e.message); } finally { setBusy(false); }
  };

  const stats = useMemo(() => ({
    technical: uploads.some(u => u.upload_type === "technical_manual"),
    user_manual: uploads.some(u => u.upload_type === "user_manual"),
    website: uploads.some(u => u.upload_type === "website" || u.source_kind === "website_url"),
    last_run: runs[0],
    last_pack: packs[0],
  }), [uploads, runs, packs]);

  return (
    <Card className="tech-card">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <BrainCircuit className="h-5 w-5 text-primary" />
            Business Knowledge · Upload · Training
          </CardTitle>
          <p className="text-xs text-muted-foreground mt-1">
            External actions LOCKED · Website intake requires confirmation · Customer/private docs not used externally without approval
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={businessId} onValueChange={setBusinessId}>
            <SelectTrigger className="w-56"><SelectValue placeholder="Select business" /></SelectTrigger>
            <SelectContent>
              {businesses.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button size="sm" variant="outline" onClick={refresh} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Refresh"}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <Stat label="Tech manual" value={stats.technical ? "yes" : "no"} />
          <Stat label="User manual" value={stats.user_manual ? "yes" : "no"} />
          <Stat label="Website" value={stats.website ? "yes" : "no"} />
          <Stat label="Training runs" value={`${runs.length}`} />
          <Stat label="Starter packs" value={`${packs.length}`} />
        </div>

        <div className="flex flex-wrap gap-2">
          <Badge variant="outline"><ShieldCheck className="h-3 w-3 mr-1" /> External actions LOCKED</Badge>
          <Badge variant="outline">No external send</Badge>
          <Badge variant="outline">No website auto-crawl</Badge>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 border border-border/40 rounded-md p-3 bg-muted/10">
          <Select value={form.upload_type} onValueChange={(v) => setForm({ ...form, upload_type: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{UPLOAD_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={form.source_kind} onValueChange={(v) => setForm({ ...form, source_kind: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{SOURCE_KINDS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
          </Select>
          <Input placeholder="Title (e.g. 'Neon Candy brand guide v2')" value={form.upload_title} onChange={(e) => setForm({ ...form, upload_title: e.target.value })} />
          <Input placeholder="URL or storage link (optional)" value={form.source_url} onChange={(e) => setForm({ ...form, source_url: e.target.value })} />
          <Textarea className="md:col-span-2" placeholder="Pasted text or summary…" value={form.summary} onChange={(e) => setForm({ ...form, summary: e.target.value })} />
          <div className="md:col-span-2 flex gap-2">
            <Button size="sm" onClick={register} disabled={busy || !businessId}>
              <Upload className="h-4 w-4 mr-2" /> Register knowledge source
            </Button>
            <Button size="sm" variant="outline" onClick={() => train(true)} disabled={busy || !businessId}>Dry-run training</Button>
            <Button size="sm" onClick={() => train(false)} disabled={busy || !businessId}>Run training</Button>
            <Button size="sm" variant="default" onClick={generatePack} disabled={busy || !businessId}>
              <Package className="h-4 w-4 mr-2" /> Generate starter pack
            </Button>
          </div>
        </div>

        {businessId && <BusinessSourceManifestBlock businessId={businessId} />}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          <MiniList title="Recent uploads" rows={uploads.slice(0,8).map(u => `${u.upload_type} · ${u.upload_title} · ${u.processing_status}`)} empty="No uploads yet" />
          <MiniList title="Training runs" rows={runs.slice(0,8).map(r => `${r.training_name} · ${r.training_status} · score ${r.readiness_score ?? 0}`)} empty="No training runs" />
          <MiniList title="Starter packs" rows={packs.slice(0,8).map(p => `${p.pack_status} · blockers ${(p.go_live_blockers ?? []).length}`)} empty="No starter packs" />
        </div>
      </CardContent>
    </Card>
  );
};

const Stat = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-md border border-border/40 bg-muted/20 p-3">
    <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
    <div className="text-sm font-semibold mt-1">{value}</div>
  </div>
);
const MiniList = ({ title, rows, empty }: { title: string; rows: string[]; empty: string }) => (
  <div className="rounded-md border border-border/40 bg-muted/10 p-3">
    <div className="text-xs font-semibold mb-1">{title}</div>
    {rows.length === 0 ? <div className="text-muted-foreground">{empty}</div> : (
      <ul className="space-y-1">{rows.map((r,i) => <li key={i} className="truncate">{r}</li>)}</ul>
    )}
  </div>
);

export default BusinessKnowledgeUploadTrainingPanel;