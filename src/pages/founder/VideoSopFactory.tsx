import { useEffect, useMemo, useState } from "react";
import FounderLayout from "@/components/founder/FounderLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { AlertTriangle, Plus, Sparkles, Link as LinkIcon, UserPlus, CheckCircle2, ShieldAlert, Video } from "lucide-react";
import ScriptStudio from "@/components/founder/video-sop/ScriptStudio";

type Asset = any;
type ScriptRow = any;
type LinkRow = any;
type AssignmentRow = any;
type Business = { id: string; name?: string | null };

const ASSET_TYPES = [
  "sop_video","customer_onboarding_video","operator_training","support_video",
  "sales_training","compliance_training","founder_training","buyer_handover",
];
const AUDIENCE_TYPES = ["founder","operator","customer","support","buyer","adviser"];
const SOURCE_TYPES = ["manual","sop","faq","website_text","uploaded_document","support_script","onboarding_pack","other"];
const STATUSES = ["draft","script_generated","needs_recording","recorded","needs_review","approved","published_internal","archived"];
const PRIORITIES = ["low","normal","high","urgent"];
const VISIBILITY = ["internal_only","customer_visible","buyer_handover","public"];
const EXTERNAL_TOOLS = ["loom","guidde","panopto","synthesia","heygen","youtube_unlisted","vimeo","manual_upload","other"];
const PRIVACY = ["private","restricted","unlisted","public"];
const ASSIGN_TYPES = ["operator","customer","support","buyer","adviser","founder"];

function StatusBadge({ s }: { s: string }) {
  const map: Record<string, string> = {
    draft: "bg-muted text-foreground",
    script_generated: "bg-blue-500/15 text-blue-400",
    needs_recording: "bg-amber-500/15 text-amber-400",
    recorded: "bg-purple-500/15 text-purple-300",
    needs_review: "bg-orange-500/15 text-orange-400",
    approved: "bg-emerald-500/15 text-emerald-400",
    published_internal: "bg-primary/15 text-primary",
    archived: "bg-muted-foreground/20 text-muted-foreground",
  };
  return <Badge variant="outline" className={map[s] ?? ""}>{s.replace(/_/g, " ")}</Badge>;
}

function generateTemplateScript(asset: Asset) {
  const title = asset.asset_title ?? "Untitled";
  const audience = asset.audience_type ?? "operator";
  const src = (asset.source_text ?? "").trim();
  const lines = src ? src.split(/\n+/).filter(Boolean).slice(0, 12) : [];
  const bullet = (arr: string[]) => arr.map((s, i) => `${i + 1}. ${s}`).join("\n");
  return {
    script_title: `${title} — ${audience} training`,
    short_description: `Internal ${audience} training video derived from ${asset.source_type}.`,
    learning_objective: `By the end of this video, the ${audience} can perform "${title}" without supervision.`,
    video_length_target: "3–6 minutes",
    voiceover_script:
      `Welcome. In this short training we cover "${title}" for the ${audience} role.\n\n` +
      (lines.length ? `Key points from the source material:\n${bullet(lines)}\n\n` : "") +
      `Pause anywhere you need to. Mark the assignment complete when finished.`,
    scene_outline: bullet([
      "Title card + business brand intro",
      "Why this matters (1 sentence)",
      "Walkthrough of each step on screen",
      "Common mistakes / warnings",
      "Recap + next action",
    ]),
    screen_recording_steps: lines.length
      ? bullet(lines)
      : bullet(["Open the relevant tool", "Demonstrate the workflow end-to-end", "Show the success state"]),
    on_screen_text: "Brand name + step numbers + key terms.",
    callouts: "Highlight buttons, fields and confirmations as they appear.",
    warnings: "Do not share customer data. Do not skip approval gates.",
    customer_friendly_version: `Short customer-facing walkthrough of "${title}". Keep tone friendly, no internal jargon.`,
    operator_version: `Operator SOP walkthrough for "${title}". Include exact clicks, expected outputs and escalation path.`,
    founder_notes: "Review for accuracy, brand voice and compliance before approval.",
  };
}

