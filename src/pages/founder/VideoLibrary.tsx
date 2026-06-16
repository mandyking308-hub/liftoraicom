import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import FounderLayout from "@/components/founder/FounderLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ArrowLeft, Search, Upload, Video, MessageSquare, ExternalLink, Loader2, ShieldAlert, BookOpen, Map, ClipboardCheck, Package } from "lucide-react";

const sb: any = supabase;

type VideoRow = {
  id: string; title: string; description: string | null;
  source_type: string; external_provider: string | null; external_url: string | null;
  duration_seconds: number | null; status: string; visibility: string;
  module_coverage: string[] | null; tags: string[] | null;
  transcript_segment_count: number; redaction_status: string;
  business_id: string | null; created_at: string;
  video_type?: string | null; audience_type?: string | null; dashboard_area?: string | null;
  asset_id?: string | null;
  approval_status?: string | null; transcript_status?: string | null; privacy_status?: string | null;
  approved_by?: string | null; approved_at?: string | null;
  buyer_handover_ready?: boolean | null;
};

function statusBadge(s: string) {
  const map: Record<string, string> = {
    draft: "bg-zinc-500/15 text-zinc-300 border-zinc-500/30",
    processing: "bg-yellow-500/15 text-yellow-300 border-yellow-500/30",
    ready: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
    needs_redaction: "bg-red-500/15 text-red-300 border-red-500/30",
    redacted: "bg-blue-500/15 text-blue-300 border-blue-500/30",
    archived: "bg-secondary text-muted-foreground border-border/50",
  };
  return <Badge variant="outline" className={`${map[s] ?? "bg-secondary"} text-[10px]`}>{s}</Badge>;
}

