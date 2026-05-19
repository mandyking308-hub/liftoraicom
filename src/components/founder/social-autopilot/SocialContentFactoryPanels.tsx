import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { AlertTriangle, Sparkles, CheckCircle2, Layers, FileText, Wand2 } from "lucide-react";

async function invoke(name: string, body?: any, method: "POST" | "GET" = "POST", query?: Record<string, string>) {
  const url = new URL(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${name}`);
  if (query) Object.entries(query).forEach(([k, v]) => v && url.searchParams.set(k, v));
  const { data: { session } } = await supabase.auth.getSession();
  const res = await fetch(url.toString(), {
    method,
    headers: {
      Authorization: `Bearer ${session?.access_token ?? ""}`,
      "Content-Type": "application/json",
    },
    body: method === "POST" ? JSON.stringify(body ?? {}) : undefined,
  });
  return res.json();
}

function Tile({ label, value, hint }: { label: string; value: any; hint?: string }) {
  return (
    <div className="p-3 rounded bg-secondary/50">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-lg font-semibold">{value ?? "—"}</p>
      {hint && <p className="text-[10px] text-muted-foreground mt-0.5">{hint}</p>}
    </div>
  );
}

export function SocialContentFactoryHealthPanel({ businessId }: { businessId: string }) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const refresh = async () => {
    setLoading(true);
    const r = await invoke("social-content-factory-healthcheck", undefined, "GET", { business_id: businessId });
    setData(r); setLoading(false);
  };
  useEffect(() => { refresh(); /* eslint-disable-next-line */ }, [businessId]);
  return (
    <Card>
      <CardHeader className="flex flex-row justify-between items-center">
        <CardTitle className="text-base flex items-center gap-2"><Sparkles size={16} /> Content Factory Health</CardTitle>
        <Button size="sm" variant="outline" onClick={refresh} disabled={loading}>{loading ? "…" : "Refresh"}</Button>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Tile label="Content packs" value={data?.content_packs_count} />
          <Tile label="Drafts" value={data?.draft_items_count} />
          <Tile label="Need review" value={data?.items_needing_review} />
          <Tile label="Approved" value={data?.approved_items_count} />
          <Tile label="Variants" value={data?.variants_count} />
          <Tile label="Hooks/captions" value={data?.hooks_bank_count} />
          <Tile label="Quality reviews" value={data?.quality_reviews_count} />
          <Tile label="Blocked" value={data?.blocked_content_count} />
          <Tile label="Missing assets" value={data?.missing_asset_count} />
          <Tile label="Compliance warn." value={data?.compliance_warning_count} />
          <Tile label="Ready→calendar" value={data?.ready_for_calendar_generation ? "yes" : "no"} />
          <Tile label="Ready→approval" value={data?.ready_for_approval_flow ? "yes" : "no"} />
        </div>
        <div className="mt-4 p-3 rounded bg-primary/10 border border-primary/30 text-sm">
          <p className="font-semibold flex items-center gap-2"><AlertTriangle size={14} /> Next action</p>
          <p className="text-muted-foreground mt-1">{data?.next_action ?? "—"}</p>
        </div>
      </CardContent>
    </Card>
  );
}

export function SocialContentPackGeneratorPanel({ businessId }: { businessId: string }) {
  const [days, setDays] = useState(30);
  const [platforms, setPlatforms] = useState<string>("instagram,tiktok");
  const [goal, setGoal] = useState("awareness");
  const [startDate, setStartDate] = useState("");
  const [preview, setPreview] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [confirm, setConfirm] = useState("");
  const [result, setResult] = useState<any>(null);

  const onPreview = async () => {
    setLoading(true);
    const r = await invoke("social-content-pack-preview", {
      business_id: businessId, days_count: days,
      platforms: platforms.split(",").map(s => s.trim()).filter(Boolean),
      goal, start_date: startDate || undefined,
    });
    setPreview(r); setLoading(false);
  };
  const onCreate = async () => {
    setCreating(true);
    const r = await invoke("social-content-pack-create", {
      business_id: businessId, days_count: days,
      platforms: platforms.split(",").map(s => s.trim()).filter(Boolean),
      goal, start_date: startDate || undefined,
      dry_run: false, confirmation_phrase: confirm,
    });
    setResult(r); setCreating(false);
  };

  return (
    <Card>
      <CardHeader><CardTitle className="text-base flex items-center gap-2"><Wand2 size={16} /> Pack Generator</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <div><label className="text-xs">Days</label><Input type="number" value={days} onChange={e => setDays(Number(e.target.value))} /></div>
          <div><label className="text-xs">Platforms (csv)</label><Input value={platforms} onChange={e => setPlatforms(e.target.value)} /></div>
          <div><label className="text-xs">Goal</label><Input value={goal} onChange={e => setGoal(e.target.value)} /></div>
          <div><label className="text-xs">Start date</label><Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} /></div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button size="sm" onClick={onPreview} disabled={!businessId || loading}>{loading ? "Previewing…" : "Preview pack"}</Button>
          <Input className="w-72" placeholder='Type "CREATE SOCIAL CONTENT PACK" to confirm' value={confirm} onChange={e => setConfirm(e.target.value)} />
          <Button size="sm" variant="default" onClick={onCreate} disabled={!businessId || creating || confirm !== "CREATE SOCIAL CONTENT PACK"}>
            {creating ? "Creating…" : "Create draft pack"}
          </Button>
        </div>
        {preview && (
          <div className="p-3 rounded bg-secondary/40 text-xs space-y-2">
            <p><strong>Pack:</strong> {preview.pack?.pack_name} · {preview.pack?.days_count}d · confidence {preview.confidence_score}</p>
            <p><strong>Posts:</strong> {preview.proposed_posts?.length} · <strong>Variants:</strong> {preview.proposed_variants?.length}</p>
            {!!preview.missing_assets?.length && <p className="text-yellow-400">Missing assets: {preview.missing_assets.join("; ")}</p>}
            {!!preview.compliance_warnings?.length && <p className="text-yellow-400">Warnings: {preview.compliance_warnings.join("; ")}</p>}
          </div>
        )}
        {result && (
          <div className="p-3 rounded bg-primary/10 border border-primary/30 text-xs">
            {result.ok ? <p className="flex items-center gap-1"><CheckCircle2 size={14} /> Created pack {result.pack?.id} · {result.item_count} items · {result.variant_count} variants</p>
              : <p className="text-destructive">{result.error}</p>}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function SocialContentPackListPanel({ businessId }: { businessId: string }) {
  const [rows, setRows] = useState<any[]>([]);
  useEffect(() => {
    if (!businessId) return;
    supabase.from("social_content_packs" as any).select("*").eq("business_id", businessId)
      .order("created_at", { ascending: false }).limit(20).then(({ data }) => setRows((data as any[]) ?? []));
  }, [businessId]);
  return (
    <Card>
      <CardHeader><CardTitle className="text-base flex items-center gap-2"><Layers size={16} /> Content Packs</CardTitle></CardHeader>
      <CardContent>
        {!rows.length ? <p className="text-sm text-muted-foreground">No packs yet — generate the first one above.</p> : (
          <div className="space-y-2">{rows.map(r => (
            <div key={r.id} className="p-2 rounded bg-secondary/40 text-sm flex justify-between items-center">
              <div>
                <p className="font-medium">{r.pack_name}</p>
                <p className="text-xs text-muted-foreground">{r.pack_type} · {r.days_count}d · {(r.platforms||[]).join(",")}</p>
              </div>
              <div className="flex gap-1 flex-wrap">
                <Badge variant="secondary">{r.pack_status}</Badge>
                <Badge variant="outline">risk: {r.risk_level}</Badge>
                {r.is_test_data && <Badge variant="outline">TEST</Badge>}
              </div>
            </div>
          ))}</div>
        )}
      </CardContent>
    </Card>
  );
}

export function SocialContentPackDetailPanel({ businessId }: { businessId: string }) {
  const [packId, setPackId] = useState("");
  const [items, setItems] = useState<any[]>([]);
  const load = async () => {
    if (!packId) return;
    const { data } = await supabase.from("social_content_pack_items" as any).select("*, social_content_items(*)")
      .eq("pack_id", packId).order("sort_order");
    setItems((data as any[]) ?? []);
  };
  return (
    <Card>
      <CardHeader><CardTitle className="text-base flex items-center gap-2"><FileText size={16} /> Pack Detail</CardTitle></CardHeader>
      <CardContent className="space-y-2">
        <div className="flex gap-2">
          <Input placeholder="pack_id" value={packId} onChange={e => setPackId(e.target.value)} />
          <Button size="sm" onClick={load} disabled={!packId}>Load</Button>
        </div>
        {items.map(it => (
          <div key={it.id} className="p-2 rounded bg-secondary/30 text-xs">
            <p><strong>Day {it.day_number}</strong> · {it.platform} · {it.status}</p>
            <p className="text-muted-foreground line-clamp-2">{(it as any).social_content_items?.caption}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export function SocialPlatformVariantsPanel({ businessId }: { businessId: string }) {
  const [contentId, setContentId] = useState("");
  const [platforms, setPlatforms] = useState("instagram,tiktok,linkedin");
  const [preview, setPreview] = useState<any>(null);
  const onPreview = async () => {
    const r = await invoke("social-platform-variants-preview", {
      business_id: businessId, content_item_id: contentId || undefined,
      platforms: platforms.split(",").map(s => s.trim()).filter(Boolean),
    });
    setPreview(r);
  };
  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Platform Variants</CardTitle></CardHeader>
      <CardContent className="space-y-2">
        <div className="grid md:grid-cols-2 gap-2">
          <Input placeholder="content_item_id (optional)" value={contentId} onChange={e => setContentId(e.target.value)} />
          <Input placeholder="platforms csv" value={platforms} onChange={e => setPlatforms(e.target.value)} />
        </div>
        <Button size="sm" onClick={onPreview} disabled={!businessId}>Preview variants</Button>
        {preview?.variants && (
          <div className="space-y-1 text-xs">
            {preview.variants.map((v: any, i: number) => (
              <div key={i} className="p-2 rounded bg-secondary/30">
                <p><strong>{v.platform}</strong> · {v.variant_type}</p>
                <p className="text-muted-foreground">{v.caption}</p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function SimpleGenPanel({ businessId, title, fn, confirmPhrase }: { businessId: string; title: string; fn: string; confirmPhrase: string }) {
  const [pillar, setPillar] = useState("");
  const [platform, setPlatform] = useState("instagram");
  const [count, setCount] = useState(5);
  const [preview, setPreview] = useState<any>(null);
  const [confirm, setConfirm] = useState("");
  const [result, setResult] = useState<any>(null);
  const run = async (dry: boolean) => {
    const r = await invoke(fn, {
      business_id: businessId, content_pillar_id: pillar || undefined,
      platform, count, dry_run: dry,
      confirmation_phrase: dry ? undefined : confirm,
    });
    if (dry) setPreview(r); else setResult(r);
  };
  return (
    <Card>
      <CardHeader><CardTitle className="text-base">{title}</CardTitle></CardHeader>
      <CardContent className="space-y-2">
        <div className="grid md:grid-cols-3 gap-2">
          <Input placeholder="content_pillar_id (optional)" value={pillar} onChange={e => setPillar(e.target.value)} />
          <Input placeholder="platform" value={platform} onChange={e => setPlatform(e.target.value)} />
          <Input type="number" value={count} onChange={e => setCount(Number(e.target.value))} />
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button size="sm" variant="outline" onClick={() => run(true)} disabled={!businessId}>Preview</Button>
          <Input className="w-72" placeholder={`Type "${confirmPhrase}" to confirm`} value={confirm} onChange={e => setConfirm(e.target.value)} />
          <Button size="sm" onClick={() => run(false)} disabled={confirm !== confirmPhrase}>Save</Button>
        </div>
        {preview && <pre className="text-[10px] bg-secondary/30 p-2 rounded overflow-auto max-h-40">{JSON.stringify(preview, null, 2)}</pre>}
        {result && <p className="text-xs">{result.ok ? `Saved ${result.inserted}` : result.error}</p>}
      </CardContent>
    </Card>
  );
}

export function SocialHooksCaptionsGeneratorPanel({ businessId }: { businessId: string }) {
  return <SimpleGenPanel businessId={businessId} title="Hooks / Captions Generator" fn="social-hooks-captions-generate" confirmPhrase="SAVE GENERATED SOCIAL COPY" />;
}
export function SocialReelScriptGeneratorPanel({ businessId }: { businessId: string }) {
  return <SimpleGenPanel businessId={businessId} title="Reel Script Generator" fn="social-reel-script-generate" confirmPhrase="SAVE SOCIAL REEL SCRIPTS" />;
}
export function SocialCarouselOutlineGeneratorPanel({ businessId }: { businessId: string }) {
  return <SimpleGenPanel businessId={businessId} title="Carousel Outline Generator" fn="social-carousel-outline-generate" confirmPhrase="SAVE SOCIAL CAROUSEL OUTLINES" />;
}

export function SocialContentQualityPanel({ businessId }: { businessId: string }) {
  const [contentId, setContentId] = useState("");
  const [preview, setPreview] = useState<any>(null);
  const [confirm, setConfirm] = useState("");
  const [result, setResult] = useState<any>(null);
  const run = async (dry: boolean) => {
    const r = await invoke("social-content-quality-check", {
      business_id: businessId, content_item_id: contentId || undefined,
      dry_run: dry, confirmation_phrase: dry ? undefined : confirm,
    });
    if (dry) setPreview(r); else setResult(r);
  };
  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Content Quality Check</CardTitle></CardHeader>
      <CardContent className="space-y-2">
        <Input placeholder="content_item_id" value={contentId} onChange={e => setContentId(e.target.value)} />
        <div className="flex gap-2 flex-wrap">
          <Button size="sm" variant="outline" onClick={() => run(true)} disabled={!businessId}>Preview review</Button>
          <Input className="w-72" placeholder='Type "SAVE SOCIAL CONTENT QUALITY REVIEW"' value={confirm} onChange={e => setConfirm(e.target.value)} />
          <Button size="sm" onClick={() => run(false)} disabled={confirm !== "SAVE SOCIAL CONTENT QUALITY REVIEW"}>Save review</Button>
        </div>
        {preview && <pre className="text-[10px] bg-secondary/30 p-2 rounded overflow-auto max-h-40">{JSON.stringify(preview, null, 2)}</pre>}
        {result && <p className="text-xs">{result.ok ? "Saved" : result.error}</p>}
      </CardContent>
    </Card>
  );
}

export function SocialContentFactoryDashboard({ businessId }: { businessId: string }) {
  return (
    <div className="space-y-4">
      <SocialContentFactoryHealthPanel businessId={businessId} />
      <SocialContentPackGeneratorPanel businessId={businessId} />
      <SocialContentPackListPanel businessId={businessId} />
      <SocialContentPackDetailPanel businessId={businessId} />
      <div className="grid md:grid-cols-2 gap-4">
        <SocialPlatformVariantsPanel businessId={businessId} />
        <SocialContentQualityPanel businessId={businessId} />
        <SocialHooksCaptionsGeneratorPanel businessId={businessId} />
        <SocialReelScriptGeneratorPanel businessId={businessId} />
        <SocialCarouselOutlineGeneratorPanel businessId={businessId} />
      </div>
    </div>
  );
}