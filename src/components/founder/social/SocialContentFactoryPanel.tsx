import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Calendar, Sparkles, ShieldCheck } from "lucide-react";

type Business = { id: string; name: string };
type Result = {
  status: string;
  mode: "dry_run" | "live";
  business: { id: string; name: string };
  calendar_preview: any;
  preview_drafts: any[];
  total_drafts: number;
  inserted_drafts: number;
  platforms: string[];
  days: number;
  topics: string[];
  safety_audit: any;
};

const ALL_PLATFORMS = ["instagram","tiktok","youtube_shorts","facebook","linkedin","website_blog"];
const NEON_CANDY_ID = "b47c4b11-9a96-4af9-9aec-2f5218de9182";

export default function SocialContentFactoryPanel() {
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [businessId, setBusinessId] = useState<string>(NEON_CANDY_ID);
  const [days, setDays] = useState<number>(30);
  const [platforms, setPlatforms] = useState<string[]>(["instagram","tiktok","youtube_shorts","facebook"]);
  const [confirmation, setConfirmation] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabase.from("businesses").select("id,name").order("name").then(({ data }) => {
      setBusinesses((data ?? []) as Business[]);
    });
  }, []);

  const togglePlatform = (p: string) => {
    setPlatforms((prev) => (prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]));
  };

  const run = async (live: boolean) => {
    setLoading(true); setError(null);
    try {
      const { data, error: err } = await supabase.functions.invoke("social-content-pack-generate", {
        body: { business_id: businessId, days, platforms, dry_run: !live, confirmation: live ? confirmation : "" },
      });
      if (err) throw err;
      setResult(data as Result);
    } catch (e: any) {
      setError(e?.message ?? String(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="tech-card">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" /> Social Content Factory
            </CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              Generate 7/14/30-day internal content packs — calendars, post drafts, hooks, captions, hashtags, reel scripts, carousel outlines, visual prompts. <Badge variant="outline" className="ml-1">No external posting</Badge>
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <Label className="text-xs">Business</Label>
            <select className="mt-1 w-full rounded-md border border-border bg-background p-2 text-sm" value={businessId} onChange={(e) => setBusinessId(e.target.value)}>
              {businesses.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
          <div>
            <Label className="text-xs">Days</Label>
            <div className="mt-1 flex gap-1">
              {[7,14,30].map((n) => (
                <Button key={n} type="button" size="sm" variant={days === n ? "default" : "outline"} onClick={() => setDays(n)}>{n}d</Button>
              ))}
            </div>
          </div>
          <div>
            <Label className="text-xs">Platforms</Label>
            <div className="mt-1 flex flex-wrap gap-1">
              {ALL_PLATFORMS.map((p) => (
                <Button key={p} type="button" size="sm" variant={platforms.includes(p) ? "default" : "outline"} onClick={() => togglePlatform(p)}>{p}</Button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={() => run(false)} disabled={loading || !businessId} size="sm">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Preview pack (dry-run)"}
          </Button>
          <Input
            placeholder='Type "CREATE SOCIAL CONTENT PACK" to enable live'
            value={confirmation}
            onChange={(e) => setConfirmation(e.target.value)}
            className="max-w-sm"
          />
          <Button onClick={() => run(true)} disabled={loading || confirmation !== "CREATE SOCIAL CONTENT PACK" || !businessId} size="sm" variant="destructive">
            Create drafts (live, internal only)
          </Button>
        </div>

        {error && <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}

        {result && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Stat label="Mode" value={result.mode} />
              <Stat label="Days" value={result.days} />
              <Stat label="Total drafts" value={result.total_drafts} />
              <Stat label="Inserted" value={result.inserted_drafts} />
            </div>
            <div className="rounded-md border border-border/60 bg-card/40 p-3">
              <div className="flex items-center gap-2 text-sm font-medium">
                <ShieldCheck className="h-4 w-4 text-primary" /> Safety
              </div>
              <div className="mt-1 text-xs text-muted-foreground">
                no_external_post · no_external_dm · no_external_api_mutation · no_scheduling
              </div>
            </div>
            <div className="rounded-md border border-border/60 bg-card/40 p-3">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Calendar className="h-4 w-4 text-primary" /> {result.calendar_preview?.calendar_name}
              </div>
              <div className="mt-1 text-xs text-muted-foreground">{result.calendar_preview?.strategy_summary}</div>
              <div className="mt-2 flex flex-wrap gap-1">
                {(result.platforms ?? []).map((p) => <Badge key={p} variant="secondary">{p}</Badge>)}
              </div>
              <div className="mt-2 flex flex-wrap gap-1">
                {(result.topics ?? []).map((t) => <Badge key={t} variant="outline">{t}</Badge>)}
              </div>
            </div>

            <div className="space-y-2">
              <div className="text-sm font-medium">Preview drafts ({result.preview_drafts.length} of {result.total_drafts})</div>
              {result.preview_drafts.map((d, i) => (
                <div key={i} className="rounded-md border border-border/60 bg-card/40 p-3 text-sm">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">{d.platform_key}</Badge>
                      <Badge variant="outline">{d.post_type}</Badge>
                      <span className="text-xs text-muted-foreground">{d.post_date} · {d.suggested_time}</span>
                    </div>
                    <Badge variant="outline">draft · no publish</Badge>
                  </div>
                  <div className="mt-2 text-xs"><span className="font-medium">Hook:</span> {d.hook}</div>
                  <div className="mt-1 text-xs"><span className="font-medium">Caption:</span> {d.caption}</div>
                  <div className="mt-1 text-xs"><span className="font-medium">CTA:</span> {d.cta}</div>
                  {Array.isArray(d.hashtags) && d.hashtags.length > 0 && (
                    <div className="mt-1 text-xs text-muted-foreground">{d.hashtags.join(" ")}</div>
                  )}
                  {d.video_script && (
                    <pre className="mt-2 whitespace-pre-wrap rounded bg-background/50 p-2 text-[11px] text-muted-foreground">{d.video_script}</pre>
                  )}
                  {Array.isArray(d.carousel_slides) && d.carousel_slides.length > 0 && (
                    <div className="mt-2 text-xs text-muted-foreground">
                      Carousel: {d.carousel_slides.map((s: any) => `${s.slide}. ${s.text}`).join(" · ")}
                    </div>
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

function Stat({ label, value }: { label: string; value: any }) {
  return (
    <div className="rounded-md border border-border/60 bg-card/40 p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 text-2xl font-semibold">{String(value)}</div>
    </div>
  );
}