export default function VideoSopFactoryPage() {
  const { user } = useAuth();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [scripts, setScripts] = useState<ScriptRow[]>([]);
  const [links, setLinks] = useState<LinkRow[]>([]);
  const [assignments, setAssignments] = useState<AssignmentRow[]>([]);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);
  const [linkOpen, setLinkOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);

  const [form, setForm] = useState({
    business_id: "",
    asset_title: "",
    asset_type: "sop_video",
    audience_type: "operator",
    source_type: "manual",
    source_text: "",
    source_reference_id: "",
    saleability_evidence: false,
    compliance_evidence: false,
    external_visibility: "internal_only",
    priority: "normal",
    is_test_data: false,
  });

  const [linkForm, setLinkForm] = useState({
    external_tool: "loom",
    video_url: "",
    embed_url: "",
    transcript_url: "",
    thumbnail_url: "",
    duration_seconds: "" as string,
    access_notes: "",
    privacy_status: "private",
    approved_for_customer_use: false,
    approved_for_saleability_pack: false,
  });

  const [assignForm, setAssignForm] = useState({
    assigned_to_type: "operator",
    assigned_to_name: "",
    assigned_to_email: "",
    completion_required: true,
    completion_status: "not_started",
    evidence_notes: "",
  });

  const loadAll = async () => {
    setLoading(true);
    const [a, s, l, t, b] = await Promise.all([
      supabase.from("video_sop_assets" as any).select("*").order("created_at", { ascending: false }),
      supabase.from("video_sop_scripts" as any).select("*").order("created_at", { ascending: false }),
      supabase.from("video_sop_links" as any).select("*").order("created_at", { ascending: false }),
      supabase.from("video_sop_training_assignments" as any).select("*").order("created_at", { ascending: false }),
      supabase.from("businesses" as any).select("id,name").order("name", { ascending: true }),
    ]);
    setAssets((a.data as any[]) ?? []);
    setScripts((s.data as any[]) ?? []);
    setLinks((l.data as any[]) ?? []);
    setAssignments((t.data as any[]) ?? []);
    setBusinesses((b.data as any[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { loadAll(); }, []);

  const businessLookup = useMemo(() => {
    const m: Record<string, Business> = {};
    businesses.forEach((b) => (m[b.id] = b));
    return m;
  }, [businesses]);

  const stats = useMemo(() => {
    const by = (fn: (a: Asset) => boolean) => assets.filter(fn).length;
    return {
      total: assets.length,
      drafts: by((a) => a.status === "draft"),
      needs_recording: by((a) => a.status === "needs_recording"),
      needs_review: by((a) => a.status === "needs_review"),
      approved: by((a) => a.status === "approved" || a.status === "published_internal"),
      customer_ready: by((a) => a.external_visibility === "customer_visible" && (a.status === "approved" || a.status === "published_internal")),
      saleability: by((a) => a.saleability_evidence && a.status === "approved"),
      missing_business: by((a) => !a.business_id),
    };
  }, [assets]);

  const audit = async (asset_id: string | null, business_id: string | null, event_type: string, summary: string, meta: any = {}) => {
    await supabase.from("video_sop_audit_events" as any).insert({
      asset_id, business_id, event_type, event_summary: summary,
      actor_user_id: user?.id ?? null, actor_role: "founder", metadata_json: meta,
    } as any);
  };

  const createAsset = async () => {
    if (!form.asset_title.trim()) { toast({ title: "Title required", variant: "destructive" }); return; }
    const biz = businessLookup[form.business_id];
    const row = {
      business_id: form.business_id || null,
      business_name_snapshot: biz?.name ?? null,
      brand_name: biz?.name ?? null,
      asset_title: form.asset_title,
      asset_type: form.asset_type,
      audience_type: form.audience_type,
      source_type: form.source_type,
      source_text: form.source_text,
      source_reference_id: form.source_reference_id || null,
      saleability_evidence: form.saleability_evidence,
      compliance_evidence: form.compliance_evidence,
      external_visibility: form.external_visibility,
      priority: form.priority,
      status: "draft",
      is_test_data: form.is_test_data,
      created_by: user?.id ?? null,
    };
    const { data, error } = await supabase.from("video_sop_assets" as any).insert(row as any).select("*").single();
    if (error) { toast({ title: "Create failed", description: error.message, variant: "destructive" }); return; }
    await audit((data as any).id, (data as any).business_id, "asset_created", `Asset created: ${form.asset_title}`);
    toast({ title: "Asset created" });
    setCreateOpen(false);
    setForm({ ...form, asset_title: "", source_text: "", source_reference_id: "" });
    loadAll();
  };

  const updateAssetStatus = async (asset: Asset, status: string) => {
    const patch: any = { status };
    if (status === "approved") { patch.approved_by = user?.id ?? null; patch.approved_at = new Date().toISOString(); }
    const { error } = await supabase.from("video_sop_assets" as any).update(patch).eq("id", asset.id);
    if (error) { toast({ title: "Update failed", description: error.message, variant: "destructive" }); return; }
    await audit(asset.id, asset.business_id, "status_change", `Status → ${status}`);
    loadAll();
  };

  const generateScript = async (asset: Asset) => {
    const tpl = generateTemplateScript(asset);
    const { error } = await supabase.from("video_sop_scripts" as any).insert({
      asset_id: asset.id, business_id: asset.business_id, ...tpl,
      generated_by_ai: false, ai_prompt_used: "internal_template_v1", status: "draft",
    } as any);
    if (error) { toast({ title: "Script failed", description: error.message, variant: "destructive" }); return; }
    if (asset.status === "draft") await updateAssetStatus(asset, "script_generated");
    await audit(asset.id, asset.business_id, "script_generated", "Structured draft script generated");
    toast({ title: "Script draft generated" });
    loadAll();
  };

  const addLink = async () => {
    if (!selectedAssetId) return;
    const asset = assets.find((a) => a.id === selectedAssetId);
    const row = {
      asset_id: selectedAssetId,
      business_id: asset?.business_id ?? null,
      ...linkForm,
      duration_seconds: linkForm.duration_seconds ? Number(linkForm.duration_seconds) : null,
    };
    const { error } = await supabase.from("video_sop_links" as any).insert(row as any);
    if (error) { toast({ title: "Link failed", description: error.message, variant: "destructive" }); return; }
    await audit(selectedAssetId, asset?.business_id ?? null, "link_added", `Video link added (${linkForm.external_tool})`);
    toast({ title: "Video link captured" });
    setLinkOpen(false);
    setLinkForm({ ...linkForm, video_url: "", embed_url: "", transcript_url: "", thumbnail_url: "", duration_seconds: "", access_notes: "" });
    loadAll();
  };

  const addAssignment = async () => {
    if (!selectedAssetId) return;
    const asset = assets.find((a) => a.id === selectedAssetId);
    const row = { asset_id: selectedAssetId, business_id: asset?.business_id ?? null, ...assignForm };
    const { error } = await supabase.from("video_sop_training_assignments" as any).insert(row as any);
    if (error) { toast({ title: "Assign failed", description: error.message, variant: "destructive" }); return; }
    await audit(selectedAssetId, asset?.business_id ?? null, "assignment_created", `Assigned to ${assignForm.assigned_to_type}`);
    toast({ title: "Assignment created" });
    setAssignOpen(false);
    setAssignForm({ ...assignForm, assigned_to_name: "", assigned_to_email: "", evidence_notes: "" });
    loadAll();
  };

  const warnings = useMemo(() => {
    const w: { asset: Asset; reasons: string[] }[] = [];
    for (const a of assets) {
      const r: string[] = [];
      if (!a.business_id) r.push("Missing business_id");
      if (a.is_test_data) r.push("Test data");
      if (a.saleability_evidence && a.status !== "approved" && a.status !== "published_internal") r.push("Saleability evidence flagged but not approved");
      if (a.external_visibility === "customer_visible" && a.status !== "approved" && a.status !== "published_internal") r.push("Customer-visible but not approved");
      const assetLinks = links.filter((l) => l.asset_id === a.id);
      if (assetLinks.some((l) => l.privacy_status === "public")) r.push("Video link is public");
      if (assetLinks.some((l) => l.external_tool && !l.access_notes)) r.push("External tool without access notes");
      if (r.length) w.push({ asset: a, reasons: r });
    }
    return w;
  }, [assets, links]);

  const saleabilityByBusiness = useMemo(() => {
    const required = ["operator_training","customer_onboarding_video","support_video","buyer_handover","compliance_training"] as const;
    const map: Record<string, { business: Business | undefined; have: Set<string>; assets: Asset[] }> = {};
    for (const a of assets) {
      if (!a.business_id) continue;
      map[a.business_id] = map[a.business_id] ?? { business: businessLookup[a.business_id], have: new Set(), assets: [] };
      map[a.business_id].assets.push(a);
      if (a.status === "approved" || a.status === "published_internal") map[a.business_id].have.add(a.asset_type);
    }
    return Object.entries(map).map(([bid, v]) => ({
      business_id: bid,
      name: v.business?.name ?? bid.slice(0, 8),
      have: v.have,
      missing: required.filter((r) => !v.have.has(r)),
      total: v.assets.length,
    }));
  }, [assets, businessLookup]);

  const grouped = useMemo(() => {
    const g: Record<string, Asset[]> = {};
    STATUSES.forEach((s) => (g[s] = []));
    assets.forEach((a) => { (g[a.status] ?? (g[a.status] = [])).push(a); });
    return g;
  }, [assets]);

  return (
    <FounderLayout>
      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-semibold flex items-center gap-2"><Video className="text-primary" size={24} /> Video SOP Factory</h1>
            <p className="text-sm text-muted-foreground max-w-3xl mt-1">
              Internal control layer for turning manuals, SOPs, FAQs and onboarding notes into structured
              training/video assets per business. Founder-only. No external publishing. No external API calls
              (Loom/Guidde/Panopto/Synthesia/HeyGen) — links are captured manually.
            </p>
          </div>
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button><Plus size={16} /> New asset</Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader><DialogTitle>Create video SOP asset</DialogTitle></DialogHeader>
              <div className="grid gap-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Business *</Label>
                    <Select value={form.business_id} onValueChange={(v) => setForm({ ...form, business_id: v })}>
                      <SelectTrigger><SelectValue placeholder="Select business" /></SelectTrigger>
                      <SelectContent>
                        {businesses.map((b) => <SelectItem key={b.id} value={b.id}>{b.name ?? b.id.slice(0, 8)}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Priority</Label>
                    <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{PRIORITIES.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label>Asset title *</Label>
                  <Input value={form.asset_title} onChange={(e) => setForm({ ...form, asset_title: e.target.value })} maxLength={200} />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <Label>Asset type</Label>
                    <Select value={form.asset_type} onValueChange={(v) => setForm({ ...form, asset_type: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{ASSET_TYPES.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Audience</Label>
                    <Select value={form.audience_type} onValueChange={(v) => setForm({ ...form, audience_type: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{AUDIENCE_TYPES.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Source type</Label>
                    <Select value={form.source_type} onValueChange={(v) => setForm({ ...form, source_type: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{SOURCE_TYPES.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label>Source text (paste manual / SOP / FAQ)</Label>
                  <Textarea rows={6} value={form.source_text} onChange={(e) => setForm({ ...form, source_text: e.target.value })} maxLength={20000} />
                </div>
                <div>
                  <Label>Source reference notes</Label>
                  <Input value={form.source_reference_id} onChange={(e) => setForm({ ...form, source_reference_id: e.target.value })} maxLength={200} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>External visibility</Label>
                    <Select value={form.external_visibility} onValueChange={(v) => setForm({ ...form, external_visibility: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{VISIBILITY.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="flex flex-col gap-2 pt-6">
                    <label className="flex items-center gap-2 text-sm">
                      <input type="checkbox" checked={form.saleability_evidence} onChange={(e) => setForm({ ...form, saleability_evidence: e.target.checked })} />
                      Saleability evidence
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <input type="checkbox" checked={form.compliance_evidence} onChange={(e) => setForm({ ...form, compliance_evidence: e.target.checked })} />
                      Compliance evidence
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <input type="checkbox" checked={form.is_test_data} onChange={(e) => setForm({ ...form, is_test_data: e.target.checked })} />
                      Test data
                    </label>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
                <Button onClick={createAsset}>Create</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { l: "Total assets", v: stats.total },
            { l: "Drafts", v: stats.drafts },
            { l: "Needs recording", v: stats.needs_recording },
            { l: "Needs review", v: stats.needs_review },
            { l: "Approved / published", v: stats.approved },
            { l: "Customer-ready", v: stats.customer_ready },
            { l: "Saleability evidence", v: stats.saleability },
            { l: "Missing business_id", v: stats.missing_business, danger: stats.missing_business > 0 },
          ].map((s) => (
            <Card key={s.l}>
              <CardContent className="p-4">
                <div className="text-xs text-muted-foreground">{s.l}</div>
                <div className={`text-2xl font-semibold ${s.danger ? "text-destructive" : ""}`}>{s.v}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Tabs defaultValue="production">
          <TabsList className="flex-wrap h-auto">
            <TabsTrigger value="production">Production tracker</TabsTrigger>
            <TabsTrigger value="assets">Assets</TabsTrigger>
            <TabsTrigger value="studio">Script Studio</TabsTrigger>
            <TabsTrigger value="saleability">Saleability evidence</TabsTrigger>
            <TabsTrigger value="warnings">Warnings ({warnings.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="production" className="space-y-3">
            {STATUSES.map((s) => (
              <Card key={s}>
                <CardHeader className="py-3">
                  <CardTitle className="text-base flex items-center gap-2"><StatusBadge s={s} /><span className="text-muted-foreground text-xs">{grouped[s]?.length ?? 0}</span></CardTitle>
                </CardHeader>
                <CardContent>
                  {(grouped[s]?.length ?? 0) === 0 ? (
                    <div className="text-xs text-muted-foreground">No assets.</div>
                  ) : (
                    <div className="space-y-1">
                      {grouped[s].map((a) => (
                        <div key={a.id} className="flex items-center justify-between text-sm border-b border-border/40 py-1">
                          <div>
                            <span className="font-medium">{a.asset_title}</span>
                            <span className="text-xs text-muted-foreground ml-2">{a.business_name_snapshot ?? "(no business)"} · {a.audience_type}</span>
                          </div>
                          <Button size="sm" variant="ghost" onClick={() => setSelectedAssetId(a.id)}>Open</Button>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="assets">
            <Card>
              <CardContent className="p-0">
                {loading ? (
                  <div className="p-6 text-sm text-muted-foreground">Loading…</div>
                ) : assets.length === 0 ? (
                  <div className="p-8 text-center text-sm text-muted-foreground">
                    No video SOP assets yet. Create one to capture a manual/SOP and start the production pipeline.
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Title</TableHead>
                        <TableHead>Business</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Audience</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Visibility</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {assets.map((a) => {
                        const assetScripts = scripts.filter((s) => s.asset_id === a.id);
                        const assetLinks = links.filter((l) => l.asset_id === a.id);
                        const assetAssign = assignments.filter((t) => t.asset_id === a.id);
                        return (
                          <TableRow key={a.id}>
                            <TableCell className="font-medium">
                              {a.asset_title}
                              <div className="text-xs text-muted-foreground">
                                {assetScripts.length} script{assetScripts.length !== 1 ? "s" : ""} · {assetLinks.length} link{assetLinks.length !== 1 ? "s" : ""} · {assetAssign.length} assigned
                              </div>
                            </TableCell>
                            <TableCell className="text-xs">
                              {a.business_name_snapshot ?? <span className="text-destructive">none</span>}
                            </TableCell>
                            <TableCell className="text-xs">{a.asset_type}</TableCell>
                            <TableCell className="text-xs">{a.audience_type}</TableCell>
                            <TableCell><StatusBadge s={a.status} /></TableCell>
                            <TableCell className="text-xs">{a.external_visibility}</TableCell>
                            <TableCell>
                              <div className="flex flex-wrap gap-1">
                                <Button size="sm" variant="outline" onClick={() => generateScript(a)} title="Generate structured draft script">
                                  <Sparkles size={14} /> Script
                                </Button>
                                <Button size="sm" variant="outline" onClick={() => { setSelectedAssetId(a.id); setLinkOpen(true); }}>
                                  <LinkIcon size={14} /> Link
                                </Button>
                                <Button size="sm" variant="outline" onClick={() => { setSelectedAssetId(a.id); setAssignOpen(true); }}>
                                  <UserPlus size={14} /> Assign
                                </Button>
                                <Select value={a.status} onValueChange={(v) => updateAssetStatus(a, v)}>
                                  <SelectTrigger className="h-8 w-[150px] text-xs"><SelectValue /></SelectTrigger>
                                  <SelectContent>{STATUSES.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                                </Select>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="studio">
            <ScriptStudio assets={assets} />
          </TabsContent>

          <TabsContent value="saleability">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2"><CheckCircle2 size={16} /> Saleability / handover evidence per business</CardTitle>
                <CardDescription>Each business should have approved videos for the core handover categories.</CardDescription>
              </CardHeader>
              <CardContent>
                {saleabilityByBusiness.length === 0 ? (
                  <div className="text-sm text-muted-foreground">No business-labelled assets yet.</div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Business</TableHead>
                        <TableHead>Approved</TableHead>
                        <TableHead>Missing</TableHead>
                        <TableHead>Total assets</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {saleabilityByBusiness.map((b) => (
                        <TableRow key={b.business_id}>
                          <TableCell className="font-medium">{b.name}</TableCell>
                          <TableCell className="text-xs">
                            {[...b.have].map((h) => <Badge key={h} variant="outline" className="mr-1 bg-emerald-500/10 text-emerald-400">{h}</Badge>)}
                          </TableCell>
                          <TableCell className="text-xs">
                            {b.missing.length === 0
                              ? <Badge className="bg-emerald-500/15 text-emerald-400">Complete</Badge>
                              : b.missing.map((m) => <Badge key={m} variant="outline" className="mr-1 bg-amber-500/10 text-amber-400">no {m}</Badge>)}
                          </TableCell>
                          <TableCell>{b.total}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="warnings">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2"><ShieldAlert size={16} className="text-amber-400" /> Safety & privacy warnings</CardTitle>
              </CardHeader>
              <CardContent>
                {warnings.length === 0 ? (
                  <div className="text-sm text-muted-foreground">No warnings. All assets look safe.</div>
                ) : (
                  <div className="space-y-2">
                    {warnings.map(({ asset, reasons }) => (
                      <div key={asset.id} className="border border-amber-500/30 rounded-md p-3 text-sm">
                        <div className="font-medium flex items-center gap-2"><AlertTriangle size={14} className="text-amber-400" />{asset.asset_title}</div>
                        <div className="text-xs text-muted-foreground">{asset.business_name_snapshot ?? "(no business)"} · {asset.status}</div>
                        <ul className="list-disc ml-5 mt-1 text-xs">
                          {reasons.map((r) => <li key={r}>{r}</li>)}
                        </ul>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Add link dialog */}
        <Dialog open={linkOpen} onOpenChange={setLinkOpen}>
          <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Capture video link</DialogTitle></DialogHeader>
            <div className="grid gap-3">
              <div>
                <Label>External tool</Label>
                <Select value={linkForm.external_tool} onValueChange={(v) => setLinkForm({ ...linkForm, external_tool: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{EXTERNAL_TOOLS.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Video URL</Label><Input value={linkForm.video_url} onChange={(e) => setLinkForm({ ...linkForm, video_url: e.target.value })} maxLength={500} /></div>
              <div><Label>Embed URL</Label><Input value={linkForm.embed_url} onChange={(e) => setLinkForm({ ...linkForm, embed_url: e.target.value })} maxLength={500} /></div>
              <div><Label>Transcript URL</Label><Input value={linkForm.transcript_url} onChange={(e) => setLinkForm({ ...linkForm, transcript_url: e.target.value })} maxLength={500} /></div>
              <div><Label>Thumbnail URL</Label><Input value={linkForm.thumbnail_url} onChange={(e) => setLinkForm({ ...linkForm, thumbnail_url: e.target.value })} maxLength={500} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Duration (sec)</Label><Input type="number" value={linkForm.duration_seconds} onChange={(e) => setLinkForm({ ...linkForm, duration_seconds: e.target.value })} /></div>
                <div>
                  <Label>Privacy</Label>
                  <Select value={linkForm.privacy_status} onValueChange={(v) => setLinkForm({ ...linkForm, privacy_status: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{PRIVACY.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div><Label>Access notes</Label><Textarea rows={2} value={linkForm.access_notes} onChange={(e) => setLinkForm({ ...linkForm, access_notes: e.target.value })} maxLength={1000} /></div>
              <div className="flex flex-col gap-1">
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={linkForm.approved_for_customer_use} onChange={(e) => setLinkForm({ ...linkForm, approved_for_customer_use: e.target.checked })} /> Approved for customer use</label>
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={linkForm.approved_for_saleability_pack} onChange={(e) => setLinkForm({ ...linkForm, approved_for_saleability_pack: e.target.checked })} /> Approved for saleability pack</label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setLinkOpen(false)}>Cancel</Button>
              <Button onClick={addLink}>Save link</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Assign dialog */}
        <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>Assign training</DialogTitle></DialogHeader>
            <div className="grid gap-3">
              <div>
                <Label>Assigned to type</Label>
                <Select value={assignForm.assigned_to_type} onValueChange={(v) => setAssignForm({ ...assignForm, assigned_to_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{ASSIGN_TYPES.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Name</Label><Input value={assignForm.assigned_to_name} onChange={(e) => setAssignForm({ ...assignForm, assigned_to_name: e.target.value })} maxLength={200} /></div>
              <div><Label>Email</Label><Input type="email" value={assignForm.assigned_to_email} onChange={(e) => setAssignForm({ ...assignForm, assigned_to_email: e.target.value })} maxLength={255} /></div>
              <div>
                <Label>Completion status</Label>
                <Select value={assignForm.completion_status} onValueChange={(v) => setAssignForm({ ...assignForm, completion_status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{["not_started","in_progress","completed","waived"].map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Evidence notes</Label><Textarea rows={2} value={assignForm.evidence_notes} onChange={(e) => setAssignForm({ ...assignForm, evidence_notes: e.target.value })} maxLength={1000} /></div>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={assignForm.completion_required} onChange={(e) => setAssignForm({ ...assignForm, completion_required: e.target.checked })} /> Completion required</label>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setAssignOpen(false)}>Cancel</Button>
              <Button onClick={addAssignment}>Create assignment</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </FounderLayout>
  );
}