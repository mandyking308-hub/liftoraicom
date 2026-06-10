import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import { Sparkles, FileText, Copy, ShieldAlert, AlertTriangle, CheckCircle2, Archive, RotateCcw, Download } from "lucide-react";

type Asset = any;
type Script = any;

const SECTION_FIELDS: { key: string; label: string }[] = [
  { key: "voiceover_script", label: "Voiceover script" },
  { key: "scene_outline", label: "Scene outline" },
  { key: "screen_recording_steps", label: "Screen recording checklist" },
  { key: "customer_friendly_version", label: "Customer-friendly version" },
  { key: "operator_version", label: "Operator / internal version" },
  { key: "buyer_handover_version", label: "Buyer / handover version" },
  { key: "on_screen_text", label: "On-screen text" },
  { key: "callouts", label: "Callouts" },
  { key: "warnings", label: "Warnings" },
  { key: "founder_notes", label: "Founder notes" },
];

function StatusBadge({ s }: { s: string }) {
  const map: Record<string, string> = {
    draft: "bg-muted text-foreground",
    needs_review: "bg-orange-500/15 text-orange-400",
    approved: "bg-emerald-500/15 text-emerald-400",
    archived: "bg-muted-foreground/20 text-muted-foreground",
  };
  return <Badge variant="outline" className={map[s] ?? ""}>{(s ?? "draft").replace(/_/g, " ")}</Badge>;
}

async function copyText(text: string, label: string) {
  try { await navigator.clipboard.writeText(text ?? ""); toast({ title: `${label} copied` }); }
  catch { toast({ title: "Copy failed", variant: "destructive" }); }
}