function fmtTime(sec: number) {
  if (!Number.isFinite(sec)) return "00:00";
  const s = Math.max(0, Math.floor(sec));
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), r = s % 60;
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}` : `${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}`;
}

function jumpUrl(provider: string | null, url: string | null, sec: number) {
  if (!url) return null;
  const t = Math.floor(sec);
  try {
    const u = new URL(url);
    if (provider === "youtube_unlisted" || /youtube\.com|youtu\.be/i.test(u.hostname)) {
      u.searchParams.set("t", `${t}s`); return u.toString();
    }
    if (provider === "vimeo" || /vimeo\.com/i.test(u.hostname)) {
      u.hash = `t=${t}s`; return u.toString();
    }
    if (provider === "loom" || /loom\.com/i.test(u.hostname)) {
      u.searchParams.set("t", `${t}`); return u.toString();
    }
    u.hash = `t=${t}`; return u.toString();
  } catch { return url; }
}

export default function VideoLibrary() {
  const qc = useQueryClient();
  const [tab, setTab] = useState("library");
  const [createOpen, setCreateOpen] = useState(false);
  const [ingestOpen, setIngestOpen] = useState<{ open: boolean; videoId?: string; title?: string }>({ open: false });
  const [askOpen, setAskOpen] = useState<{ open: boolean; videoId?: string; title?: string }>({ open: false });

  const videosQ = useQuery({
    queryKey: ["video-library"],
    queryFn: async () => {
      const { data, error } = await sb.from("video_library_items").select("*").order("created_at", { ascending: false }).limit(200);
      if (error) throw error;
      return (data ?? []) as VideoRow[];
    },
  });

  return (
    <FounderLayout>
      <div className="space-y-6 max-w-7xl mx-auto p-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <Link to="/founder" className="text-xs text-primary hover:underline inline-flex items-center gap-1 mb-2">
              <ArrowLeft size={12} /> Back to Command Centre
            </Link>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Video size={20} className="text-primary" /> Searchable Video Library
            </h1>
            <p className="text-xs text-muted-foreground mt-1 max-w-3xl">
              Turn every video SOP, dashboard walkthrough, training recording and customer onboarding video into searchable, auditable operational memory.
              Transcript-indexed. Semantic + keyword search. Jump-to-timestamp. Ask-this-video Q&amp;A.
            </p>
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={() => setCreateOpen(true)}>
              <Video size={14} className="mr-1" /> New video
            </Button>
          </div>
        </div>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="flex-wrap h-auto">
            <TabsTrigger value="library"><Video size={12} className="mr-1" /> Library</TabsTrigger>
            <TabsTrigger value="search"><Search size={12} className="mr-1" /> Search</TabsTrigger>
            <TabsTrigger value="ask"><MessageSquare size={12} className="mr-1" /> Ask</TabsTrigger>
            <TabsTrigger value="coverage"><Map size={12} className="mr-1" /> Coverage</TabsTrigger>
            <TabsTrigger value="assignments"><ClipboardCheck size={12} className="mr-1" /> Assignments</TabsTrigger>
            <TabsTrigger value="privacy"><ShieldAlert size={12} className="mr-1" /> Privacy</TabsTrigger>
            <TabsTrigger value="evidence"><Package size={12} className="mr-1" /> Buyer / Adviser</TabsTrigger>
            <TabsTrigger value="governance"><ShieldAlert size={12} className="mr-1" /> Governance</TabsTrigger>
          </TabsList>

          <TabsContent value="library" className="space-y-3">
            <Card className="tech-card">
              <CardHeader className="pb-2"><CardTitle className="text-sm">Library ({videosQ.data?.length ?? 0})</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {videosQ.isLoading && <p className="text-xs text-muted-foreground">Loading…</p>}
                {videosQ.data?.length === 0 && (
                  <p className="text-xs text-muted-foreground">No videos yet. Click <strong>New video</strong> to register one and upload its transcript.</p>
                )}
                {videosQ.data?.map((v) => (
                  <div key={v.id} className="border border-border/40 rounded p-3 text-xs space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm">{v.title}</span>
                      {statusBadge(v.status)}
                      {v.video_type && <Badge variant="outline" className="text-[10px]">{v.video_type}</Badge>}
                      {v.audience_type && <Badge variant="outline" className="text-[10px]">{v.audience_type}</Badge>}
                      {v.dashboard_area && <Badge variant="outline" className="text-[10px]">area:{v.dashboard_area}</Badge>}
                      <Badge variant="outline" className="text-[10px]">{v.source_type}</Badge>
                      {v.external_provider && <Badge variant="outline" className="text-[10px]">{v.external_provider}</Badge>}
                      <Badge variant="outline" className="text-[10px]">{v.visibility}</Badge>
                      <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-primary/30">
                        {v.transcript_segment_count} segments
                      </Badge>
                      {v.transcript_status && <Badge variant="outline" className="text-[10px]">tx:{v.transcript_status}</Badge>}
                      {v.privacy_status && (
                        <Badge variant="outline" className={`text-[10px] ${v.privacy_status === 'flagged' ? 'bg-red-500/15 text-red-300 border-red-500/30' : v.privacy_status === 'approved_internal' ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' : ''}`}>
                          privacy:{v.privacy_status}
                        </Badge>
                      )}
                      {v.approval_status && <Badge variant="outline" className="text-[10px]">{v.approval_status}</Badge>}
                      {v.buyer_handover_ready && <Badge variant="outline" className="text-[10px] bg-blue-500/15 text-blue-300 border-blue-500/30">buyer-ready</Badge>}
                      {v.duration_seconds ? <span className="text-muted-foreground">{fmtTime(v.duration_seconds)}</span> : null}
                      <span className="ml-auto text-muted-foreground">{new Date(v.created_at).toLocaleDateString()}</span>
                    </div>
                    {v.description && <p className="text-muted-foreground">{v.description}</p>}
                    {(v.tags?.length || v.module_coverage?.length) ? (
                      <div className="flex flex-wrap gap-1">
                        {(v.module_coverage ?? []).map((m) => <Badge key={m} variant="outline" className="text-[10px]">#{m}</Badge>)}
                        {(v.tags ?? []).map((t) => <Badge key={t} variant="outline" className="text-[10px] bg-secondary">{t}</Badge>)}
                      </div>
                    ) : null}
                    <div className="flex gap-2 mt-1">
                      <Button size="sm" variant="outline" onClick={() => setIngestOpen({ open: true, videoId: v.id, title: v.title })}>
                        <Upload size={12} className="mr-1" /> Transcript
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setAskOpen({ open: true, videoId: v.id, title: v.title })} disabled={v.transcript_segment_count === 0}>
                        <MessageSquare size={12} className="mr-1" /> Ask
                      </Button>
                      <Button size="sm" variant="outline" disabled={v.transcript_segment_count === 0} onClick={async () => {
                        const { data, error } = await sb.functions.invoke("vid-privacy-scan", { body: { video_id: v.id } });
                        if (error || data?.error) { toast.error(error?.message || data?.error || "Scan failed"); return; }
                        toast.success(`Privacy: ${data.privacy_status} (${data.total_flags} flag${data.total_flags===1?'':'s'})`);
                        qc.invalidateQueries({ queryKey: ["video-library"] });
                      }}>
                        <ShieldAlert size={12} className="mr-1" /> Privacy scan
                      </Button>
                      {v.external_url && (
                        <a href={v.external_url} target="_blank" rel="noreferrer" className="text-primary text-xs inline-flex items-center gap-1 ml-auto">
                          Open <ExternalLink size={11} />
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="search"><SearchPanel videos={videosQ.data ?? []} /></TabsContent>

          <TabsContent value="ask"><AskPanel videos={videosQ.data ?? []} onOpen={(id, title) => setAskOpen({ open: true, videoId: id, title })} /></TabsContent>

          <TabsContent value="coverage"><CoveragePanel videos={videosQ.data ?? []} /></TabsContent>
          <TabsContent value="assignments"><AssignmentsPanel videos={videosQ.data ?? []} /></TabsContent>
          <TabsContent value="privacy"><PrivacyPanel videos={videosQ.data ?? []} onChanged={() => qc.invalidateQueries({ queryKey: ["video-library"] })} /></TabsContent>
          <TabsContent value="evidence"><EvidencePanel videos={videosQ.data ?? []} /></TabsContent>

          <TabsContent value="governance">
            <Card className="tech-card">
              <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><ShieldAlert size={14} /> Governance &amp; privacy</CardTitle></CardHeader>
              <CardContent className="text-xs space-y-2 text-muted-foreground">
                <p>Every video is founder/admin gated by default. Wider sharing requires a redaction review pass.</p>
                <ul className="list-disc ml-5 space-y-1">
                  <li>Set <strong>contains_sensitive_info</strong> and <strong>redaction_required</strong> on the video before sharing externally.</li>
                  <li>Access grants per role/user are stored in <code>video_library_access_grants</code>.</li>
                  <li>Every search is logged to <code>video_library_search_audit</code> with latency and result count.</li>
                  <li>Q&amp;A answers are constrained to retrieved transcript snippets only — no invention.</li>
                </ul>
                <p>Liftor owns the transcript index, search, Q&amp;A, permissions and operational memory. External tools (Loom, Zoom, Panopto, Vimeo, YouTube unlisted, Guidde, HeyGen, Synthesia, Elai) sit underneath as capture/hosting/generation surfaces.</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <CreateVideoDialog open={createOpen} onOpenChange={setCreateOpen} onCreated={() => qc.invalidateQueries({ queryKey: ["video-library"] })} />
        <IngestDialog state={ingestOpen} onOpenChange={(v) => setIngestOpen({ open: v })} onDone={() => qc.invalidateQueries({ queryKey: ["video-library"] })} />
        <AskDialog state={askOpen} onOpenChange={(v) => setAskOpen({ open: v })} videos={videosQ.data ?? []} />
      </div>
    </FounderLayout>
  );
}

function CreateVideoDialog({ open, onOpenChange, onCreated }: { open: boolean; onOpenChange: (v: boolean) => void; onCreated: () => void }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [externalProvider, setExternalProvider] = useState("loom");
  const [externalUrl, setExternalUrl] = useState("");
  const [sourceType, setSourceType] = useState("internal");
  const [visibility, setVisibility] = useState("founder_only");
  const [tags, setTags] = useState("");
  const [modules, setModules] = useState("");
  const [videoType, setVideoType] = useState("sop");
  const [audienceType, setAudienceType] = useState("founder");
  const [dashboardArea, setDashboardArea] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!title.trim()) { toast.error("Title required"); return; }
    setBusy(true);
    const { error } = await sb.from("video_library_items").insert({
      title: title.trim(),
      description: description.trim() || null,
      external_provider: externalProvider || null,
      external_url: externalUrl.trim() || null,
      source_type: sourceType,
      visibility,
      tags: tags.split(",").map((s) => s.trim()).filter(Boolean),
      module_coverage: modules.split(",").map((s) => s.trim()).filter(Boolean),
      status: "draft",
      video_type: videoType,
      audience_type: audienceType,
      dashboard_area: dashboardArea.trim() || null,
      transcript_status: "missing",
      privacy_status: "unchecked",
      approval_status: "draft",
    });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Video registered. Upload a transcript next.");
    setTitle(""); setDescription(""); setExternalUrl(""); setTags(""); setModules(""); setDashboardArea("");
    onOpenChange(false); onCreated();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Register new video</DialogTitle>
          <DialogDescription>Liftor stores intelligence/permissions/transcript. The video itself stays on your hosting tool (Loom, Zoom, Vimeo, etc.).</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3 text-xs">
          <label className="col-span-2">Title<Input value={title} onChange={(e) => setTitle(e.target.value)} /></label>
          <label className="col-span-2">Description<Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} /></label>
          <label>Provider
            <select className="w-full bg-background border border-border/50 rounded h-9 px-2" value={externalProvider} onChange={(e) => setExternalProvider(e.target.value)}>
              {["loom","zoom","panopto","vimeo","youtube_unlisted","guidde","heygen","synthesia","elai","upload","other"].map((x) => <option key={x} value={x}>{x}</option>)}
            </select>
          </label>
          <label>External URL<Input value={externalUrl} onChange={(e) => setExternalUrl(e.target.value)} placeholder="https://…" /></label>
          <label>Source type
            <select className="w-full bg-background border border-border/50 rounded h-9 px-2" value={sourceType} onChange={(e) => setSourceType(e.target.value)}>
              {["internal","customer","operator","buyer","adviser","training","sop","dashboard_walkthrough","marketing"].map((x) => <option key={x} value={x}>{x}</option>)}
            </select>
          </label>
          <label>Visibility
            <select className="w-full bg-background border border-border/50 rounded h-9 px-2" value={visibility} onChange={(e) => setVisibility(e.target.value)}>
              {["founder_only","internal","customer","buyer","adviser","operator","partner"].map((x) => <option key={x} value={x}>{x}</option>)}
            </select>
          </label>
          <label className="col-span-2">Tags (comma-sep)<Input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="onboarding, dashboard" /></label>
          <label className="col-span-2">Module coverage (comma-sep)<Input value={modules} onChange={(e) => setModules(e.target.value)} placeholder="referrals, invoicing, compliance" /></label>
          <label>Video type
            <select className="w-full bg-background border border-border/50 rounded h-9 px-2" value={videoType} onChange={(e) => setVideoType(e.target.value)}>
              {["sop","dashboard_walkthrough","customer_onboarding","operator_training","support_video","compliance_training","founder_training","buyer_handover","adviser_handover"].map((x) => <option key={x} value={x}>{x}</option>)}
            </select>
          </label>
          <label>Audience
            <select className="w-full bg-background border border-border/50 rounded h-9 px-2" value={audienceType} onChange={(e) => setAudienceType(e.target.value)}>
              {["founder","admin","operator","oversight","customer","buyer","adviser"].map((x) => <option key={x} value={x}>{x}</option>)}
            </select>
          </label>
          <label className="col-span-2">Dashboard area<Input value={dashboardArea} onChange={(e) => setDashboardArea(e.target.value)} placeholder="e.g. referrals dashboard" /></label>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit} disabled={busy}>{busy && <Loader2 size={12} className="mr-1 animate-spin" />}Register</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function IngestDialog({ state, onOpenChange, onDone }: { state: { open: boolean; videoId?: string; title?: string }; onOpenChange: (v: boolean) => void; onDone: () => void }) {
  const [format, setFormat] = useState<"vtt" | "srt" | "json">("vtt");
  const [content, setContent] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!state.videoId) return;
    if (!content.trim()) { toast.error("Paste a transcript first"); return; }
    setBusy(true);
    try {
      const { data, error } = await sb.functions.invoke("vid-ingest-transcript", {
        body: { video_id: state.videoId, format, content },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error + (data.detail ? `: ${data.detail}` : ""));
      toast.success(`Ingested ${data?.segments ?? 0} segments`);
      setContent(""); onOpenChange(false); onDone();
    } catch (e: any) { toast.error(e?.message ?? "Ingest failed"); }
    finally { setBusy(false); }
  };

  const onFile = async (f: File | undefined) => {
    if (!f) return;
    const txt = await f.text();
    setContent(txt);
    if (f.name.toLowerCase().endsWith(".srt")) setFormat("srt");
    else if (f.name.toLowerCase().endsWith(".json")) setFormat("json");
    else setFormat("vtt");
  };

  return (
    <Dialog open={state.open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Upload transcript {state.title ? `— ${state.title}` : ""}</DialogTitle>
          <DialogDescription>VTT, SRT or JSON with <code>{`{ segments:[{start,end,text,speaker?}]}`}</code>. Each segment is embedded and indexed for hybrid search.</DialogDescription>
        </DialogHeader>
        <div className="space-y-2 text-xs">
          <div className="flex items-center gap-2">
            <label>Format
              <select className="ml-2 bg-background border border-border/50 rounded h-8 px-2" value={format} onChange={(e) => setFormat(e.target.value as any)}>
                <option value="vtt">VTT</option><option value="srt">SRT</option><option value="json">JSON</option>
              </select>
            </label>
            <input type="file" accept=".vtt,.srt,.json,.txt" onChange={(e) => onFile(e.target.files?.[0])} className="text-xs" />
          </div>
          <Textarea value={content} onChange={(e) => setContent(e.target.value)} rows={14} placeholder="Paste transcript here…" className="font-mono text-[11px]" />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit} disabled={busy || !content.trim()}>
            {busy && <Loader2 size={12} className="mr-1 animate-spin" />}Ingest &amp; embed
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SearchPanel({ videos }: { videos: VideoRow[] }) {
  const [query, setQuery] = useState("");
  const [mode, setMode] = useState<"hybrid" | "keyword" | "semantic">("hybrid");
  const [videoId, setVideoId] = useState<string>("");
  const [results, setResults] = useState<any[]>([]);
  const [busy, setBusy] = useState(false);
  const [meta, setMeta] = useState<{ latency_ms?: number; count?: number } | null>(null);

  const videoById = useMemo(() => Object.fromEntries(videos.map((v) => [v.id, v])), [videos]);

  const run = async () => {
    if (!query.trim()) { toast.error("Enter a search query"); return; }
    setBusy(true);
    try {
      const { data, error } = await sb.functions.invoke("vid-search", {
        body: { query, mode, limit: 25, video_id: videoId || null },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setResults(data?.results ?? []);
      setMeta({ latency_ms: data?.latency_ms, count: data?.count });
    } catch (e: any) { toast.error(e?.message ?? "Search failed"); }
    finally { setBusy(false); }
  };

  return (
    <Card className="tech-card">
      <CardHeader className="pb-2"><CardTitle className="text-sm">Transcript search</CardTitle></CardHeader>
      <CardContent className="space-y-3 text-xs">
        <div className="flex flex-wrap gap-2 items-end">
          <div className="flex-1 min-w-[240px]">
            <Input placeholder="Search across all transcripts…" value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => e.key === "Enter" && run()} />
          </div>
          <select className="bg-background border border-border/50 rounded h-9 px-2" value={mode} onChange={(e) => setMode(e.target.value as any)}>
            <option value="hybrid">Hybrid</option><option value="semantic">Semantic</option><option value="keyword">Keyword</option>
          </select>
          <select className="bg-background border border-border/50 rounded h-9 px-2" value={videoId} onChange={(e) => setVideoId(e.target.value)}>
            <option value="">All videos</option>
            {videos.map((v) => <option key={v.id} value={v.id}>{v.title}</option>)}
          </select>
          <Button size="sm" onClick={run} disabled={busy}>
            {busy && <Loader2 size={12} className="mr-1 animate-spin" />}<Search size={12} className="mr-1" />Search
          </Button>
        </div>
        {meta && <p className="text-[11px] text-muted-foreground">{meta.count} results · {meta.latency_ms}ms</p>}
        <div className="space-y-2">
          {results.map((r, i) => {
            const v = r.video ?? videoById[r.video_id];
            const url = jumpUrl(v?.external_provider ?? null, v?.external_url ?? null, r.start_seconds);
            return (
              <div key={`${r.segment_id}-${i}`} className="border border-border/40 rounded p-2 space-y-1">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-primary/30">
                    {fmtTime(r.start_seconds)} – {fmtTime(r.end_seconds)}
                  </Badge>
                  <span className="font-medium">{v?.title ?? r.video_id}</span>
                  {r.speaker && <Badge variant="outline" className="text-[10px]">{r.speaker}</Badge>}
                  <span className="ml-auto text-[10px] text-muted-foreground">
                    sem {r.semantic_score?.toFixed(2)} · kw {r.keyword_score?.toFixed(2)} · score {r.combined_score?.toFixed(2)}
                  </span>
                </div>
                <p className="text-muted-foreground">{r.text}</p>
                {url && (
                  <a href={url} target="_blank" rel="noreferrer" className="text-primary inline-flex items-center gap-1">
                    Jump to {fmtTime(r.start_seconds)} <ExternalLink size={11} />
                  </a>
                )}
              </div>
            );
          })}
          {!busy && results.length === 0 && <p className="text-muted-foreground">No results yet.</p>}
        </div>
      </CardContent>
    </Card>
  );
}

function AskPanel({ videos, onOpen }: { videos: VideoRow[]; onOpen: (id: string, title: string) => void }) {
  return (
    <Card className="tech-card">
      <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><BookOpen size={14} /> Ask a video</CardTitle></CardHeader>
      <CardContent className="space-y-2 text-xs">
        <p className="text-muted-foreground">Pick a video with an ingested transcript and ask a question. Answers come strictly from transcript snippets with timestamp citations.</p>
        <div className="space-y-1">
          {videos.filter((v) => v.transcript_segment_count > 0).map((v) => (
            <div key={v.id} className="flex items-center gap-2 border border-border/40 rounded p-2">
              <span className="font-medium">{v.title}</span>
              <Badge variant="outline" className="text-[10px]">{v.transcript_segment_count} segments</Badge>
              <Button size="sm" variant="outline" className="ml-auto" onClick={() => onOpen(v.id, v.title)}>
                <MessageSquare size={12} className="mr-1" />Ask
              </Button>
            </div>
          ))}
          {videos.filter((v) => v.transcript_segment_count > 0).length === 0 && (
            <p className="text-muted-foreground">No videos with transcripts yet.</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function AskDialog({ state, onOpenChange, videos }: { state: { open: boolean; videoId?: string; title?: string }; onOpenChange: (v: boolean) => void; videos: VideoRow[] }) {
  const [question, setQuestion] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ answer: string; citations: any[] } | null>(null);
  const v = videos.find((x) => x.id === state.videoId);

  const submit = async () => {
    if (!state.videoId || !question.trim()) return;
    setBusy(true); setResult(null);
    try {
      const { data, error } = await sb.functions.invoke("vid-ask", {
        body: { video_id: state.videoId, question },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setResult({ answer: data.answer, citations: data.citations ?? [] });
    } catch (e: any) { toast.error(e?.message ?? "Ask failed"); }
    finally { setBusy(false); }
  };

  return (
    <Dialog open={state.open} onOpenChange={(o) => { onOpenChange(o); if (!o) { setQuestion(""); setResult(null); } }}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Ask: {state.title ?? "video"}</DialogTitle>
          <DialogDescription>Answers are constrained to retrieved transcript snippets. Citations link to exact timestamps.</DialogDescription>
        </DialogHeader>
        <div className="space-y-2 text-xs">
          <Textarea value={question} onChange={(e) => setQuestion(e.target.value)} rows={3} placeholder="e.g. How does the referral approval flow work?" />
          <Button onClick={submit} disabled={busy || !question.trim()} size="sm">
            {busy && <Loader2 size={12} className="mr-1 animate-spin" />}Ask
          </Button>
          {result && (
            <div className="space-y-2 mt-3">
              <div className="border border-primary/30 bg-primary/5 rounded p-3 whitespace-pre-wrap">{result.answer}</div>
              <p className="text-muted-foreground">Citations</p>
              {result.citations.map((c) => {
                const url = jumpUrl(v?.external_provider ?? null, v?.external_url ?? null, c.start_seconds);
                return (
                  <div key={c.segment_id} className="border border-border/40 rounded p-2">
                    <div className="flex items-center gap-2 text-[11px]">
                      <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-primary/30">[{c.n}] {fmtTime(c.start_seconds)} – {fmtTime(c.end_seconds)}</Badge>
                      {url && <a href={url} target="_blank" rel="noreferrer" className="ml-auto text-primary inline-flex items-center gap-1">Jump <ExternalLink size={11} /></a>}
                    </div>
                    <p className="mt-1 text-muted-foreground">{c.text}</p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
function CoveragePanel({ videos }: { videos: VideoRow[] }) {
  const groups = useMemo(() => {
    const m: Record<string, { business: string; area: string; videos: VideoRow[] }> = {};
    for (const v of videos) {
      const business = v.business_id ?? "—";
      const areas = (v.module_coverage?.length ? v.module_coverage : [v.dashboard_area ?? "(unmapped)"]);
      for (const area of areas) {
        const key = `${business}::${area}`;
        if (!m[key]) m[key] = { business, area: String(area), videos: [] };
        m[key].videos.push(v);
      }
    }
    return Object.values(m).sort((a, b) => a.business.localeCompare(b.business) || a.area.localeCompare(b.area));
  }, [videos]);

  const missingTranscript = videos.filter((v) => (v.transcript_segment_count ?? 0) === 0);
  const blockedByPrivacy = videos.filter((v) => v.privacy_status === "flagged" || v.privacy_status === "blocked");
  const buyerReady = videos.filter((v) => v.buyer_handover_ready);

  return (
    <Card className="tech-card">
      <CardHeader className="pb-2"><CardTitle className="text-sm">Dashboard coverage map</CardTitle></CardHeader>
      <CardContent className="text-xs space-y-3">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <div className="border border-border/40 rounded p-2"><div className="text-muted-foreground">Areas covered</div><div className="text-xl font-semibold">{groups.length}</div></div>
          <div className="border border-border/40 rounded p-2"><div className="text-muted-foreground">Missing transcript</div><div className="text-xl font-semibold text-yellow-300">{missingTranscript.length}</div></div>
          <div className="border border-border/40 rounded p-2"><div className="text-muted-foreground">Privacy blocked</div><div className="text-xl font-semibold text-red-300">{blockedByPrivacy.length}</div></div>
          <div className="border border-border/40 rounded p-2"><div className="text-muted-foreground">Buyer-handover ready</div><div className="text-xl font-semibold text-blue-300">{buyerReady.length}</div></div>
        </div>
        {groups.length === 0 ? (
          <p className="text-muted-foreground">No coverage yet. Register a video with a dashboard area or module coverage to start mapping.</p>
        ) : (
          <div className="space-y-2">
            {groups.map((g) => (
              <div key={`${g.business}-${g.area}`} className="border border-border/40 rounded p-2">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-[10px]">business:{g.business.slice(0, 8)}</Badge>
                  <Badge variant="outline" className="text-[10px]">area:{g.area}</Badge>
                  <span className="ml-auto text-muted-foreground">{g.videos.length} video(s)</span>
                </div>
                <ul className="mt-1 ml-3 list-disc text-muted-foreground">
                  {g.videos.map((v) => (
                    <li key={v.id}>{v.title} — {v.transcript_segment_count} seg · privacy:{v.privacy_status ?? "unchecked"}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function AssignmentsPanel({ videos }: { videos: VideoRow[] }) {
  const [videoId, setVideoId] = useState("");
  const [role, setRole] = useState("operator");
  const [dueDate, setDueDate] = useState("");
  const [startSec, setStartSec] = useState("");
  const [endSec, setEndSec] = useState("");
  const qc = useQueryClient();

  const listQ = useQuery({
    queryKey: ["video-library-assignments"],
    queryFn: async () => {
      const { data, error } = await sb.from("video_library_training_assignments").select("*").order("created_at", { ascending: false }).limit(100);
      if (error) throw error;
      return data ?? [];
    },
  });

  const submit = async () => {
    if (!videoId) { toast.error("Pick a video"); return; }
    const payload: any = {
      video_id: videoId,
      assigned_to_role: role,
      due_at: dueDate || null,
      status: "assigned",
    };
    if (startSec) payload.start_seconds = Number(startSec);
    if (endSec) payload.end_seconds = Number(endSec);
    const { error } = await sb.from("video_library_training_assignments").insert(payload);
    if (error) { toast.error(error.message); return; }
    toast.success("Assignment created");
    setVideoId(""); setStartSec(""); setEndSec(""); setDueDate("");
    qc.invalidateQueries({ queryKey: ["video-library-assignments"] });
  };

  return (
    <Card className="tech-card">
      <CardHeader className="pb-2"><CardTitle className="text-sm">Training assignments</CardTitle></CardHeader>
      <CardContent className="text-xs space-y-3">
        <div className="flex flex-wrap gap-2 items-end">
          <select className="bg-background border border-border/50 rounded h-9 px-2 min-w-[200px]" value={videoId} onChange={(e) => setVideoId(e.target.value)}>
            <option value="">— select video —</option>
            {videos.map((v) => <option key={v.id} value={v.id}>{v.title}</option>)}
          </select>
          <select className="bg-background border border-border/50 rounded h-9 px-2" value={role} onChange={(e) => setRole(e.target.value)}>
            {["operator","oversight","customer","founder","admin","adviser","buyer"].map((x) => <option key={x} value={x}>{x}</option>)}
          </select>
          <Input className="w-32" placeholder="start sec" value={startSec} onChange={(e) => setStartSec(e.target.value)} />
          <Input className="w-32" placeholder="end sec" value={endSec} onChange={(e) => setEndSec(e.target.value)} />
          <Input type="date" className="w-40" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          <Button size="sm" onClick={submit}>Assign</Button>
        </div>
        <div className="space-y-1">
          {(listQ.data ?? []).length === 0 && <p className="text-muted-foreground">No assignments yet.</p>}
          {(listQ.data ?? []).map((a: any) => {
            const v = videos.find((x) => x.id === a.video_id);
            return (
              <div key={a.id} className="border border-border/40 rounded p-2 flex items-center gap-2 flex-wrap">
                <span className="font-medium">{v?.title ?? a.video_id}</span>
                <Badge variant="outline" className="text-[10px]">{a.assigned_to_role ?? "?"}</Badge>
                <Badge variant="outline" className="text-[10px]">{a.status}</Badge>
                {a.start_seconds != null && <Badge variant="outline" className="text-[10px]">{fmtTime(a.start_seconds)} – {fmtTime(a.end_seconds ?? a.start_seconds)}</Badge>}
                {a.due_at && <span className="text-muted-foreground">due {new Date(a.due_at).toLocaleDateString()}</span>}
                {a.completed_at && <span className="text-emerald-300">done {new Date(a.completed_at).toLocaleDateString()}</span>}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

function PrivacyPanel({ videos, onChanged }: { videos: VideoRow[]; onChanged: () => void }) {
  const flagged = videos.filter((v) => v.privacy_status === "flagged");
  const unchecked = videos.filter((v) => !v.privacy_status || v.privacy_status === "unchecked");
  const approve = async (id: string, status: string) => {
    const { error } = await sb.from("video_library_items").update({ privacy_status: status, approved_at: new Date().toISOString() }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    await sb.from("video_library_audit_events").insert({ video_id: id, action: "privacy_approval", event_summary: `Privacy approved → ${status}` , metadata: { status } });
    toast.success(`Updated to ${status}`); onChanged();
  };
  return (
    <Card className="tech-card">
      <CardHeader className="pb-2"><CardTitle className="text-sm">Privacy review</CardTitle></CardHeader>
      <CardContent className="text-xs space-y-3">
        <p className="text-muted-foreground">
          Run a privacy scan from the Library tab. The scan flags emails, phone numbers, payment references, IBANs, API keys, JWTs, health/financial/confidential keywords. Flagged videos cannot be approved for customer, buyer or adviser visibility until reviewed.
        </p>
        <div>
          <p className="font-medium mb-1">Flagged ({flagged.length})</p>
          {flagged.length === 0 && <p className="text-muted-foreground">Nothing flagged.</p>}
          {flagged.map((v) => (
            <div key={v.id} className="border border-red-500/30 rounded p-2 mb-1 flex items-center gap-2 flex-wrap">
              <span className="font-medium">{v.title}</span>
              <Badge variant="outline" className="text-[10px]">{v.audience_type}</Badge>
              <span className="ml-auto flex gap-1">
                <Button size="sm" variant="outline" onClick={() => approve(v.id, "approved_internal")}>Approve internal</Button>
                <Button size="sm" variant="outline" onClick={() => approve(v.id, "approved_customer")}>Approve customer</Button>
                <Button size="sm" variant="outline" onClick={() => approve(v.id, "approved_buyer")}>Approve buyer</Button>
                <Button size="sm" variant="outline" onClick={() => approve(v.id, "blocked")}>Block</Button>
              </span>
            </div>
          ))}
        </div>
        <div>
          <p className="font-medium mb-1">Unchecked ({unchecked.length})</p>
          {unchecked.length === 0 && <p className="text-muted-foreground">All videos scanned.</p>}
          {unchecked.map((v) => (
            <div key={v.id} className="border border-border/40 rounded p-2 mb-1 text-muted-foreground">
              {v.title} — run privacy scan from Library tab.
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function EvidencePanel({ videos }: { videos: VideoRow[] }) {
  const ready = videos.filter((v) =>
    (v.transcript_segment_count ?? 0) > 0 &&
    !!v.external_url &&
    (v.privacy_status === "approved_buyer" || v.privacy_status === "approved_internal" || v.privacy_status === "approved_customer") &&
    (v.module_coverage?.length || v.dashboard_area)
  );
  const blockers = videos.filter((v) => !ready.includes(v));
  return (
    <Card className="tech-card">
      <CardHeader className="pb-2"><CardTitle className="text-sm">Buyer / adviser handover evidence</CardTitle></CardHeader>
      <CardContent className="text-xs space-y-3">
        <p className="text-muted-foreground">A video qualifies as handover evidence when: searchable transcript exists, approved external link exists, privacy approved, and module/area coverage is mapped.</p>
        <div>
          <p className="font-medium mb-1 text-emerald-300">Ready ({ready.length})</p>
          {ready.length === 0 && <p className="text-muted-foreground">No videos yet meet all handover criteria.</p>}
          {ready.map((v) => (
            <div key={v.id} className="border border-emerald-500/30 rounded p-2 mb-1 flex items-center gap-2 flex-wrap">
              <span className="font-medium">{v.title}</span>
              <Badge variant="outline" className="text-[10px]">{v.audience_type}</Badge>
              <Badge variant="outline" className="text-[10px]">{v.transcript_segment_count} seg</Badge>
              <Badge variant="outline" className="text-[10px]">privacy:{v.privacy_status}</Badge>
              {v.external_url && <a className="ml-auto text-primary" href={v.external_url} target="_blank" rel="noreferrer">Open</a>}
            </div>
          ))}
        </div>
        <div>
          <p className="font-medium mb-1">Blocked / incomplete ({blockers.length})</p>
          {blockers.map((v) => (
            <div key={v.id} className="border border-border/40 rounded p-2 mb-1 text-muted-foreground flex flex-wrap gap-2">
              <span>{v.title}</span>
              {(v.transcript_segment_count ?? 0) === 0 && <Badge variant="outline" className="text-[10px]">no transcript</Badge>}
              {!v.external_url && <Badge variant="outline" className="text-[10px]">no external link</Badge>}
              {(!v.privacy_status || v.privacy_status === "unchecked" || v.privacy_status === "flagged" || v.privacy_status === "blocked") && <Badge variant="outline" className="text-[10px]">privacy:{v.privacy_status ?? "unchecked"}</Badge>}
              {!(v.module_coverage?.length || v.dashboard_area) && <Badge variant="outline" className="text-[10px]">no area / module coverage</Badge>}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
