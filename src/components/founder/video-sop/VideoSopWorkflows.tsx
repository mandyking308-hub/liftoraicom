import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { Clapperboard, ClipboardCopy, Download, ShieldCheck, GraduationCap, FileText, AlertTriangle } from "lucide-react";

type Any = any;

export const RECORDING_STATUSES = [
  "not_started","ready_to_record","recording_in_progress","recorded","needs_editing","needs_review","approved","archived",
];
export const RECORDER_TYPES = ["founder","operator","va","external_video_tool","other"];
export const RECORDING_METHODS = ["loom","guidde","panopto","synthesia","heygen","vimeo","manual_upload","other"];
export const LINK_REVIEW_STATUSES = [
  "link_added","privacy_checked","needs_review","approved_internal","approved_customer","approved_buyer_handover","rejected","archived",
];
export const ASSIGNMENT_STATUSES = ["not_started","in_progress","completed","waived","needs_rewatch"];

const REQUIRED_CATEGORIES = [
  { key: "founder_training", label: "Founder handover" },
  { key: "operator_training", label: "Operator onboarding" },
  { key: "customer_onboarding_video", label: "Customer onboarding" },
  { key: "support_video", label: "Support / process" },
  { key: "sales_training", label: "Sales / process" },
  { key: "compliance_training", label: "Compliance / privacy" },
  { key: "buyer_handover", label: "Buyer handover" },
] as const;

function downloadFile(name: string, content: string, type = "text/plain") {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = name; a.click();
  URL.revokeObjectURL(url);
}

