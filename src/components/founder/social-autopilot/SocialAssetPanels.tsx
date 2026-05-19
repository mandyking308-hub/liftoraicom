import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Lock, FileImage, ShieldCheck, ListChecks, Layers, Quote, Activity, Trash2 } from "lucide-react";

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

const SafetyNote = () => (
  <p className="text-[10px] text-muted-foreground flex items-center gap-1">
    <Lock size={10} /> Internal only. No upload to platforms. No publish. No DM.
  </p>
);

const ASSET_TYPES = ["video","short_clip","long_video","image","carousel","audio","music_track","thumbnail","text","caption_block","hook_bank","link","document","logo","brand_image","product_image","testimonial","case_study","lead_magnet","landing_page_mockup","ad_creative","founder_photo","other"];

export function SocialAssetLibraryHealthPanel({ businessId }: { businessId: string }) {
  const [h, setH] = useState<any>(null);
  const refresh = async () => {
    if (!businessId) return;
    const r = await invoke("social-asset-library-healthcheck", undefined, "GET", `?business_id=${businessId}`);
    setH(r);
  };
  useEffect(() => { refresh(); /* eslint-disable-next-line */ }, [businessId]);
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base flex items-center gap-2"><Activity size={16} /> Asset Library Health</CardTitle>
        <Button size="sm" variant="outline" onClick={refresh}>Refresh</Button>
      </CardHeader>
      <CardContent className="text-xs grid grid-cols-2 md:grid-cols-3 gap-2">
        <span>Assets total</span><span>{h?.assets_total ?? 0}</span>
        <span>Approved social</span><span>{h?.approved_for_social ?? 0}</span>
        <span>Approved ads</span><span>{h?.approved_for_ads ?? 0}</span>
        <span>Rights unknown</span><span className="text-yellow-400">{h?.rights_unknown ?? 0}</span>
        <span>Rights blocked</span><span className="text-red-400">{h?.rights_blocked ?? 0}</span>
        <span>Legal review</span><span>{h?.legal_review_required ?? 0}</span>
        <span>Requirements</span><span>{h?.requirements_total ?? 0} ({h?.requirements_missing ?? 0} missing, {h?.requirements_critical ?? 0} critical)</span>
        <span>Collections</span><span>{h?.collections_total ?? 0}</span>
        <span>Hook/caption bank</span><span>{h?.hook_caption_bank_total ?? 0}</span>
        <span>Test data</span><span>{h?.test_data_count ?? 0}</span>
        <span>Content gen ready</span><span>{h?.ready_for_content_generation ? "YES" : "no"}</span>
        <span>Calendar gen ready</span><span>{h?.ready_for_calendar_generation ? "YES" : "no"}</span>
        <div className="col-span-full text-yellow-400">Blockers: {(h?.blockers ?? []).join(", ") || "none"}</div>
      </CardContent>
    </Card>
  );
}

export function SocialAssetRegisterPanel({ businessId }: { businessId: string }) {
  const [f, setF] = useState({ title: "", asset_type: "image", description: "", file_url: "", rights_status: "unknown", is_test_data: false });
  const run = async (live: boolean) => {
    if (!businessId || !f.title) return toast.error("Business + title required");
    const r = await invoke("social-asset-register", {
      business_id: businessId, ...f, dry_run: !live,
      confirmation_phrase: live ? "REGISTER SOCIAL ASSET" : undefined,
    });
    if (!r.ok) return toast.error(r.reason ?? r.error ?? "Failed");
    toast.success(live ? "Asset registered" : "Dry-run OK");
    if (live) setF({ ...f, title: "", description: "", file_url: "" });
  };
  return (
    <Card>
      <CardHeader><CardTitle className="text-base flex items-center gap-2"><FileImage size={16} /> Register Asset</CardTitle></CardHeader>
      <CardContent className="space-y-2 text-xs">
        <Input placeholder="Title" value={f.title} onChange={e => setF({ ...f, title: e.target.value })}/>
        <div className="grid grid-cols-2 gap-2">
          <Select value={f.asset_type} onValueChange={(v) => setF({ ...f, asset_type: v })}>
            <SelectTrigger><SelectValue/></SelectTrigger>
            <SelectContent>{ASSET_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
          </Select>
          <Input placeholder="File URL or storage path (optional)" value={f.file_url} onChange={e => setF({ ...f, file_url: e.target.value })}/>
        </div>
        <Textarea rows={2} placeholder="Description / source notes" value={f.description} onChange={e => setF({ ...f, description: e.target.value })}/>
        <label className="flex items-center gap-2 text-[11px]">
          <input type="checkbox" checked={f.is_test_data} onChange={e => setF({ ...f, is_test_data: e.target.checked })}/>
          Mark as test data (purgeable)
        </label>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => run(false)}>Dry-run</Button>
          <Button size="sm" onClick={() => run(true)}>Register</Button>
        </div>
        <SafetyNote/>
      </CardContent>
    </Card>
  );
}

