import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Recycle, Plus, ShieldCheck } from "lucide-react";

const NEON_CANDY_ID = "b47c4b11-9a96-4af9-9aec-2f5218de9182";
const ALL_PLATFORMS = ["instagram","tiktok","youtube_shorts","facebook","linkedin","website_blog"];
const ASSET_TYPES = ["song","music_video","short_clip","long_video","blog","offer","customer_story","product","service","event","founder_note","transcript","image_set"];

type Asset = {
  id: string;
  business_id: string;
  asset_type: string;
  asset_title: string;
  asset_url: string | null;
  campaign_name: string | null;
  release_date: string | null;
};
type Business = { id: string; name: string };

export default function SocialRepurposingEnginePanel() {
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [businessId, setBusinessId] = useState(NEON_CANDY_ID);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [selectedAssetId, setSelectedAssetId] = useState<string>("");
  const [platforms, setPlatforms] = useState<string[]>(["instagram","tiktok","youtube_shorts","facebook"]);
  const [outputCount, setOutputCount] = useState(8);
  const [confirmation, setConfirmation] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // new asset form
  const [newAssetType, setNewAssetType] = useState("song");
  const [newAssetTitle, setNewAssetTitle] = useState("");
  const [newAssetUrl, setNewAssetUrl] = useState("");
  const [newAssetTranscript, setNewAssetTranscript] = useState("");
  const [savingAsset, setSavingAsset] = useState(false);

  useEffect(() => {
    supabase.from("businesses").select("id,name").order("name").then(({ data }) => setBusinesses((data ?? []) as Business[]));
  }, []);

  const reloadAssets = async (bid: string) => {
    const { data } = await (supabase as any).from("social_source_assets").select("id,business_id,asset_type,asset_title,asset_url,campaign_name,release_date").eq("business_id", bid).order("created_at", { ascending: false });
    setAssets((data ?? []) as Asset[]);
    if (data && data.length > 0) setSelectedAssetId(data[0].id);
    else setSelectedAssetId("");
  };

  useEffect(() => { reloadAssets(businessId); }, [businessId]);

  const togglePlatform = (p: string) => setPlatforms((prev) => prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]);

  const addAsset = async () => {
    if (!newAssetTitle.trim()) return;
    setSavingAsset(true);
    try {
      const { error } = await (supabase as any).from("social_source_assets").insert({
        business_id: businessId,
        asset_type: newAssetType,
        asset_title: newAssetTitle.trim(),
        asset_url: newAssetUrl.trim() || null,
        transcript: newAssetTranscript.trim() || null,
      });
      if (error) throw error;
      setNewAssetTitle(""); setNewAssetUrl(""); setNewAssetTranscript("");
      await reloadAssets(businessId);
    } catch (e: any) {
      setError(e?.message ?? String(e));
    } finally { setSavingAsset(false); }
  };

  const run = async (live: boolean) => {
    setLoading(true); setError(null);
    try {
      const { data, error: err } = await supabase.functions.invoke("social-repurpose-generate", {
        body: { source_asset_id: selectedAssetId, target_platforms: platforms, output_count: outputCount, dry_run: !live, confirmation: live ? confirmation : "" },
      });
      if (err) throw err;
      setResult(data);
    } catch (e: any) { setError(e?.message ?? String(e)); }
    finally { setLoading(false); }
  };

  return (
    <Card className="tech-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Recycle className="h-5 w-5 text-primary" /> Social Repurposing Engine
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Turn one source asset (song, video, blog, offer) into many platform-specific drafts. <Badge variant="outline" className="ml-1">No external posting</Badge>
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <Label className="text-xs">Business</Label>
            <select className="mt-1 w-full rounded-md border border-border bg-background p-2 text-sm" value={businessId} onChange={(e) => setBusinessId(e.target.value)}>
              {businesses.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
          <div>
            <Label className="text-xs">Source asset</Label>
            <select className="mt-1 w-full rounded-md border border-border bg-background p-2 text-sm" value={selectedAssetId} onChange={(e) => setSelectedAssetId(e.target.value)}>
              <option value="">— select asset —</option>
              {assets.map((a) => <option key={a.id} value={a.id}>{a.asset_type}: {a.asset_title}</option>)}
            </select>
          </div>
        </div>

        <div className="rounded-md border border-border/60 bg-card/40 p-3 space-y-2">
          <div className="text-sm font-medium flex items-center gap-2"><Plus className="h-4 w-4" /> Add source asset</div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            <select className="rounded-md border border-border bg-background p-2 text-sm" value={newAssetType} onChange={(e) => setNewAssetType(e.target.value)}>
              {ASSET_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
            <Input placeholder="Title (e.g. Boom in My Step)" value={newAssetTitle} onChange={(e) => setNewAssetTitle(e.target.value)} />
            <Input placeholder="URL (optional)" value={newAssetUrl} onChange={(e) => setNewAssetUrl(e.target.value)} />
          </div>
          <Input placeholder="Transcript / notes (optional)" value={newAssetTranscript} onChange={(e) => setNewAssetTranscript(e.target.value)} />
          <Button size="sm" onClick={addAsset} disabled={savingAsset || !newAssetTitle.trim()}>
            {savingAsset ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save asset"}
          </Button>
        </div>

        <div>
          <Label className="text-xs">Target platforms</Label>
          <div className="mt-1 flex flex-wrap gap-1">
            {ALL_PLATFORMS.map((p) => (
              <Button key={p} type="button" size="sm" variant={platforms.includes(p) ? "default" : "outline"} onClick={() => togglePlatform(p)}>{p}</Button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-end">
          <div>
            <Label className="text-xs">Outputs</Label>
            <Input type="number" min={1} max={50} value={outputCount} onChange={(e) => setOutputCount(Number(e.target.value))} />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => run(false)} disabled={loading || !selectedAssetId} size="sm">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Preview repurpose (dry-run)"}
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Input
            placeholder='Type "CREATE REPURPOSED SOCIAL POSTS" to enable live'
            value={confirmation}
            onChange={(e) => setConfirmation(e.target.value)}
            className="max-w-md"
          />
          <Button onClick={() => run(true)} disabled={loading || confirmation !== "CREATE REPURPOSED SOCIAL POSTS" || !selectedAssetId} size="sm" variant="destructive">
            Create drafts (live, internal only)
          </Button>
        </div>

        {error && <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}

        {result && (
          <div className="space-y-3">
            <div className="rounded-md border border-border/60 bg-card/40 p-3">
              <div className="flex items-center gap-2 text-sm font-medium">
                <ShieldCheck className="h-4 w-4 text-primary" /> Mode: {result.mode} · Planned: {result.planned_outputs} · Inserted: {result.inserted_drafts}
              </div>
              <div className="mt-1 text-xs text-muted-foreground">
                {result.asset?.type}: {result.asset?.title} → {(result.target_platforms ?? []).join(", ")}
              </div>
            </div>
            <div className="space-y-2">
              {result.preview?.map((d: any, i: number) => (
                <div key={i} className="rounded-md border border-border/60 bg-card/40 p-3 text-sm">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">{d.platform_key}</Badge>
                      <Badge variant="outline">{d.post_type}</Badge>
                    </div>
                    <Badge variant="outline">draft · no publish</Badge>
                  </div>
                  {d.hook && <div className="mt-2 text-xs"><span className="font-medium">Hook:</span> {d.hook}</div>}
                  {d.caption && <div className="mt-1 text-xs"><span className="font-medium">Caption:</span> {d.caption}</div>}
                  {d.video_script && <pre className="mt-2 whitespace-pre-wrap rounded bg-background/50 p-2 text-[11px] text-muted-foreground">{d.video_script}</pre>}
                  {Array.isArray(d.carousel_slides) && d.carousel_slides.length > 0 && (
                    <div className="mt-2 text-xs text-muted-foreground">Carousel: {d.carousel_slides.map((s: any) => `${s.slide}. ${s.text}`).join(" · ")}</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}