function csvEscape(v: any) {
  const s = v == null ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export type WorkflowsProps = {
  assets: Any[];
  scripts: Any[];
  links: Any[];
  assignments: Any[];
  businesses: { id: string; name?: string | null }[];
  reload: () => Promise<void> | void;
  audit: (asset_id: string | null, business_id: string | null, event_type: string, summary: string, meta?: any) => Promise<void>;
};

// =================== Recording Queue ===================
export function RecordingQueuePanel({ assets, scripts, reload, audit }: WorkflowsProps) {
  const [briefAsset, setBriefAsset] = useState<Any | null>(null);

  const queue = useMemo(() => assets.filter((a) => a.status !== "archived"), [assets]);

  const updateAsset = async (asset: Any, patch: Record<string, any>, label: string) => {
    const { error } = await supabase.from("video_sop_assets" as any).update(patch).eq("id", asset.id);
    if (error) { toast({ title: "Update failed", description: error.message, variant: "destructive" }); return; }
    await audit(asset.id, asset.business_id, "recording_update", `${label} (${asset.asset_title})`, patch);
    toast({ title: label });
    reload();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2"><Clapperboard size={16} /> Recording queue</CardTitle>
        <CardDescription>Founder/admin controls for the recording production pipeline. No external API calls — links are captured manually.</CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        {queue.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">No assets in the queue.</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Asset</TableHead>
                <TableHead>Business / audience</TableHead>
                <TableHead>Recorder</TableHead>
                <TableHead>Method</TableHead>
                <TableHead>Due</TableHead>
                <TableHead>Recording status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {queue.map((a) => {
                const approvedScript = scripts.find((s) => s.asset_id === a.id && s.approved_at);
                const privacyFlag = (approvedScript?.privacy_flags && Object.keys(approvedScript.privacy_flags).length > 0) || a.privacy_warning_notes;
                return (
                  <TableRow key={a.id}>
                    <TableCell className="text-sm">
                      <div className="font-medium">{a.asset_title}</div>
                      <div className="text-xs text-muted-foreground">{a.asset_type} · priority {a.priority}</div>
                      {privacyFlag && <Badge variant="outline" className="bg-amber-500/10 text-amber-400 mt-1">privacy flag</Badge>}
                      {a.demo_data_required && <Badge variant="outline" className="bg-blue-500/10 text-blue-400 mt-1 ml-1">demo data</Badge>}
                    </TableCell>
                    <TableCell className="text-xs">
                      {a.business_name_snapshot ?? <span className="text-destructive">none</span>}
                      <div className="text-muted-foreground">{a.audience_type}</div>
                    </TableCell>
                    <TableCell className="text-xs">
                      <Input className="h-8" placeholder="Name" defaultValue={a.assigned_recorder_name ?? ""}
                        onBlur={(e) => { if (e.target.value !== (a.assigned_recorder_name ?? "")) updateAsset(a, { assigned_recorder_name: e.target.value }, "Recorder set"); }} />
                      <Select value={a.assigned_recorder_type ?? ""} onValueChange={(v) => updateAsset(a, { assigned_recorder_type: v }, "Recorder type set")}>
                        <SelectTrigger className="h-8 mt-1 text-xs"><SelectValue placeholder="Type" /></SelectTrigger>
                        <SelectContent>{RECORDER_TYPES.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="text-xs">
                      <Select value={a.recording_method ?? ""} onValueChange={(v) => updateAsset(a, { recording_method: v }, "Method set")}>
                        <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Method" /></SelectTrigger>
                        <SelectContent>{RECORDING_METHODS.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="text-xs">
                      <Input type="date" className="h-8" defaultValue={a.recording_due_date ?? ""}
                        onBlur={(e) => { if (e.target.value !== (a.recording_due_date ?? "")) updateAsset(a, { recording_due_date: e.target.value || null }, "Due date set"); }} />
                    </TableCell>
                    <TableCell>
                      <Select value={a.recording_status ?? "not_started"} onValueChange={(v) => updateAsset(a, { recording_status: v }, `Recording → ${v}`)}>
                        <SelectTrigger className="h-8 w-[170px] text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>{RECORDING_STATUSES.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Button size="sm" variant="outline" onClick={() => setBriefAsset(a)}>
                        <FileText size={14} /> Brief
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
      <RecordingBriefDialog asset={briefAsset} script={briefAsset ? scripts.find((s) => s.asset_id === briefAsset.id && s.approved_at) ?? scripts.find((s) => s.asset_id === briefAsset.id) : null} onClose={() => setBriefAsset(null)} />
    </Card>
  );
}

// =================== Recording Brief Dialog ===================
function buildRecordingBrief(asset: Any, script: Any | null): string {
  const lines: string[] = [];
  const has = (s: any) => (typeof s === "string" && s.trim().length > 0);
  lines.push(`RECORDING BRIEF`);
  lines.push(`================`);
  lines.push(`Title: ${script?.script_title ?? asset.asset_title}`);
  lines.push(`Business: ${asset.business_name_snapshot ?? "(no business)"}`);
  lines.push(`Audience: ${asset.audience_type}`);
  lines.push(`Asset type: ${asset.asset_type}`);
  lines.push(`Recording method: ${asset.recording_method ?? "(not set)"}`);
  lines.push(`Estimated length: ${script?.recommended_video_length ?? script?.video_length_target ?? "3–6 minutes"}`);
  lines.push(`Script version: v${script?.version_number ?? "?"}${script?.approved_at ? " (approved)" : " (unapproved)"}`);
  lines.push("");
  if (has(script?.learning_objective)) { lines.push(`LEARNING OBJECTIVE`); lines.push(script.learning_objective); lines.push(""); }
  if (has(script?.screen_recording_steps)) { lines.push(`SCREEN-BY-SCREEN RECORDING CHECKLIST`); lines.push(script.screen_recording_steps); lines.push(""); }
  if (has(script?.scene_outline)) { lines.push(`SCENE OUTLINE`); lines.push(script.scene_outline); lines.push(""); }
  if (has(script?.voiceover_script)) { lines.push(`VOICEOVER GUIDANCE`); lines.push(script.voiceover_script); lines.push(""); }
  if (has(script?.on_screen_text)) { lines.push(`ON-SCREEN TEXT`); lines.push(script.on_screen_text); lines.push(""); }
  if (has(script?.callouts)) { lines.push(`CALLOUTS`); lines.push(script.callouts); lines.push(""); }

  const privacyFlags = script?.privacy_flags && typeof script.privacy_flags === "object" ? Object.keys(script.privacy_flags) : [];
  const sensitive = privacyFlags.length > 0 || asset.demo_data_required || has(asset.privacy_warning_notes);
  lines.push(`WHAT NOT TO SHOW`);
  lines.push(`- Real customer, financial, access, password, health, legal or private information.`);
  lines.push(`- Real API keys, secrets, billing data or internal admin URLs.`);
  lines.push(`- Anything covered by NDA or unapproved branding.`);
  if (has(script?.warnings)) lines.push(`- ${script.warnings}`);
  if (has(asset.privacy_warning_notes)) lines.push(`- ${asset.privacy_warning_notes}`);
  lines.push("");
  lines.push(`DEMO DATA INSTRUCTIONS`);
  lines.push(sensitive
    ? `USE DEMO DATA ONLY. Do not show real customer, financial, access, password, health, legal or private information.`
    : `Prefer demo data where practical. Avoid showing identifiable customer information.`);
  if (privacyFlags.length) lines.push(`Privacy flags detected in source: ${privacyFlags.join(", ")}`);
  lines.push("");
  lines.push(`FINAL APPROVAL CHECKLIST`);
  lines.push(`[ ] business_id present and labelled`);
  lines.push(`[ ] Approved script version recorded matches video`);
  lines.push(`[ ] No sensitive data visible on screen`);
  lines.push(`[ ] Captions/transcript checked`);
  lines.push(`[ ] Privacy status set (private/unlisted/restricted)`);
  lines.push(`[ ] Founder/admin approval before customer or buyer handover use`);
  return lines.join("\n");
}

export function RecordingBriefDialog({ asset, script, onClose }: { asset: Any | null; script: Any | null; onClose: () => void }) {
  const text = useMemo(() => (asset ? buildRecordingBrief(asset, script) : ""), [asset, script]);
  return (
    <Dialog open={!!asset} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Recording brief — {asset?.asset_title}</DialogTitle></DialogHeader>
        <Textarea readOnly value={text} className="font-mono text-xs h-[60vh]" />
        <DialogFooter>
          <Button variant="outline" onClick={() => { navigator.clipboard.writeText(text); toast({ title: "Brief copied" }); }}>
            <ClipboardCopy size={14} /> Copy
          </Button>
          <Button onClick={() => downloadFile(`recording-brief-${asset?.id?.slice(0,8)}.txt`, text)}>
            <Download size={14} /> Download .txt
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// =================== Link Approvals ===================
export function LinkApprovalsPanel({ links, assets, scripts, reload, audit }: WorkflowsProps) {
  const { user } = useAuth();

  const updateLink = async (link: Any, patch: Record<string, any>, label: string) => {
    const { error } = await supabase.from("video_sop_links" as any).update(patch).eq("id", link.id);
    if (error) { toast({ title: "Update failed", description: error.message, variant: "destructive" }); return; }
    await audit(link.asset_id, link.business_id, "link_review", `${label}`, patch);
    toast({ title: label });
    reload();
  };

  const setStatus = async (link: Any, status: string) => {
    const patch: any = { review_status: status, reviewed_by: user?.id ?? null, reviewed_at: new Date().toISOString() };
    if (status === "privacy_checked") { patch.privacy_checked_by = user?.id ?? null; patch.privacy_checked_at = new Date().toISOString(); }
    if (status === "approved_customer") {
      if (!link.privacy_checked_at) { toast({ title: "Privacy check required first", variant: "destructive" }); return; }
      if (link.contains_sensitive_content && !link.sensitive_content_waived_at) {
        toast({ title: "Sensitive content not waived", description: "Mark waived or remove sensitive flag.", variant: "destructive" }); return;
      }
      patch.customer_visibility_approved_by = user?.id ?? null;
      patch.customer_visibility_approved_at = new Date().toISOString();
      patch.approved_for_customer_use = true;
    }
    if (status === "approved_buyer_handover") {
      const asset = assets.find((a) => a.id === link.asset_id);
      const approvedScript = scripts.find((s) => s.asset_id === link.asset_id && s.approved_at);
      if (!asset?.business_id || !asset?.id || !approvedScript) {
        toast({ title: "Buyer handover blocked", description: "Need business_id, asset_id and approved script.", variant: "destructive" }); return;
      }
      patch.buyer_handover_approved_by = user?.id ?? null;
      patch.buyer_handover_approved_at = new Date().toISOString();
      patch.approved_for_saleability_pack = true;
    }
    await updateLink(link, patch, `Link → ${status}`);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2"><ShieldCheck size={16} /> Video link approvals</CardTitle>
        <CardDescription>Customer-visible and buyer-handover approvals are founder/admin gated. Privacy must be checked first.</CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        {links.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">No video links captured.</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Asset</TableHead>
                <TableHead>Tool / privacy</TableHead>
                <TableHead>Flags</TableHead>
                <TableHead>Review status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {links.map((l) => {
                const asset = assets.find((a) => a.id === l.asset_id);
                const publicWarn = l.privacy_status === "public" || l.privacy_status === "unlisted";
                return (
                  <TableRow key={l.id}>
                    <TableCell className="text-sm">
                      <div className="font-medium">{asset?.asset_title ?? l.asset_id?.slice(0,8)}</div>
                      <div className="text-xs text-muted-foreground">{asset?.business_name_snapshot ?? "(no business)"}</div>
                      {l.video_url && <a className="text-xs text-primary underline break-all" href={l.video_url} target="_blank" rel="noreferrer">{l.video_url}</a>}
                    </TableCell>
                    <TableCell className="text-xs">
                      <div>{l.external_tool}</div>
                      <Badge variant="outline" className={publicWarn ? "bg-amber-500/10 text-amber-400" : "bg-muted"}>{l.privacy_status}</Badge>
                    </TableCell>
                    <TableCell className="text-xs space-y-1">
                      <label className="flex items-center gap-1"><input type="checkbox" checked={!!l.contains_sensitive_content} onChange={(e) => updateLink(l, { contains_sensitive_content: e.target.checked }, "Sensitive flag updated")} /> sensitive</label>
                      <label className="flex items-center gap-1"><input type="checkbox" checked={!!l.transcript_checked} onChange={(e) => updateLink(l, { transcript_checked: e.target.checked }, "Transcript checked")} /> transcript</label>
                      <label className="flex items-center gap-1"><input type="checkbox" checked={!!l.captions_available} onChange={(e) => updateLink(l, { captions_available: e.target.checked }, "Captions updated")} /> captions</label>
                      <label className="flex items-center gap-1"><input type="checkbox" checked={!!l.demo_data_used} onChange={(e) => updateLink(l, { demo_data_used: e.target.checked }, "Demo data flag updated")} /> demo data</label>
                      {l.contains_sensitive_content && !l.sensitive_content_waived_at && (
                        <Button size="sm" variant="outline" className="h-6 text-xs" onClick={() => updateLink(l, { sensitive_content_waived_by: user?.id ?? null, sensitive_content_waived_at: new Date().toISOString() }, "Sensitive waived")}>Waive (founder)</Button>
                      )}
                    </TableCell>
                    <TableCell>
                      <Select value={l.review_status ?? "link_added"} onValueChange={(v) => setStatus(l, v)}>
                        <SelectTrigger className="h-8 w-[200px] text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>{LINK_REVIEW_STATUSES.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                      </Select>
                      {l.review_status === "rejected" && (
                        <Input className="h-8 mt-1 text-xs" placeholder="Rejection reason" defaultValue={l.rejection_reason ?? ""}
                          onBlur={(e) => { if (e.target.value !== (l.rejection_reason ?? "")) updateLink(l, { rejection_reason: e.target.value }, "Rejection reason saved"); }} />
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {l.customer_visibility_approved_at && <div>Customer ✓</div>}
                      {l.buyer_handover_approved_at && <div>Buyer ✓</div>}
                      {l.privacy_checked_at && <div>Privacy ✓</div>}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

// =================== Assignments Evidence ===================
export function AssignmentsEvidencePanel({ assignments, assets, reload, audit }: WorkflowsProps) {
  const { user } = useAuth();

  const update = async (row: Any, patch: Record<string, any>, label: string) => {
    const { error } = await supabase.from("video_sop_training_assignments" as any).update(patch).eq("id", row.id);
    if (error) { toast({ title: "Update failed", description: error.message, variant: "destructive" }); return; }
    await audit(row.asset_id, row.business_id, "assignment_update", label, patch);
    toast({ title: label });
    reload();
  };

  const markCompleted = (row: Any) => update(row, {
    completion_status: "completed",
    completed_at: new Date().toISOString(),
    watched_confirmed: true,
  }, "Marked completed");

  const approveCompletion = (row: Any) => update(row, {
    approved_completion_by: user?.id ?? null,
    approved_completion_at: new Date().toISOString(),
  }, "Completion approved");

  const waive = (row: Any) => {
    const reason = window.prompt("Reason for waiving completion?");
    if (!reason) return;
    update(row, {
      completion_status: "waived",
      waiver_reason: reason,
      waived_by: user?.id ?? null,
      waived_at: new Date().toISOString(),
    }, "Completion waived");
  };

  const requestRewatch = (row: Any) => update(row, { completion_status: "needs_rewatch" }, "Rewatch requested");

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2"><GraduationCap size={16} /> Training completion evidence</CardTitle>
        <CardDescription>Founder/admin approval of completion evidence — no automatic emails or portal access creation.</CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        {assignments.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">No training assignments yet.</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Assignee</TableHead>
                <TableHead>Asset</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Evidence</TableHead>
                <TableHead>Approval</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {assignments.map((row) => {
                const asset = assets.find((a) => a.id === row.asset_id);
                return (
                  <TableRow key={row.id}>
                    <TableCell className="text-xs">
                      <div className="font-medium">{row.assigned_to_name || "(unnamed)"}</div>
                      <div className="text-muted-foreground">{row.assigned_to_type} · {row.assigned_to_email}</div>
                    </TableCell>
                    <TableCell className="text-xs">
                      <div>{asset?.asset_title ?? row.asset_id?.slice(0,8)}</div>
                      <div className="text-muted-foreground">{asset?.business_name_snapshot ?? "(no business)"}</div>
                    </TableCell>
                    <TableCell>
                      <Select value={row.completion_status ?? "not_started"} onValueChange={(v) => update(row, { completion_status: v }, `Status → ${v}`)}>
                        <SelectTrigger className="h-8 w-[150px] text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>{ASSIGNMENT_STATUSES.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="text-xs space-y-1">
                      <label className="flex items-center gap-1"><input type="checkbox" checked={!!row.watched_confirmed} onChange={(e) => update(row, { watched_confirmed: e.target.checked }, "Watched flag")} /> watched</label>
                      <label className="flex items-center gap-1"><input type="checkbox" checked={!!row.quiz_passed} onChange={(e) => update(row, { quiz_passed: e.target.checked }, "Quiz flag")} /> quiz passed</label>
                      <Input className="h-7 text-xs" placeholder="Evidence URL" defaultValue={row.evidence_url ?? ""}
                        onBlur={(e) => { if (e.target.value !== (row.evidence_url ?? "")) update(row, { evidence_url: e.target.value || null }, "Evidence URL saved"); }} />
                    </TableCell>
                    <TableCell className="text-xs">
                      {row.approved_completion_at
                        ? <Badge className="bg-emerald-500/15 text-emerald-400">Founder approved</Badge>
                        : row.waived_at
                          ? <Badge variant="outline" className="bg-amber-500/10 text-amber-400">Waived</Badge>
                          : <Badge variant="outline">Pending</Badge>}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        <Button size="sm" variant="outline" onClick={() => markCompleted(row)}>Complete</Button>
                        <Button size="sm" variant="outline" onClick={() => approveCompletion(row)} disabled={!!row.approved_completion_at}>Approve</Button>
                        <Button size="sm" variant="outline" onClick={() => requestRewatch(row)}>Rewatch</Button>
                        <Button size="sm" variant="outline" onClick={() => waive(row)}>Waive</Button>
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
  );
}

// =================== Training Matrix ===================
function categoryStatus(assets: Any[], scripts: Any[], links: Any[], assignments: Any[], businessId: string, categoryKey: string) {
  const catAssets = assets.filter((a) => a.business_id === businessId && a.asset_type === categoryKey);
  if (catAssets.length === 0) return { state: "missing", approvedVideos: 0, assigned: 0, completed: 0 };
  const approvedLinks = links.filter((l) => catAssets.some((a) => a.id === l.asset_id) && (l.review_status === "approved_internal" || l.review_status === "approved_customer" || l.review_status === "approved_buyer_handover"));
  const hasScript = catAssets.some((a) => scripts.some((s) => s.asset_id === a.id));
  const scriptApproved = catAssets.some((a) => scripts.some((s) => s.asset_id === a.id && s.approved_at));
  const recordingPending = catAssets.some((a) => ["ready_to_record","recording_in_progress","needs_editing","needs_review"].includes(a.recording_status ?? ""));
  const assigned = assignments.filter((t) => catAssets.some((a) => a.id === t.asset_id));
  const completed = assigned.filter((t) => t.completion_status === "completed" && t.approved_completion_at).length;
  let state = "draft";
  if (approvedLinks.length > 0 && assigned.length > 0 && completed > 0) state = "completion evidenced";
  else if (approvedLinks.length > 0 && assigned.length > 0) state = "training assigned";
  else if (approvedLinks.length > 0) state = "video approved";
  else if (recordingPending) state = "recording pending";
  else if (scriptApproved) state = "script approved";
  else if (hasScript) state = "draft";
  return { state, approvedVideos: approvedLinks.length, assigned: assigned.length, completed };
}

export function TrainingMatrixPanel(props: WorkflowsProps) {
  const { assets, scripts, links, assignments, businesses } = props;
  const rows = useMemo(() => {
    const ids = new Set<string>();
    assets.forEach((a) => a.business_id && ids.add(a.business_id));
    return Array.from(ids).map((bid) => ({
      business_id: bid,
      name: businesses.find((b) => b.id === bid)?.name ?? bid.slice(0,8),
      cells: REQUIRED_CATEGORIES.map((c) => ({ key: c.key, label: c.label, ...categoryStatus(assets, scripts, links, assignments, bid, c.key) })),
    }));
  }, [assets, scripts, links, assignments, businesses]);

  const stateColor = (s: string) => {
    if (s === "missing") return "bg-destructive/15 text-destructive";
    if (s === "completion evidenced") return "bg-emerald-500/15 text-emerald-400";
    if (s === "training assigned" || s === "video approved") return "bg-blue-500/15 text-blue-400";
    if (s === "recording pending") return "bg-amber-500/15 text-amber-400";
    return "bg-muted";
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Business training matrix</CardTitle>
        <CardDescription>Per-business coverage across required video SOP categories.</CardDescription>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        {rows.length === 0 ? (
          <div className="p-6 text-sm text-muted-foreground">No business-labelled assets yet.</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Business</TableHead>
                {REQUIRED_CATEGORIES.map((c) => <TableHead key={c.key} className="text-xs">{c.label}</TableHead>)}
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.business_id}>
                  <TableCell className="font-medium text-sm">{r.name}</TableCell>
                  {r.cells.map((c) => (
                    <TableCell key={c.key} className="text-xs">
                      <Badge variant="outline" className={stateColor(c.state)}>{c.state}</Badge>
                      <div className="text-muted-foreground mt-1">{c.approvedVideos} vid · {c.assigned} assn · {c.completed} done</div>
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

// =================== Saleability Export ===================
function buildBusinessPack(business: { id: string; name?: string | null }, assets: Any[], scripts: Any[], links: Any[], assignments: Any[]) {
  const ba = assets.filter((a) => a.business_id === business.id);
  const approvedAssets = ba.filter((a) => a.status === "approved" || a.status === "published_internal");
  const bl = links.filter((l) => ba.some((a) => a.id === l.asset_id));
  const approvedLinks = bl.filter((l) => ["approved_internal","approved_customer","approved_buyer_handover"].includes(l.review_status));
  const buyerLinks = bl.filter((l) => l.review_status === "approved_buyer_handover");
  const completed = assignments.filter((t) => ba.some((a) => a.id === t.asset_id) && t.completion_status === "completed" && t.approved_completion_at);
  const sample = ba[0];
  const missing = REQUIRED_CATEGORIES.filter((c) => !ba.some((a) => a.asset_type === c.key && (a.status === "approved" || a.status === "published_internal")));
  const privacyWarnings = bl.filter((l) => l.contains_sensitive_content && !l.sensitive_content_waived_at);
  const score = Math.round(((REQUIRED_CATEGORIES.length - missing.length) / REQUIRED_CATEGORIES.length) * 100);
  return {
    business_id: business.id,
    business_name: business.name ?? business.id.slice(0,8),
    brand_name: sample?.brand_name ?? business.name ?? null,
    website_url: sample?.website_url ?? null,
    approved_assets: approvedAssets,
    approved_links: approvedLinks,
    buyer_handover_links: buyerLinks,
    completed_assignments: completed,
    missing_categories: missing.map((m) => m.label),
    privacy_warnings: privacyWarnings.length,
    saleability_score: score,
    recommended: [
      ...missing.map((m) => `Add ${m.label} video`),
      ...(privacyWarnings.length > 0 ? [`Resolve ${privacyWarnings.length} sensitive-content link warning(s)`] : []),
      ...(approvedLinks.length === 0 ? ["Approve at least one video link"] : []),
    ],
  };
}

function packToText(p: ReturnType<typeof buildBusinessPack>): string {
  return [
    `VIDEO SOP SALEABILITY PACK`,
    `Business: ${p.business_name}`,
    `Brand: ${p.brand_name ?? "-"}`,
    `Website: ${p.website_url ?? "-"}`,
    `Saleability score: ${p.saleability_score}%`,
    ``,
    `APPROVED ASSETS (${p.approved_assets.length})`,
    ...p.approved_assets.map((a) => `- ${a.asset_title} [${a.asset_type}, ${a.audience_type}]`),
    ``,
    `APPROVED VIDEO LINKS (${p.approved_links.length})`,
    ...p.approved_links.map((l) => `- ${l.external_tool}: ${l.video_url} [${l.review_status}]`),
    ``,
    `BUYER HANDOVER VIDEOS (${p.buyer_handover_links.length})`,
    ...p.buyer_handover_links.map((l) => `- ${l.video_url}`),
    ``,
    `TRAINING COMPLETION EVIDENCE (${p.completed_assignments.length})`,
    ...p.completed_assignments.map((t) => `- ${t.assigned_to_name} (${t.assigned_to_type}) completed ${t.completed_at}`),
    ``,
    `GAPS / MISSING CATEGORIES`,
    ...(p.missing_categories.length ? p.missing_categories.map((m) => `- ${m}`) : ["- None"]),
    ``,
    `PRIVACY/COMPLIANCE WARNINGS: ${p.privacy_warnings}`,
    ``,
    `RECOMMENDED NEXT ACTIONS`,
    ...(p.recommended.length ? p.recommended.map((r) => `- ${r}`) : ["- None"]),
  ].join("\n");
}

function packToCsv(p: ReturnType<typeof buildBusinessPack>): string {
  const rows: string[] = [];
  rows.push("section,field,value");
  rows.push(`summary,business_name,${csvEscape(p.business_name)}`);
  rows.push(`summary,brand_name,${csvEscape(p.brand_name)}`);
  rows.push(`summary,website_url,${csvEscape(p.website_url)}`);
  rows.push(`summary,saleability_score,${p.saleability_score}`);
  rows.push(`summary,missing_categories,${csvEscape(p.missing_categories.join("; "))}`);
  rows.push(`summary,privacy_warnings,${p.privacy_warnings}`);
  p.approved_assets.forEach((a) => rows.push(`asset,${csvEscape(a.asset_title)},${csvEscape(`${a.asset_type}|${a.audience_type}|${a.status}`)}`));
  p.approved_links.forEach((l) => rows.push(`link,${csvEscape(l.external_tool)},${csvEscape(`${l.video_url}|${l.review_status}`)}`));
  p.completed_assignments.forEach((t) => rows.push(`training,${csvEscape(t.assigned_to_name)},${csvEscape(`${t.assigned_to_type}|${t.completed_at}`)}`));
  return rows.join("\n");
}

export function SaleabilityExportPanel(props: WorkflowsProps) {
  const { assets, scripts, links, assignments, businesses } = props;
  const businessIds = useMemo(() => {
    const s = new Set<string>();
    assets.forEach((a) => a.business_id && s.add(a.business_id));
    return Array.from(s);
  }, [assets]);

  const packs = useMemo(
    () => businessIds.map((bid) => buildBusinessPack(businesses.find((b) => b.id === bid) ?? { id: bid }, assets, scripts, links, assignments)),
    [businessIds, assets, scripts, links, assignments, businesses],
  );

  const exportPdf = async (p: ReturnType<typeof buildBusinessPack>) => {
    try {
      const mod: any = await import("jspdf");
      const Doc = mod.jsPDF || mod.default;
      const doc = new Doc();
      const text = packToText(p);
      const lines = doc.splitTextToSize(text, 180);
      doc.setFontSize(10);
      doc.text(lines, 10, 10);
      doc.save(`video-sop-saleability-${p.business_name}.pdf`);
    } catch {
      downloadFile(`video-sop-saleability-${p.business_name}.txt`, packToText(p));
      toast({ title: "PDF unavailable", description: "Exported as .txt instead." });
    }
  };

  return (
    <div className="space-y-3">
      {packs.length === 0 ? (
        <Card><CardContent className="p-6 text-sm text-muted-foreground">No business-labelled assets yet.</CardContent></Card>
      ) : packs.map((p) => (
        <Card key={p.business_id}>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              {p.business_name}
              <Badge className={p.saleability_score >= 80 ? "bg-emerald-500/15 text-emerald-400" : p.saleability_score >= 40 ? "bg-amber-500/15 text-amber-400" : "bg-destructive/15 text-destructive"}>
                {p.saleability_score}% sale-ready
              </Badge>
            </CardTitle>
            <CardDescription>{p.approved_assets.length} approved assets · {p.approved_links.length} approved links · {p.buyer_handover_links.length} buyer-handover · {p.completed_assignments.length} completions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-3 text-xs">
              <div>
                <div className="font-medium mb-1">Missing categories</div>
                {p.missing_categories.length ? p.missing_categories.map((m) => <Badge key={m} variant="outline" className="bg-amber-500/10 text-amber-400 mr-1 mb-1">{m}</Badge>) : <span className="text-muted-foreground">None</span>}
              </div>
              <div>
                <div className="font-medium mb-1">Recommended next actions</div>
                <ul className="list-disc ml-5">{p.recommended.length ? p.recommended.map((r) => <li key={r}>{r}</li>) : <li className="text-muted-foreground">None</li>}</ul>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 mt-3">
              <Button size="sm" variant="outline" onClick={() => { navigator.clipboard.writeText(packToText(p)); toast({ title: "Pack copied" }); }}><ClipboardCopy size={14} /> Copy</Button>
              <Button size="sm" variant="outline" onClick={() => downloadFile(`video-sop-saleability-${p.business_name}.txt`, packToText(p))}><Download size={14} /> .txt/.md</Button>
              <Button size="sm" variant="outline" onClick={() => downloadFile(`video-sop-saleability-${p.business_name}.csv`, packToCsv(p), "text/csv")}><Download size={14} /> .csv</Button>
              <Button size="sm" variant="outline" onClick={() => exportPdf(p)}><Download size={14} /> .pdf</Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// =================== Safety Panel ===================
export function SafetyPanel({ assets, links, assignments }: WorkflowsProps) {
  const buckets = useMemo(() => {
    const publicLinks = links.filter((l) => l.privacy_status === "public" || l.privacy_status === "unlisted");
    const customerUnapproved = links.filter((l) => l.review_status === "approved_customer" ? false : (l.approved_for_customer_use && !l.customer_visibility_approved_at));
    const sensitive = links.filter((l) => l.contains_sensitive_content);
    const noPrivacyNotes = assets.filter((a) => !a.privacy_warning_notes && a.demo_data_required);
    const buyerUnapproved = assets.filter((a) => a.asset_type === "buyer_handover" && !links.some((l) => l.asset_id === a.id && l.buyer_handover_approved_at));
    const completionsNoApproval = assignments.filter((t) => t.completion_status === "completed" && !t.approved_completion_at);
    const missingBusiness = assets.filter((a) => !a.business_id);
    const testRecords = assets.filter((a) => a.is_test_data);
    return [
      { label: "Public / unlisted links", rows: publicLinks.map((l) => l.video_url || l.id) },
      { label: "Customer-visible links not founder-approved", rows: customerUnapproved.map((l) => l.video_url || l.id) },
      { label: "Links flagged sensitive", rows: sensitive.map((l) => l.video_url || l.id) },
      { label: "Assets without privacy notes (demo_data_required)", rows: noPrivacyNotes.map((a) => a.asset_title) },
      { label: "Buyer-handover assets without approved link", rows: buyerUnapproved.map((a) => a.asset_title) },
      { label: "Completed assignments without founder approval", rows: completionsNoApproval.map((t) => t.assigned_to_name || t.id) },
      { label: "Assets missing business_id", rows: missingBusiness.map((a) => a.asset_title) },
      { label: "Test data records", rows: testRecords.map((a) => a.asset_title) },
    ];
  }, [assets, links, assignments]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2"><AlertTriangle size={16} className="text-amber-400" /> Safety, privacy and control</CardTitle>
        <CardDescription>Nothing is published externally. All approvals are founder/admin gated.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {buckets.map((b) => (
          <div key={b.label} className="border border-border/40 rounded-md p-3">
            <div className="text-sm font-medium flex items-center justify-between">
              <span>{b.label}</span>
              <Badge variant="outline" className={b.rows.length ? "bg-amber-500/10 text-amber-400" : "bg-emerald-500/10 text-emerald-400"}>{b.rows.length}</Badge>
            </div>
            {b.rows.length > 0 && (
              <ul className="text-xs text-muted-foreground list-disc ml-5 mt-1 max-h-32 overflow-auto">
                {b.rows.slice(0, 25).map((r, i) => <li key={`${r}-${i}`} className="truncate">{r}</li>)}
              </ul>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

// =================== Top-level KPI computation export ===================
export function computeKpis(assets: Any[], scripts: Any[], links: Any[], assignments: Any[]) {
  const businessIds = new Set<string>();
  assets.forEach((a) => a.business_id && businessIds.add(a.business_id));
  const businessHas = (bid: string, type: string) => assets.some((a) => a.business_id === bid && a.asset_type === type && (a.status === "approved" || a.status === "published_internal"));
  const missingCustomer = Array.from(businessIds).filter((bid) => !businessHas(bid, "customer_onboarding_video")).length;
  const missingOperator = Array.from(businessIds).filter((bid) => !businessHas(bid, "operator_training")).length;
  const completePacks = Array.from(businessIds).filter((bid) => REQUIRED_CATEGORIES.every((c) => businessHas(bid, c.key))).length;
  return {
    total_assets: assets.length,
    scripts_approved: scripts.filter((s) => s.approved_at).length,
    recordings_pending: assets.filter((a) => ["ready_to_record","recording_in_progress","needs_editing"].includes(a.recording_status ?? "")).length,
    videos_awaiting_review: links.filter((l) => l.review_status === "needs_review" || l.review_status === "link_added").length,
    customer_approved_videos: links.filter((l) => l.review_status === "approved_customer").length,
    buyer_handover_videos: links.filter((l) => l.review_status === "approved_buyer_handover").length,
    assignments_incomplete: assignments.filter((t) => t.completion_status !== "completed" && t.completion_status !== "waived").length,
    businesses_missing_customer_video: missingCustomer,
    businesses_missing_operator_video: missingOperator,
    businesses_complete_pack: completePacks,
  };
}