export function SocialAssetRightsPanel({ businessId }: { businessId: string }) {
  const [data, setData] = useState<any>(null);
  const scan = async () => {
    const r = await invoke("social-asset-rights-preview", { business_id: businessId });
    setData(r);
  };
  useEffect(() => { if (businessId) scan(); /* eslint-disable-next-line */ }, [businessId]);
  const approve = async (asset_id: string) => {
    const r = await invoke("social-asset-rights-review-apply", {
      business_id: businessId, asset_id, dry_run: false,
      confirmation_phrase: "APPLY SOCIAL ASSET RIGHTS REVIEW",
      decision: { review_status: "approved", rights_status_after: "approved",
        public_use_allowed: true, commercial_use_allowed: true, paid_ads_allowed: false, derivative_use_allowed: false },
    });
    if (!r.ok) return toast.error(r.reason ?? r.error ?? "Failed");
    toast.success("Rights approved"); scan();
  };
  const block = async (asset_id: string) => {
    const r = await invoke("social-asset-rights-review-apply", {
      business_id: businessId, asset_id, dry_run: false,
      confirmation_phrase: "APPLY SOCIAL ASSET RIGHTS REVIEW",
      decision: { review_status: "rejected", rights_status_after: "blocked" },
    });
    if (!r.ok) return toast.error(r.reason ?? r.error ?? "Failed");
    toast.success("Asset blocked"); scan();
  };
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base flex items-center gap-2"><ShieldCheck size={16} /> Rights & Consent</CardTitle>
        <Button size="sm" variant="outline" onClick={scan}>Re-scan</Button>
      </CardHeader>
      <CardContent className="space-y-2 text-xs">
        <p>Total {data?.total ?? 0} · unknown {data?.unknown ?? 0} · blocked {data?.blocked ?? 0} · legal review {data?.legal_review_required ?? 0}</p>
        {(data?.flagged ?? []).slice(0, 25).map((f: any) => (
          <div key={f.id} className="p-2 rounded bg-secondary/40 space-y-1">
            <div className="flex justify-between">
              <span className="font-semibold">{f.title}</span>
              <div className="flex gap-1">
                <Badge variant="outline">{f.asset_type}</Badge>
                <Badge variant={f.rights_status === "blocked" ? "destructive" : "secondary"}>{f.rights_status}</Badge>
              </div>
            </div>
            {(f.warnings ?? []).length > 0 && <p className="text-yellow-400">{f.warnings.join(" · ")}</p>}
            <div className="flex gap-1">
              <Button size="sm" variant="outline" onClick={() => approve(f.id)}>Approve public</Button>
              <Button size="sm" variant="destructive" onClick={() => block(f.id)}>Block</Button>
            </div>
          </div>
        ))}
        <SafetyNote/>
      </CardContent>
    </Card>
  );
}

export function SocialAssetRequirementsPanel({ businessId }: { businessId: string }) {
  const [rows, setRows] = useState<any[]>([]);
  const refresh = async () => {
    if (!businessId) return;
    const { data } = await supabase.from("social_asset_requirements").select("*").eq("business_id", businessId)
      .order("priority", { ascending: false });
    setRows(data ?? []);
  };
  useEffect(() => { refresh(); /* eslint-disable-next-line */ }, [businessId]);
  const gen = async (live: boolean) => {
    const r = await invoke("social-asset-requirements-generate", {
      business_id: businessId, dry_run: !live,
      confirmation_phrase: live ? "CREATE SOCIAL ASSET REQUIREMENTS" : undefined,
    });
    if (!r.ok) return toast.error(r.reason ?? r.error ?? "Failed");
    toast.success(live ? `Inserted ${r.inserted}` : `Preview: ${r.would_create}`);
    if (live) refresh();
  };
  const match = async () => {
    const r = await invoke("social-asset-match-requirements", {
      business_id: businessId, dry_run: false, confirmation_phrase: "MATCH SOCIAL ASSET REQUIREMENTS",
    });
    if (!r.ok) return toast.error(r.reason ?? r.error ?? "Failed");
    toast.success(`Updated ${r.updated}`); refresh();
  };
  return (
    <Card>
      <CardHeader><CardTitle className="text-base flex items-center gap-2"><ListChecks size={16} /> Missing Asset Requirements</CardTitle></CardHeader>
      <CardContent className="space-y-2 text-xs">
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => gen(false)}>Preview</Button>
          <Button size="sm" onClick={() => gen(true)}>Generate requirements</Button>
          <Button size="sm" variant="outline" onClick={match}>Match assets</Button>
        </div>
        {rows.length === 0 && <p className="text-muted-foreground">No requirements yet.</p>}
        {rows.map(r => (
          <div key={r.id} className="p-2 rounded bg-secondary/40 flex justify-between">
            <span>{r.requirement_name} <span className="text-muted-foreground">({r.asset_type})</span></span>
            <div className="flex gap-1">
              <Badge variant={r.priority === "critical" ? "destructive" : "secondary"}>{r.priority}</Badge>
              <Badge variant="outline">{r.status}</Badge>
            </div>
          </div>
        ))}
        <SafetyNote/>
      </CardContent>
    </Card>
  );
}