function downloadText(filename: string, text: string) {
  const blob = new Blob([text ?? ""], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

function quizToText(quiz: any[]): string {
  if (!Array.isArray(quiz) || !quiz.length) return "";
  return quiz.map((q, i) => {
    const opts = (q.options ?? []).map((o: string, j: number) => `  ${String.fromCharCode(65 + j)}. ${o}`).join("\n");
    const ans = typeof q.answer_index === "number" ? String.fromCharCode(65 + q.answer_index) : "?";
    return `Q${i + 1}. ${q.q}\n${opts}\nAnswer: ${ans}`;
  }).join("\n\n");
}

export default function ScriptStudio({ assets }: { assets: Asset[] }) {
  const { user } = useAuth();
  const [scripts, setScripts] = useState<Script[]>([]);
  const [selectedAssetId, setSelectedAssetId] = useState<string>("");
  const [selectedScriptId, setSelectedScriptId] = useState<string | null>(null);
  const [edit, setEdit] = useState<Record<string, any>>({});
  const [busy, setBusy] = useState(false);
  const [checklist, setChecklist] = useState<Record<string, boolean>>({});

  const loadScripts = async (assetId: string) => {
    const { data } = await supabase
      .from("video_sop_scripts" as any)
      .select("*")
      .eq("asset_id", assetId)
      .order("version_number", { ascending: false });
    const list = (data as any[]) ?? [];
    setScripts(list);
    const newest = list[0];
    setSelectedScriptId(newest?.id ?? null);
    setEdit(newest ? { ...newest } : {});
    setChecklist({});
  };

  useEffect(() => { if (selectedAssetId) loadScripts(selectedAssetId); else { setScripts([]); setSelectedScriptId(null); setEdit({}); } }, [selectedAssetId]);

  const asset = useMemo(() => assets.find((a) => a.id === selectedAssetId), [assets, selectedAssetId]);
  const current = useMemo(() => scripts.find((s) => s.id === selectedScriptId) ?? null, [scripts, selectedScriptId]);

  const generate = async (mode: "ai" | "template") => {
    if (!selectedAssetId) return;
    setBusy(true);
    const { data, error } = await supabase.functions.invoke("video-sop-generate-script", {
      body: { asset_id: selectedAssetId, mode },
    });
    setBusy(false);
    if (error) { toast({ title: "Generation failed", description: error.message, variant: "destructive" }); return; }
    const d = data as any;
    if (d?.error) { toast({ title: "Generation failed", description: d.error, variant: "destructive" }); return; }
    toast({
      title: d?.ai_used ? "AI script generated" : (mode === "ai" ? "Fell back to template" : "Template generated"),
      description: d?.ai_error ? `AI fallback: ${d.ai_error}` : `Version v${d?.version}. Previous versions preserved.`,
    });
    loadScripts(selectedAssetId);
  };

  const saveDraft = async () => {
    if (!current) return;
    const patch: any = {};
    for (const f of SECTION_FIELDS) patch[f.key] = edit[f.key] ?? null;
    patch.script_title = edit.script_title ?? null;
    patch.short_description = edit.short_description ?? null;
    patch.target_audience = edit.target_audience ?? null;
    patch.learning_objective = edit.learning_objective ?? null;
    patch.recommended_video_length = edit.recommended_video_length ?? null;
    patch.difficulty_level = edit.difficulty_level ?? "standard";
    patch.use_case = edit.use_case ?? null;
    patch.status = "needs_review";
    const { error } = await supabase.from("video_sop_scripts" as any).update(patch).eq("id", current.id);
    if (error) { toast({ title: "Save failed", description: error.message, variant: "destructive" }); return; }
    await supabase.from("video_sop_audit_events" as any).insert({
      asset_id: current.asset_id, business_id: current.business_id,
      event_type: "script_updated", event_summary: `Script v${current.version_number} saved for review`,
      actor_user_id: user?.id ?? null, actor_role: "founder",
      metadata_json: { script_id: current.id },
    } as any);
    toast({ title: "Draft saved (status: needs_review)" });
    loadScripts(selectedAssetId);
  };

  const allChecked = useMemo(() => {
    if (!current || !asset) return false;
    const required = [
      "business_id", "source_present", "no_sensitive_real_data",
      "customer_facing_reviewed", "operator_escalation_present",
      "founder_approval_points", "saleability_reviewed", "privacy_status_reviewed",
      "founder_approves",
    ];
    return required.every((k) => checklist[k]);
  }, [checklist, current, asset]);

  const approve = async () => {
    if (!current) return;
    const { error } = await supabase.from("video_sop_scripts" as any).update({
      status: "approved",
      approved_by: user?.id ?? null,
      approved_at: new Date().toISOString(),
    }).eq("id", current.id);
    if (error) { toast({ title: "Approve failed", description: error.message, variant: "destructive" }); return; }
    await supabase.from("video_sop_audit_events" as any).insert({
      asset_id: current.asset_id, business_id: current.business_id,
      event_type: "script_approved",
      event_summary: `Script v${current.version_number} approved`,
      actor_user_id: user?.id ?? null, actor_role: "founder",
      metadata_json: { script_id: current.id, checklist },
    } as any);
    toast({ title: "Script approved" });
    loadScripts(selectedAssetId);
  };

  const archive = async () => {
    if (!current) return;
    await supabase.from("video_sop_scripts" as any).update({ status: "archived" }).eq("id", current.id);
    await supabase.from("video_sop_audit_events" as any).insert({
      asset_id: current.asset_id, business_id: current.business_id,
      event_type: "script_archived", event_summary: `Script v${current.version_number} archived`,
      actor_user_id: user?.id ?? null, actor_role: "founder",
      metadata_json: { script_id: current.id },
    } as any);
    toast({ title: "Archived" });
    loadScripts(selectedAssetId);
  };

  const assetWarnings: string[] = [];
  if (asset) {
    if (!asset.business_id) assetWarnings.push("Asset has no business_id");
    if (!asset.source_text || !asset.source_text.trim()) assetWarnings.push("Asset has no source text");
    if (asset.external_visibility === "customer_visible" && asset.status !== "approved" && asset.status !== "published_internal")
      assetWarnings.push("Asset is customer-visible but not approved");
  }
  const privacy = (current?.privacy_flags as any) ?? {};
  const hasSensitive = !!privacy?.has_sensitive;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2"><Sparkles size={16} className="text-primary" /> Script Studio</CardTitle>
        <CardDescription>
          Generate complete video-ready production material from each asset's source text.
          Uses the approved Liftor AI Gateway when available, otherwise falls back to a structured template.
          Previous approved scripts are preserved as versions.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-[280px] flex-1">
            <Label>Asset</Label>
            <Select value={selectedAssetId} onValueChange={setSelectedAssetId}>
              <SelectTrigger><SelectValue placeholder="Select a video SOP asset" /></SelectTrigger>
              <SelectContent>
                {assets.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.asset_title} — {a.business_name_snapshot ?? "(no business)"} · {a.audience_type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button disabled={!selectedAssetId || busy} onClick={() => generate("ai")}>
            <Sparkles size={14} /> {busy ? "Generating…" : "Generate with AI"}
          </Button>
          <Button variant="outline" disabled={!selectedAssetId || busy} onClick={() => generate("template")}>
            <FileText size={14} /> Template only
          </Button>
          <Button
            variant="outline"
            disabled={!selectedAssetId || busy}
            onClick={() => {
              if (!confirm("Regenerate from source? Previous approved scripts are preserved as earlier versions.")) return;
              generate("ai");
            }}
          >
            <RotateCcw size={14} /> Regenerate from source
          </Button>
        </div>

        {!asset ? (
          <div className="text-sm text-muted-foreground p-6 text-center border border-dashed rounded-md">
            Select an asset to begin.
          </div>
        ) : (
          <>
            {(assetWarnings.length > 0 || hasSensitive) && (
              <div className="border border-amber-500/30 bg-amber-500/5 rounded-md p-3 text-sm space-y-1">
                <div className="flex items-center gap-2 font-medium text-amber-400"><ShieldAlert size={14} /> Warnings</div>
                {assetWarnings.map((w) => (
                  <div key={w} className="text-xs flex items-center gap-2"><AlertTriangle size={12} /> {w}</div>
                ))}
                {hasSensitive && (
                  <div className="text-xs flex items-center gap-2 text-amber-300">
                    <AlertTriangle size={12} /> Source text may contain sensitive data ({(privacy.flags ?? []).join(", ")}). Use demo data when recording.
                  </div>
                )}
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card>
                <CardHeader className="py-3"><CardTitle className="text-sm">Source</CardTitle></CardHeader>
                <CardContent className="space-y-2 text-xs">
                  <div><span className="text-muted-foreground">Business:</span> {asset.business_name_snapshot ?? <span className="text-destructive">none</span>}</div>
                  <div><span className="text-muted-foreground">Asset:</span> {asset.asset_title} · {asset.asset_type} · {asset.audience_type}</div>
                  <div><span className="text-muted-foreground">Source type:</span> {asset.source_type}</div>
                  <Textarea readOnly value={asset.source_text ?? ""} rows={18} className="font-mono text-xs" />
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="py-3 flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-sm flex items-center gap-2">
                      Script {current ? `v${current.version_number}` : ""} {current && <StatusBadge s={current.status} />}
                      {current?.generated_by_ai && <Badge variant="outline" className="text-xs">AI</Badge>}
                      {current && current.generated_by_ai === false && <Badge variant="outline" className="text-xs">Template</Badge>}
                    </CardTitle>
                    <CardDescription className="text-xs">
                      {scripts.length} version{scripts.length !== 1 ? "s" : ""} on record. Select to view another.
                    </CardDescription>
                  </div>
                  {scripts.length > 1 && (
                    <Select value={selectedScriptId ?? ""} onValueChange={(v) => { setSelectedScriptId(v); const s = scripts.find((x) => x.id === v); setEdit(s ? { ...s } : {}); }}>
                      <SelectTrigger className="w-[160px] h-8"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {scripts.map((s) => <SelectItem key={s.id} value={s.id}>v{s.version_number} — {s.status}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  )}
                </CardHeader>
                <CardContent>
                  {!current ? (
                    <div className="text-xs text-muted-foreground p-4 text-center border border-dashed rounded-md">
                      No script yet. Click "Generate with AI" or "Template only" to create v1.
                    </div>
                  ) : (
                    <Tabs defaultValue="summary">
                      <TabsList className="flex-wrap h-auto">
                        <TabsTrigger value="summary">Summary</TabsTrigger>
                        <TabsTrigger value="voiceover">Voiceover</TabsTrigger>
                        <TabsTrigger value="scenes">Scenes</TabsTrigger>
                        <TabsTrigger value="recording">Recording</TabsTrigger>
                        <TabsTrigger value="customer">Customer</TabsTrigger>
                        <TabsTrigger value="operator">Operator</TabsTrigger>
                        <TabsTrigger value="buyer">Buyer</TabsTrigger>
                        <TabsTrigger value="quiz">Quiz</TabsTrigger>
                        <TabsTrigger value="approve">Approve</TabsTrigger>
                      </TabsList>

                      <TabsContent value="summary" className="space-y-2">
                        <div className="grid grid-cols-2 gap-2">
                          <div><Label className="text-xs">Title</Label><Input value={edit.script_title ?? ""} onChange={(e) => setEdit({ ...edit, script_title: e.target.value })} /></div>
                          <div><Label className="text-xs">Recommended length</Label><Input value={edit.recommended_video_length ?? ""} onChange={(e) => setEdit({ ...edit, recommended_video_length: e.target.value })} /></div>
                          <div><Label className="text-xs">Target audience</Label><Input value={edit.target_audience ?? ""} onChange={(e) => setEdit({ ...edit, target_audience: e.target.value })} /></div>
                          <div>
                            <Label className="text-xs">Difficulty</Label>
                            <Select value={edit.difficulty_level ?? "standard"} onValueChange={(v) => setEdit({ ...edit, difficulty_level: v })}>
                              <SelectTrigger><SelectValue /></SelectTrigger>
                              <SelectContent>{["beginner","standard","advanced"].map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                            </Select>
                          </div>
                          <div className="col-span-2"><Label className="text-xs">Use case</Label><Input value={edit.use_case ?? ""} onChange={(e) => setEdit({ ...edit, use_case: e.target.value })} /></div>
                          <div className="col-span-2"><Label className="text-xs">Short description</Label><Textarea rows={2} value={edit.short_description ?? ""} onChange={(e) => setEdit({ ...edit, short_description: e.target.value })} /></div>
                          <div className="col-span-2"><Label className="text-xs">Learning objective</Label><Textarea rows={2} value={edit.learning_objective ?? ""} onChange={(e) => setEdit({ ...edit, learning_objective: e.target.value })} /></div>
                        </div>
                      </TabsContent>

                      {SECTION_FIELDS.filter((f) => ["voiceover_script"].includes(f.key)).map((f) => (
                        <TabsContent key={f.key} value="voiceover" className="space-y-2">
                          <div className="flex justify-end gap-2">
                            <Button size="sm" variant="ghost" onClick={() => copyText(edit[f.key] ?? "", f.label)}><Copy size={12} /> Copy</Button>
                            <Button size="sm" variant="ghost" onClick={() => downloadText(`${asset.asset_title}-${f.key}-v${current.version_number}.txt`, edit[f.key] ?? "")}><Download size={12} /> Export</Button>
                          </div>
                          <Textarea rows={16} value={edit[f.key] ?? ""} onChange={(e) => setEdit({ ...edit, [f.key]: e.target.value })} className="font-mono text-xs" />
                        </TabsContent>
                      ))}

                      <TabsContent value="scenes" className="space-y-2">
                        <div className="flex justify-end gap-2">
                          <Button size="sm" variant="ghost" onClick={() => copyText(edit.scene_outline ?? "", "Scene outline")}><Copy size={12} /> Copy</Button>
                          <Button size="sm" variant="ghost" onClick={() => downloadText(`${asset.asset_title}-scenes-v${current.version_number}.txt`, edit.scene_outline ?? "")}><Download size={12} /> Export</Button>
                        </div>
                        <Textarea rows={8} value={edit.scene_outline ?? ""} onChange={(e) => setEdit({ ...edit, scene_outline: e.target.value })} className="font-mono text-xs" />
                        {Array.isArray(current.scenes_json) && current.scenes_json.length > 0 && (
                          <div className="border rounded-md p-2 max-h-72 overflow-auto text-xs space-y-1">
                            {current.scenes_json.map((s: any) => (
                              <div key={s.scene_number} className="border-b border-border/40 pb-1">
                                <div className="font-medium">Scene {s.scene_number}. {s.scene_title} <span className="text-muted-foreground">({s.estimated_duration_seconds}s)</span></div>
                                <div><span className="text-muted-foreground">Sees:</span> {s.viewer_sees}</div>
                                <div><span className="text-muted-foreground">Says:</span> {s.narrator_says}</div>
                                <div><span className="text-muted-foreground">On-screen:</span> {s.on_screen_text}</div>
                                <div><span className="text-muted-foreground">Action:</span> {s.screen_action}</div>
                              </div>
                            ))}
                          </div>
                        )}
                      </TabsContent>

                      <TabsContent value="recording" className="space-y-2">
                        <div className="flex justify-end gap-2">
                          <Button size="sm" variant="ghost" onClick={() => copyText(edit.screen_recording_steps ?? "", "Recording checklist")}><Copy size={12} /> Copy</Button>
                          <Button size="sm" variant="ghost" onClick={() => downloadText(`${asset.asset_title}-recording-v${current.version_number}.txt`, edit.screen_recording_steps ?? "")}><Download size={12} /> Export</Button>
                        </div>
                        <Textarea rows={8} value={edit.screen_recording_steps ?? ""} onChange={(e) => setEdit({ ...edit, screen_recording_steps: e.target.value })} className="font-mono text-xs" />
                        {Array.isArray(current.screen_recording_checklist_json) && current.screen_recording_checklist_json.length > 0 && (
                          <div className="border rounded-md p-2 max-h-72 overflow-auto text-xs space-y-1">
                            {current.screen_recording_checklist_json.map((c: any) => (
                              <div key={c.step} className="border-b border-border/40 pb-1">
                                <div className="font-medium">Step {c.step}: {c.action}</div>
                                <div><span className="text-muted-foreground">Avoid:</span> {c.avoid}</div>
                                <div className="text-amber-400"><span className="text-muted-foreground">Privacy:</span> {c.privacy_warning}</div>
                              </div>
                            ))}
                          </div>
                        )}
                      </TabsContent>

                      <TabsContent value="customer" className="space-y-2">
                        <div className="flex justify-end gap-2">
                          <Button size="sm" variant="ghost" onClick={() => copyText(edit.customer_friendly_version ?? "", "Customer version")}><Copy size={12} /> Copy</Button>
                          <Button size="sm" variant="ghost" onClick={() => downloadText(`${asset.asset_title}-customer-v${current.version_number}.txt`, edit.customer_friendly_version ?? "")}><Download size={12} /> Export</Button>
                        </div>
                        <Textarea rows={12} value={edit.customer_friendly_version ?? ""} onChange={(e) => setEdit({ ...edit, customer_friendly_version: e.target.value })} className="font-mono text-xs" />
                      </TabsContent>

                      <TabsContent value="operator" className="space-y-2">
                        <div className="flex justify-end gap-2">
                          <Button size="sm" variant="ghost" onClick={() => copyText(edit.operator_version ?? "", "Operator version")}><Copy size={12} /> Copy</Button>
                          <Button size="sm" variant="ghost" onClick={() => downloadText(`${asset.asset_title}-operator-v${current.version_number}.txt`, edit.operator_version ?? "")}><Download size={12} /> Export</Button>
                        </div>
                        <Textarea rows={12} value={edit.operator_version ?? ""} onChange={(e) => setEdit({ ...edit, operator_version: e.target.value })} className="font-mono text-xs" />
                      </TabsContent>

                      <TabsContent value="buyer" className="space-y-2">
                        <div className="flex justify-end gap-2">
                          <Button size="sm" variant="ghost" onClick={() => copyText(edit.buyer_handover_version ?? "", "Buyer handover")}><Copy size={12} /> Copy</Button>
                          <Button size="sm" variant="ghost" onClick={() => downloadText(`${asset.asset_title}-buyer-v${current.version_number}.txt`, edit.buyer_handover_version ?? "")}><Download size={12} /> Export</Button>
                        </div>
                        <Textarea rows={12} value={edit.buyer_handover_version ?? ""} onChange={(e) => setEdit({ ...edit, buyer_handover_version: e.target.value })} className="font-mono text-xs" />
                      </TabsContent>

                      <TabsContent value="quiz" className="space-y-2">
                        <div className="flex justify-end gap-2">
                          <Button size="sm" variant="ghost" onClick={() => copyText(quizToText(current.quiz_json ?? []), "Quiz")}><Copy size={12} /> Copy</Button>
                          <Button size="sm" variant="ghost" onClick={() => downloadText(`${asset.asset_title}-quiz-v${current.version_number}.txt`, quizToText(current.quiz_json ?? []))}><Download size={12} /> Export</Button>
                        </div>
                        {(!current.quiz_json || current.quiz_json.length === 0) ? (
                          <div className="text-xs text-muted-foreground">No quiz generated.</div>
                        ) : (
                          <div className="space-y-2 text-xs">
                            {current.quiz_json.map((q: any, i: number) => (
                              <div key={i} className="border rounded-md p-2">
                                <div className="font-medium">Q{i + 1}. {q.q}</div>
                                <ul className="ml-4 list-disc">
                                  {(q.options ?? []).map((o: string, j: number) => (
                                    <li key={j} className={j === q.answer_index ? "text-emerald-400" : ""}>
                                      {String.fromCharCode(65 + j)}. {o} {j === q.answer_index && "✓"}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            ))}
                            <div className="text-muted-foreground">Suggested pass threshold: 80%.</div>
                          </div>
                        )}
                      </TabsContent>

                      <TabsContent value="approve" className="space-y-2 text-sm">
                        <div className="text-xs text-muted-foreground">Approval checklist — founder/admin only.</div>
                        {[
                          { k: "business_id", l: `business_id present`, auto: !!asset.business_id },
                          { k: "source_present", l: "Source text or source reference present", auto: !!(asset.source_text || asset.source_reference_id) },
                          { k: "no_sensitive_real_data", l: "No sensitive real customer data exposed (PII)", warn: hasSensitive },
                          { k: "customer_facing_reviewed", l: "Customer-facing version reviewed (if applicable)" },
                          { k: "operator_escalation_present", l: "Operator escalation points included" },
                          { k: "founder_approval_points", l: "Founder approval points included" },
                          { k: "saleability_reviewed", l: `Saleability evidence flag reviewed (${asset.saleability_evidence ? "true" : "false"})` },
                          { k: "privacy_status_reviewed", l: "Privacy status reviewed (no public exposure)" },
                          { k: "founder_approves", l: "Founder/admin approves this script" },
                        ].map((c) => (
                          <label key={c.k} className="flex items-start gap-2 text-xs">
                            <input type="checkbox" className="mt-0.5"
                              checked={!!checklist[c.k] || c.auto === true}
                              disabled={c.auto === true}
                              onChange={(e) => setChecklist({ ...checklist, [c.k]: e.target.checked })} />
                            <span>
                              {c.l}
                              {c.auto === true && <Badge variant="outline" className="ml-2 bg-emerald-500/10 text-emerald-400">auto</Badge>}
                              {c.auto === false && <Badge variant="outline" className="ml-2 bg-destructive/10 text-destructive">missing</Badge>}
                              {c.warn && <Badge variant="outline" className="ml-2 bg-amber-500/10 text-amber-400">review</Badge>}
                            </span>
                          </label>
                        ))}
                        <div className="flex gap-2 pt-2">
                          <Button onClick={approve} disabled={!allChecked || current.status === "approved"}>
                            <CheckCircle2 size={14} /> Approve
                          </Button>
                          <Button variant="outline" onClick={archive} disabled={current.status === "archived"}>
                            <Archive size={14} /> Archive
                          </Button>
                        </div>
                        {current.status === "approved" && (
                          <div className="text-xs text-emerald-400">Approved v{current.version_number}. Future regenerations will create a new version and preserve this one.</div>
                        )}
                      </TabsContent>
                    </Tabs>
                  )}
                </CardContent>
              </Card>
            </div>

            {current && (
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={saveDraft}>Save edits → needs review</Button>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}