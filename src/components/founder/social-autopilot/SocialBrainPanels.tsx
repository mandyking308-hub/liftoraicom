import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Brain, Lock, FileText, Sparkles, CheckCircle2, AlertTriangle } from "lucide-react";

async function invoke(name: string, body?: any, method: "POST" | "GET" = "POST", qs?: string) {
  const { data: { session } } = await supabase.auth.getSession();
  const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${name}${qs ?? ""}`;
  const res = await fetch(url, {
    method,
    headers: { Authorization: `Bearer ${session?.access_token ?? ""}`, "Content-Type": "application/json" },
    body: method === "POST" ? JSON.stringify(body ?? {}) : undefined,
  });
  return res.json();
}

const SOURCE_TYPES = [
  "technical_manual","user_manual","website","brand_guide","offer_sheet","pricing_sheet",
  "customer_profile","faq","policy","sales_script","marketing_plan","social_asset_notes",
  "founder_notes","transcript","competitor_notes","other",
];

export function SocialKnowledgeSourcePanel({ businessId }: { businessId: string }) {
  const [sources, setSources] = useState<any[]>([]);
  const [form, setForm] = useState({
    source_type: "founder_notes", title: "", source_url: "", pasted_text: "", storage_path: "", founder_notes: "",
  });

  const refresh = async () => {
    if (!businessId) return;
    const { data } = await supabase.from("business_social_knowledge_sources")
      .select("*").eq("business_id", businessId).order("created_at", { ascending: false });
    setSources(data ?? []);
  };
  useEffect(() => { refresh(); /* eslint-disable-next-line */ }, [businessId]);

  const register = async (live: boolean) => {
    if (!businessId || !form.title) return toast.error("Business + title required");
    const r = await invoke("social-knowledge-source-register", {
      business_id: businessId, ...form,
      dry_run: !live,
      confirmation_phrase: live ? "REGISTER SOCIAL KNOWLEDGE SOURCE" : undefined,
    });
    if (!r.ok) return toast.error(r.error ?? r.reason ?? "Failed");
    toast.success(live ? "Source registered" : "Dry-run OK");
    if (live) { setForm({ ...form, title: "", pasted_text: "", source_url: "", storage_path: "" }); refresh(); }
  };

  const toggleApprove = async (id: string, current: boolean) => {
    await supabase.from("business_social_knowledge_sources")
      .update({ approved_for_social_training: !current }).eq("id", id);
    refresh();
  };

  return (
    <Card>
      <CardHeader><CardTitle className="text-base flex items-center gap-2"><FileText size={16}/> Social Knowledge Sources</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <div className="grid md:grid-cols-2 gap-2">
          <Select value={form.source_type} onValueChange={(v) => setForm({ ...form, source_type: v })}>
            <SelectTrigger><SelectValue/></SelectTrigger>
            <SelectContent>{SOURCE_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
          </Select>
          <Input placeholder="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}/>
          <Input placeholder="Source URL (optional)" value={form.source_url} onChange={(e) => setForm({ ...form, source_url: e.target.value })}/>
          <Input placeholder="Storage path (optional)" value={form.storage_path} onChange={(e) => setForm({ ...form, storage_path: e.target.value })}/>
        </div>
        <Textarea placeholder="Pasted text (optional)" rows={3} value={form.pasted_text} onChange={(e) => setForm({ ...form, pasted_text: e.target.value })}/>
        <Textarea placeholder="Founder notes (optional)" rows={2} value={form.founder_notes} onChange={(e) => setForm({ ...form, founder_notes: e.target.value })}/>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => register(false)}>Dry-run</Button>
          <Button size="sm" onClick={() => register(true)}>Register source</Button>
        </div>

        <div className="space-y-1">
          {sources.length === 0 && <p className="text-xs text-muted-foreground">No sources yet.</p>}
          {sources.map(s => (
            <div key={s.id} className="flex justify-between items-center p-2 rounded bg-secondary/40 text-xs">
              <div>
                <span className="font-medium">{s.title}</span>{" "}
                <Badge variant="outline">{s.source_type}</Badge>{" "}
                <Badge variant="secondary">{s.source_status}</Badge>
              </div>
              <Button size="sm" variant={s.approved_for_social_training ? "default" : "outline"}
                onClick={() => toggleApprove(s.id, s.approved_for_social_training)}>
                {s.approved_for_social_training ? "Approved" : "Approve for training"}
              </Button>
            </div>
          ))}
        </div>
        <p className="text-[10px] text-muted-foreground">No auto-crawl. Internal-only. Founder approval required.</p>
      </CardContent>
    </Card>
  );
}

export function SocialKnowledgeExtractionPanel({ businessId }: { businessId: string }) {
  const [preview, setPreview] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const run = async () => {
    if (!businessId) return;
    setLoading(true);
    const r = await invoke("social-knowledge-extract-preview", { business_id: businessId, include_unapproved_sources: false });
    setPreview(r); setLoading(false);
  };
  const save = async () => {
    const r = await invoke("social-knowledge-extract-save", {
      business_id: businessId, dry_run: false, confirmation_phrase: "SAVE SOCIAL KNOWLEDGE EXTRACTION",
    });
    if (!r.ok) return toast.error(r.error ?? r.reason ?? "Failed");
    toast.success("Extraction saved");
  };

  return (
    <Card>
      <CardHeader><CardTitle className="text-base flex items-center gap-2"><Sparkles size={16}/> Knowledge Extraction</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <div className="flex gap-2">
          <Button size="sm" onClick={run} disabled={loading}>{loading ? "Running…" : "Run extraction preview"}</Button>
          <Button size="sm" variant="outline" onClick={save} disabled={!preview?.ok}>Save extraction</Button>
        </div>
        {preview?.extraction && (
          <div className="text-xs space-y-1">
            <div>Sources considered: {preview.sources_considered}</div>
            <div>Confidence: <Badge>{preview.extraction.confidence_score}</Badge></div>
            <div>Voice: {preview.extraction.extracted_brand_voice ?? "—"}</div>
            <div>Audience: {preview.extraction.extracted_audience ?? "—"}</div>
            <div>Missing: {(preview.extraction.missing_inputs ?? []).join(", ") || "none"}</div>
            {preview.extraction.extracted_compliance_notes && (
              <div className="p-2 rounded bg-yellow-500/10 text-yellow-400 flex items-start gap-2">
                <AlertTriangle size={12} className="mt-0.5"/>
                {preview.extraction.extracted_compliance_notes}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function SocialBrainProfilePanel({ businessId, businessName }: { businessId: string; businessName?: string }) {
  const [profile, setProfile] = useState<any>(null);
  const [preview, setPreview] = useState<any>(null);
  const [useSeed, setUseSeed] = useState(false);

  const refresh = async () => {
    if (!businessId) return;
    const { data } = await supabase.from("business_social_brain_profiles")
      .select("*").eq("business_id", businessId).maybeSingle();
    setProfile(data);
  };
  useEffect(() => { refresh(); /* eslint-disable-next-line */ }, [businessId]);

  const gen = async (live: boolean) => {
    const body: any = {
      business_id: businessId, business_name: businessName,
      use_neoncandy_seed: useSeed, dry_run: !live,
    };
    if (live) {
      body.confirmation_phrase = profile?.profile_status === "approved" || profile?.profile_status === "applied_to_settings"
        ? "REGENERATE APPROVED SOCIAL BRAIN PROFILE" : "GENERATE SOCIAL BRAIN PROFILE";
    }
    const r = await invoke("social-brain-profile-generate", body);
    if (!r.ok) return toast.error(r.reason ?? r.error ?? "Failed");
    if (live) { toast.success("Profile generated"); refresh(); setPreview(null); }
    else { setPreview(r.preview); }
  };

  return (
    <Card>
      <CardHeader><CardTitle className="text-base flex items-center gap-2"><Brain size={16}/> Social Brain Profile</CardTitle></CardHeader>
      <CardContent className="space-y-3 text-xs">
        {profile ? (
          <div className="grid grid-cols-2 gap-2">
            <span>Status</span><Badge variant="secondary">{profile.profile_status}</Badge>
            <span>Confidence</span><span>{profile.confidence_score}</span>
            <span>Voice</span><span>{profile.brand_voice ?? "—"}</span>
            <span>Audience</span><span>{profile.audience_summary ?? "—"}</span>
            <span>Primary CTA</span><span>{profile.primary_cta ?? "—"}</span>
            <span>Missing inputs</span><span>{(profile.missing_inputs ?? []).join(", ") || "—"}</span>
          </div>
        ) : <p className="text-muted-foreground">No profile yet.</p>}
        <label className="flex items-center gap-2 text-[11px]">
          <input type="checkbox" checked={useSeed} onChange={(e) => setUseSeed(e.target.checked)}/>
          Use NeonCandy example seed (example only — not required)
        </label>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => gen(false)}>Dry-run generate</Button>
          <Button size="sm" onClick={() => gen(true)}>Generate profile</Button>
        </div>
        {preview && (
          <pre className="p-2 bg-secondary/40 rounded overflow-x-auto text-[10px]">
            {JSON.stringify(preview, null, 2)}
          </pre>
        )}
      </CardContent>
    </Card>
  );
}

export function SocialBrainApprovalPanel({ businessId }: { businessId: string }) {
  const [profile, setProfile] = useState<any>(null);
  const [notes, setNotes] = useState("");
  const refresh = async () => {
    const { data } = await supabase.from("business_social_brain_profiles")
      .select("*").eq("business_id", businessId).maybeSingle();
    setProfile(data);
  };
  useEffect(() => { if (businessId) refresh(); /* eslint-disable-next-line */ }, [businessId]);

  const decide = async (decision: "approve" | "reject" | "needs_edit") => {
    if (!profile) return;
    const phrase = decision === "approve" ? "APPROVE SOCIAL BRAIN PROFILE" : "REVIEW SOCIAL BRAIN PROFILE";
    const r = await invoke("social-brain-profile-approve", {
      business_id: businessId, profile_id: profile.id, decision, founder_notes: notes, confirmation_phrase: phrase,
    });
    if (!r.ok) return toast.error(r.reason ?? r.error ?? "Failed");
    toast.success(`Decision: ${decision}`); refresh();
  };

  return (
    <Card>
      <CardHeader><CardTitle className="text-base flex items-center gap-2"><CheckCircle2 size={16}/> Profile Approval</CardTitle></CardHeader>
      <CardContent className="space-y-2 text-xs">
        {!profile ? <p className="text-muted-foreground">No profile to review.</p> :
          <>
            <p>Status: <Badge variant="secondary">{profile.profile_status}</Badge></p>
            <Textarea placeholder="Founder notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2}/>
            <div className="flex gap-2">
              <Button size="sm" onClick={() => decide("approve")}>Approve</Button>
              <Button size="sm" variant="outline" onClick={() => decide("needs_edit")}>Needs edit</Button>
              <Button size="sm" variant="destructive" onClick={() => decide("reject")}>Reject</Button>
            </div>
          </>}
      </CardContent>
    </Card>
  );
}

export function SocialBrainSettingsApplyPanel({ businessId }: { businessId: string }) {
  const [profile, setProfile] = useState<any>(null);
  const [preview, setPreview] = useState<any>(null);
  useEffect(() => {
    if (!businessId) return;
    supabase.from("business_social_brain_profiles").select("*").eq("business_id", businessId).maybeSingle()
      .then(({ data }) => setProfile(data));
  }, [businessId]);

  const apply = async (live: boolean) => {
    if (!profile) return toast.error("No profile");
    const r = await invoke("social-brain-apply-to-settings", {
      business_id: businessId, profile_id: profile.id,
      dry_run: !live, confirmation_phrase: live ? "APPLY SOCIAL BRAIN SETTINGS" : undefined,
    });
    if (!r.ok) return toast.error(r.reason ?? r.error ?? "Failed");
    if (live) toast.success("Applied to settings (autopilot stays locked)");
    else setPreview(r.would_apply);
  };

  return (
    <Card>
      <CardHeader><CardTitle className="text-base flex items-center gap-2"><Lock size={16}/> Apply Brain → Automation Settings</CardTitle></CardHeader>
      <CardContent className="space-y-2 text-xs">
        <p>Status: <Badge variant="secondary">{profile?.profile_status ?? "—"}</Badge></p>
        <p className="text-yellow-400">Auto-publish, auto-reply and cold DM remain locked off. Mode stays approval_required.</p>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => apply(false)}>Dry-run apply</Button>
          <Button size="sm" onClick={() => apply(true)}>Apply now</Button>
        </div>
        {preview && <pre className="p-2 bg-secondary/40 rounded text-[10px] overflow-x-auto">{JSON.stringify(preview, null, 2)}</pre>}
      </CardContent>
    </Card>
  );
}

export function SocialBrainHealthPanel({ businessId }: { businessId: string }) {
  const [h, setH] = useState<any>(null);
  useEffect(() => {
    if (!businessId) return;
    invoke("social-brain-healthcheck", undefined, "GET", `?business_id=${businessId}`).then(setH);
  }, [businessId]);
  if (!businessId) return null;
  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Social Brain Health</CardTitle></CardHeader>
      <CardContent className="text-xs grid grid-cols-2 gap-2">
        <span>Sources</span><span>{h?.sources_count} ({h?.approved_sources_count} approved)</span>
        <span>Extractions</span><span>{h?.extraction_count}</span>
        <span>Profile</span><span>{h?.profile_status ?? "none"} · {h?.confidence_score ?? 0}</span>
        <span>Settings applied</span><span>{h?.settings_applied ? "yes" : "no"}</span>
        <span>Ready for content gen</span><span>{h?.ready_for_content_generation ? "YES" : "no"}</span>
        <span>Missing inputs</span><span>{(h?.missing_inputs ?? []).join(", ") || "—"}</span>
      </CardContent>
    </Card>
  );
}