export function SocialAssetCollectionsPanel({ businessId }: { businessId: string }) {
  const [rows, setRows] = useState<any[]>([]);
  const [f, setF] = useState({ collection_name: "", collection_type: "brand_kit" });
  const refresh = async () => {
    if (!businessId) return;
    const { data } = await supabase.from("social_asset_collections").select("*").eq("business_id", businessId);
    setRows(data ?? []);
  };
  useEffect(() => { refresh(); /* eslint-disable-next-line */ }, [businessId]);
  const create = async () => {
    if (!f.collection_name) return toast.error("Name required");
    const r = await invoke("social-asset-collection-create", {
      business_id: businessId, ...f, dry_run: false,
      confirmation_phrase: "CREATE SOCIAL ASSET COLLECTION",
    });
    if (!r.ok) return toast.error(r.reason ?? r.error ?? "Failed");
    toast.success("Collection created"); setF({ ...f, collection_name: "" }); refresh();
  };
  return (
    <Card>
      <CardHeader><CardTitle className="text-base flex items-center gap-2"><Layers size={16} /> Asset Collections</CardTitle></CardHeader>
      <CardContent className="space-y-2 text-xs">
        <div className="grid grid-cols-2 gap-2">
          <Input placeholder="Collection name" value={f.collection_name} onChange={e => setF({ ...f, collection_name: e.target.value })}/>
          <Select value={f.collection_type} onValueChange={(v) => setF({ ...f, collection_type: v })}>
            <SelectTrigger><SelectValue/></SelectTrigger>
            <SelectContent>{["brand_kit","campaign_pack","social_pack","content_pillar_pack","product_pack","music_release_pack","founder_pack","proof_pack","lead_magnet_pack","general","other"].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <Button size="sm" onClick={create}>Create collection</Button>
        {rows.map(r => (
          <div key={r.id} className="p-2 rounded bg-secondary/40 flex justify-between">
            <span>{r.collection_name}</span>
            <div className="flex gap-1"><Badge variant="outline">{r.collection_type}</Badge><Badge variant="secondary">{r.approval_status}</Badge></div>
          </div>
        ))}
        <SafetyNote/>
      </CardContent>
    </Card>
  );
}

export function SocialHookCaptionBankPanel({ businessId }: { businessId: string }) {
  const [rows, setRows] = useState<any[]>([]);
  const [f, setF] = useState({ bank_type: "hook", text_value: "", platform: "" });
  const refresh = async () => {
    if (!businessId) return;
    const { data } = await supabase.from("social_hook_caption_bank").select("*").eq("business_id", businessId).order("created_at", { ascending: false }).limit(50);
    setRows(data ?? []);
  };
  useEffect(() => { refresh(); /* eslint-disable-next-line */ }, [businessId]);
  const save = async () => {
    if (!f.text_value) return toast.error("Text required");
    const r = await invoke("social-hook-caption-bank-save", {
      business_id: businessId, ...f, platform: f.platform || null,
      dry_run: false, confirmation_phrase: "SAVE SOCIAL HOOK CAPTION",
    });
    if (!r.ok) return toast.error(r.reason ?? r.error ?? "Failed");
    toast.success("Saved"); setF({ ...f, text_value: "" }); refresh();
  };
  return (
    <Card>
      <CardHeader><CardTitle className="text-base flex items-center gap-2"><Quote size={16} /> Hook / Caption Bank</CardTitle></CardHeader>
      <CardContent className="space-y-2 text-xs">
        <div className="grid grid-cols-3 gap-2">
          <Select value={f.bank_type} onValueChange={(v) => setF({ ...f, bank_type: v })}>
            <SelectTrigger><SelectValue/></SelectTrigger>
            <SelectContent>{["hook","caption","cta","hashtag_set","opening_line","closing_line","comment_reply","dm_reply","headline","other"].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
          </Select>
          <Input placeholder="Platform (optional)" value={f.platform} onChange={e => setF({ ...f, platform: e.target.value })}/>
          <Button size="sm" onClick={save}>Save</Button>
        </div>
        <Textarea rows={2} placeholder="Text value" value={f.text_value} onChange={e => setF({ ...f, text_value: e.target.value })}/>
        {rows.map(r => (
          <div key={r.id} className="p-2 rounded bg-secondary/40">
            <div className="flex justify-between"><Badge variant="outline">{r.bank_type}</Badge><Badge variant="secondary">{r.approval_status}</Badge></div>
            <p className="mt-1">{r.text_value}</p>
          </div>
        ))}
        <SafetyNote/>
      </CardContent>
    </Card>
  );
}

export function SocialAssetUsagePanel({ businessId }: { businessId: string }) {
  const [rows, setRows] = useState<any[]>([]);
  useEffect(() => {
    if (!businessId) return;
    supabase.from("social_asset_usage_log").select("*").eq("business_id", businessId)
      .order("used_at", { ascending: false }).limit(50).then(({ data }) => setRows(data ?? []));
  }, [businessId]);
  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Usage Log</CardTitle></CardHeader>
      <CardContent className="text-xs space-y-1">
        {rows.length === 0 && <p className="text-muted-foreground">No usage logged.</p>}
        {rows.map(r => (
          <div key={r.id} className="p-2 rounded bg-secondary/40 flex justify-between">
            <span>{r.usage_context} · {r.platform ?? "—"}</span>
            <Badge variant="outline">{r.usage_status}</Badge>
          </div>
        ))}
        <SafetyNote/>
      </CardContent>
    </Card>
  );
}

export function SocialAssetMissingWarningsCard({ businessId }: { businessId: string }) {
  const [h, setH] = useState<any>(null);
  useEffect(() => {
    if (!businessId) return;
    invoke("social-asset-library-healthcheck", undefined, "GET", `?business_id=${businessId}`).then(setH);
  }, [businessId]);
  if (!h || (h.requirements_critical === 0 && h.rights_blocked === 0 && h.rights_unknown === 0)) return null;
  return (
    <Card className="border-yellow-500/40 bg-yellow-500/5">
      <CardContent className="p-3 text-xs">
        <p className="font-semibold text-yellow-400">Asset gaps blocking content generation:</p>
        <ul className="list-disc pl-4 mt-1">
          {h.requirements_critical > 0 && <li>{h.requirements_critical} critical asset requirement(s) missing.</li>}
          {h.rights_blocked > 0 && <li>{h.rights_blocked} asset(s) rights-blocked.</li>}
          {h.rights_unknown > 0 && <li>{h.rights_unknown} asset(s) with unknown rights — review before publish.</li>}
        </ul>
      </CardContent>
    </Card>
  );
}

export function SocialAssetLibraryDashboard({ businessId }: { businessId: string }) {
  const purge = async (live: boolean) => {
    const r = await invoke("social-asset-rehearsal-purge", {
      business_id: businessId, dry_run: !live,
      confirmation_phrase: live ? "PURGE SOCIAL ASSET TEST DATA" : undefined,
    });
    if (!r.ok) return toast.error(r.reason ?? r.error ?? "Failed");
    toast.success(live ? "Test data purged" : `Dry-run: ${JSON.stringify(r.would_delete)}`);
  };
  return (
    <div className="space-y-4">
      <SocialAssetMissingWarningsCard businessId={businessId}/>
      <SocialAssetLibraryHealthPanel businessId={businessId}/>
      <div className="grid md:grid-cols-2 gap-4">
        <SocialAssetRegisterPanel businessId={businessId}/>
        <SocialAssetRightsPanel businessId={businessId}/>
        <SocialAssetRequirementsPanel businessId={businessId}/>
        <SocialAssetCollectionsPanel businessId={businessId}/>
        <SocialHookCaptionBankPanel businessId={businessId}/>
        <SocialAssetUsagePanel businessId={businessId}/>
      </div>
      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><Trash2 size={16} /> Rehearsal Purge</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-xs">
          <p className="text-muted-foreground">Deletes only is_test_data=true rows. Real assets are protected.</p>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => purge(false)}>Dry-run</Button>
            <Button size="sm" variant="destructive" onClick={() => purge(true)}>Purge test data</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}