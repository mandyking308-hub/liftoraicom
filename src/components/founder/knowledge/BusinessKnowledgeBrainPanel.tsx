import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { BookOpen, Brain, RefreshCw, Save, Lock, ShieldCheck, AlertTriangle } from "lucide-react";

type Business = { id: string; name: string };
type Profile = any;
type Asset = any;

export function BusinessKnowledgeBrainPanel() {
  const { toast } = useToast();
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [businessId, setBusinessId] = useState<string>("");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dryRun, setDryRun] = useState(true);
  const [confirmation, setConfirmation] = useState("");
  const [sourceText, setSourceText] = useState("");

  const [form, setForm] = useState<any>({
    business_summary: "",
    offer_summary: "",
    target_customer: "",
    ideal_customer_profile: "",
    approved_tone: "",
    compliance_notes: "",
    pain_points: "",
    value_propositions: "",
    common_objections: "",
    forbidden_claims: "",
    required_disclaimers: "",
  });

  const loadBusinesses = async () => {
    const { data } = await supabase.from("businesses").select("id,name").order("name");
    setBusinesses((data ?? []) as Business[]);
    if (!businessId && data && data.length) setBusinessId((data[0] as any).id);
  };

  const loadProfile = async (id: string) => {
    if (!id) return;
    setLoading(true);
    try {
      const [{ data: p }, { data: a }] = await Promise.all([
        supabase.from("business_knowledge_profiles").select("*").eq("business_id", id).maybeSingle(),
        supabase.from("business_knowledge_assets").select("*").eq("business_id", id).order("updated_at", { ascending: false }),
      ]);
      setProfile(p);
      setAssets((a ?? []) as Asset[]);
      if (p) {
        const arr = (v: any) => Array.isArray(v) ? v.join("\n") : "";
        setForm({
          business_summary: p.business_summary ?? "",
          offer_summary: p.offer_summary ?? "",
          target_customer: p.target_customer ?? "",
          ideal_customer_profile: p.ideal_customer_profile ?? "",
          approved_tone: p.approved_tone ?? "",
          compliance_notes: p.compliance_notes ?? "",
          pain_points: arr(p.pain_points),
          value_propositions: arr(p.value_propositions),
          common_objections: arr(p.common_objections),
          forbidden_claims: arr(p.forbidden_claims),
          required_disclaimers: arr(p.required_disclaimers),
        });
      }
    } finally { setLoading(false); }
  };

  useEffect(() => { loadBusinesses(); }, []);
  useEffect(() => { if (businessId) loadProfile(businessId); }, [businessId]);

  const toLines = (s: string) => s.split("\n").map((x) => x.trim()).filter(Boolean);

  const submit = async () => {
    if (!businessId) return;
    setSaving(true);
    try {
      const manual = {
        business_summary: form.business_summary || null,
        offer_summary: form.offer_summary || null,
        target_customer: form.target_customer || null,
        ideal_customer_profile: form.ideal_customer_profile || null,
        approved_tone: form.approved_tone || null,
        compliance_notes: form.compliance_notes || null,
        pain_points: toLines(form.pain_points),
        value_propositions: toLines(form.value_propositions),
        common_objections: toLines(form.common_objections),
        forbidden_claims: toLines(form.forbidden_claims),
        required_disclaimers: toLines(form.required_disclaimers),
      };
      const { data, error } = await supabase.functions.invoke("business-knowledge-profile-generate", {
        body: { business_id: businessId, manual, source_text: sourceText, dry_run: dryRun, confirmation },
      });
      if (error) throw error;
      const res = data as any;
      toast({
        title: dryRun ? "Knowledge preview generated" : "Knowledge profile saved",
        description: dryRun ? `Missing: ${(res.missing_fields ?? []).join(", ") || "none"}` : `Profile id ${res.profile_id}, assets +${res.assets_inserted ?? 0}`,
      });
      if (!dryRun) await loadProfile(businessId);
    } catch (e: any) {
      toast({ title: "Error", description: e?.message ?? String(e), variant: "destructive" });
    } finally { setSaving(false); }
  };

  const missing = useMemo(() => {
    const m: string[] = [];
    if (!form.offer_summary) m.push("offer");
    if (!form.target_customer) m.push("target customer");
    if (!form.approved_tone) m.push("tone");
    if (!toLines(form.value_propositions).length) m.push("value props");
    if (!toLines(form.common_objections).length) m.push("objections");
    return m;
  }, [form]);

  return (
    <Card className="tech-card">
      <CardHeader>
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            <CardTitle>Business Knowledge Brain</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="gap-1"><Lock className="h-3 w-3" /> No external sends</Badge>
            <Button size="sm" variant="outline" onClick={() => loadProfile(businessId)} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-1 ${loading ? "animate-spin" : ""}`} /> Reload
            </Button>
          </div>
        </div>
        <CardDescription>Per-business memory: offer, ICP, tone, objections, compliance, proposal & outreach rules.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
          <div className="space-y-1">
            <Label>Business</Label>
            <select className="w-full bg-background border border-border rounded-md h-10 px-3" value={businessId} onChange={(e) => setBusinessId(e.target.value)}>
              {businesses.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <Label>Profile status</Label>
            <div><Badge variant={profile ? "default" : "outline"}>{profile?.profile_status ?? "none"}</Badge></div>
          </div>
          <div className="flex items-center gap-3">
            <Switch checked={dryRun} onCheckedChange={setDryRun} id="dry" />
            <Label htmlFor="dry">Dry-run</Label>
          </div>
        </div>

        {missing.length > 0 && (
          <div className="flex items-start gap-2 text-sm p-3 rounded-md border border-amber-500/30 bg-amber-500/5">
            <AlertTriangle className="h-4 w-4 text-amber-400 mt-0.5" />
            <div>Missing knowledge: <span className="font-medium">{missing.join(", ")}</span></div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Field label="Business summary" value={form.business_summary} onChange={(v) => setForm({ ...form, business_summary: v })} multiline />
          <Field label="Offer summary" value={form.offer_summary} onChange={(v) => setForm({ ...form, offer_summary: v })} multiline />
          <Field label="Target customer" value={form.target_customer} onChange={(v) => setForm({ ...form, target_customer: v })} />
          <Field label="Ideal customer profile (ICP)" value={form.ideal_customer_profile} onChange={(v) => setForm({ ...form, ideal_customer_profile: v })} multiline />
          <Field label="Approved tone" value={form.approved_tone} onChange={(v) => setForm({ ...form, approved_tone: v })} />
          <Field label="Compliance notes" value={form.compliance_notes} onChange={(v) => setForm({ ...form, compliance_notes: v })} multiline />
          <Field label="Pain points (one per line)" value={form.pain_points} onChange={(v) => setForm({ ...form, pain_points: v })} multiline />
          <Field label="Value propositions (one per line)" value={form.value_propositions} onChange={(v) => setForm({ ...form, value_propositions: v })} multiline />
          <Field label="Common objections (one per line)" value={form.common_objections} onChange={(v) => setForm({ ...form, common_objections: v })} multiline />
          <Field label="Forbidden claims (one per line)" value={form.forbidden_claims} onChange={(v) => setForm({ ...form, forbidden_claims: v })} multiline />
          <Field label="Required disclaimers (one per line)" value={form.required_disclaimers} onChange={(v) => setForm({ ...form, required_disclaimers: v })} multiline />
        </div>

        <div className="space-y-1">
          <Label>Optional source text (manuals, transcripts, briefs)</Label>
          <Textarea rows={4} value={sourceText} onChange={(e) => setSourceText(e.target.value)} placeholder="Paste raw context — never sent externally." />
        </div>

        {!dryRun && (
          <div className="space-y-1">
            <Label>Confirmation phrase</Label>
            <Input placeholder='Type "CREATE BUSINESS KNOWLEDGE PROFILE"' value={confirmation} onChange={(e) => setConfirmation(e.target.value)} />
          </div>
        )}

        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <ShieldCheck className="h-4 w-4 text-primary" /> No emails, no Apollo, no Smartlead POST. Internal only.
          </div>
          <Button onClick={submit} disabled={saving || !businessId}>
            <Save className="h-4 w-4 mr-1" /> {dryRun ? "Generate dry-run preview" : "Save knowledge profile"}
          </Button>
        </div>

        <div>
          <div className="flex items-center gap-2 mb-2">
            <BookOpen className="h-4 w-4 text-primary" />
            <h4 className="text-sm font-semibold">Knowledge assets ({assets.length})</h4>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {assets.length === 0 && <div className="text-sm text-muted-foreground">No assets yet. Add via the manual form above (extend with founder note assets coming next).</div>}
            {assets.map((a) => (
              <div key={a.id} className="border border-border rounded-md p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-sm">{a.asset_title}</span>
                  <Badge variant="outline">{a.asset_type}</Badge>
                </div>
                {a.asset_content && <p className="text-xs text-muted-foreground mt-1 line-clamp-3">{a.asset_content}</p>}
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function Field({ label, value, onChange, multiline }: { label: string; value: string; onChange: (v: string) => void; multiline?: boolean }) {
  return (
    <div className="space-y-1">
      <Label>{label}</Label>
      {multiline ? (
        <Textarea rows={3} value={value} onChange={(e) => onChange(e.target.value)} />
      ) : (
        <Input value={value} onChange={(e) => onChange(e.target.value)} />
      )}
    </div>
  );
}

export default BusinessKnowledgeBrainPanel;