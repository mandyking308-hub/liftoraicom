import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, FileText, Megaphone, ShieldCheck, Plus, ExternalLink } from "lucide-react";

const NEON_CANDY_ID = "b47c4b11-9a96-4af9-9aec-2f5218de9182";

const ASSET_TYPES = [
  "blog_post","newsletter","landing_page_copy","lead_magnet","website_section",
  "product_page","service_page","FAQ","case_study","ad_copy","video_script",
  "webinar_outline","sales_page","email_sequence",
];

const CAMPAIGN_TYPES = [
  "lead_generation","product_launch","waitlist","webinar","social_growth",
  "newsletter_growth","paid_ads","organic_content","partnership","creator_campaign",
  "donor_campaign","property_campaign",
];

type Business = { id: string; name: string };
type Asset = { id: string; asset_type: string; asset_title: string; asset_status: string; approval_status: string; publish_allowed: boolean; created_at: string };
type Brief = { id: string; campaign_name: string; campaign_type: string; campaign_goal: string | null; approval_status: string; launch_allowed: boolean; created_at: string };

export default function MarketingContentFunnelPanel() {
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [businessId, setBusinessId] = useState(NEON_CANDY_ID);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [briefs, setBriefs] = useState<Brief[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [assetType, setAssetType] = useState("blog_post");
  const [topic, setTopic] = useState("");
  const [goal, setGoal] = useState("");

  const [campaignType, setCampaignType] = useState("lead_generation");
  const [campaignGoal, setCampaignGoal] = useState("");

  useEffect(() => {
    supabase.from("businesses").select("id,name").order("name").then(({ data }) => setBusinesses((data ?? []) as Business[]));
  }, []);

  const reload = async (bid: string) => {
    const [a, b] = await Promise.all([
      (supabase as any).from("marketing_content_assets").select("*").eq("business_id", bid).order("created_at", { ascending: false }).limit(50),
      (supabase as any).from("marketing_campaign_briefs").select("*").eq("business_id", bid).order("created_at", { ascending: false }).limit(50),
    ]);
    setAssets((a.data ?? []) as Asset[]);
    setBriefs((b.data ?? []) as Brief[]);
  };
  useEffect(() => { reload(businessId); }, [businessId]);

  const generateAsset = async () => {
    setLoading(true); setError(null);
    try {
      const { data, error } = await supabase.functions.invoke("marketing-content-generate", {
        body: { business_id: businessId, asset_type: assetType, topic, goal, dry_run: false, confirmation: "CREATE MARKETING CONTENT ASSET" },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      setTopic(""); setGoal("");
      await reload(businessId);
    } catch (e: any) { setError(e?.message ?? String(e)); } finally { setLoading(false); }
  };

  const generateBrief = async () => {
    setLoading(true); setError(null);
    try {
      const { data, error } = await supabase.functions.invoke("campaign-brief-generate", {
        body: { business_id: businessId, campaign_type: campaignType, goal: campaignGoal, dry_run: false, confirmation: "CREATE MARKETING CAMPAIGN BRIEF" },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      setCampaignGoal("");
      await reload(businessId);
    } catch (e: any) { setError(e?.message ?? String(e)); } finally { setLoading(false); }
  };

  const counts = {
    blog: assets.filter((a) => a.asset_type === "blog_post").length,
    newsletter: assets.filter((a) => a.asset_type === "newsletter").length,
    landing: assets.filter((a) => a.asset_type === "landing_page_copy" || a.asset_type === "sales_page").length,
    lead_magnet: assets.filter((a) => a.asset_type === "lead_magnet").length,
    ad: assets.filter((a) => a.asset_type === "ad_copy").length,
  };

  return (
    <Card className="bg-card border-border/50">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center justify-between gap-2">
          <span className="flex items-center gap-2"><Megaphone size={14} className="text-primary" /> Marketing / Content / Funnel — drafts &amp; campaign briefs</span>
          <Badge variant="secondary" className="bg-yellow-500/10 text-yellow-300 border-yellow-500/30 text-[10px]">
            <ShieldCheck size={10} className="mr-1" /> No publish · No send · No ad spend
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-end gap-2">
          <div className="min-w-[220px]">
            <Label className="text-xs text-muted-foreground">Business</Label>
            <select className="w-full bg-background border border-border/50 rounded px-2 py-1.5 text-sm" value={businessId} onChange={(e) => setBusinessId(e.target.value)}>
              {businesses.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
          <Link to="/founder/social" className="text-[11px] text-primary hover:underline flex items-center gap-1"><ExternalLink size={11} /> Social Content Factory</Link>
          <Link to="/founder/knowledge" className="text-[11px] text-primary hover:underline flex items-center gap-1"><ExternalLink size={11} /> Business Knowledge Brain</Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center text-xs">
          {[
            { l: "Blogs", v: counts.blog },
            { l: "Newsletters", v: counts.newsletter },
            { l: "Landing pages", v: counts.landing },
            { l: "Lead magnets", v: counts.lead_magnet },
            { l: "Ad briefs", v: counts.ad },
          ].map((t) => (
            <div key={t.l} className="p-2 rounded border border-border/40 bg-secondary/30">
              <div className="text-lg font-semibold">{t.v}</div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-wide">{t.l}</div>
            </div>
          ))}
        </div>

        <div className="grid lg:grid-cols-2 gap-3">
          <div className="p-3 rounded border border-border/40 bg-secondary/20 space-y-2">
            <div className="text-xs font-semibold flex items-center gap-1"><FileText size={12} /> Generate content asset draft</div>
            <select className="w-full bg-background border border-border/50 rounded px-2 py-1.5 text-sm" value={assetType} onChange={(e) => setAssetType(e.target.value)}>
              {ASSET_TYPES.map((t) => <option key={t} value={t}>{t.replace(/_/g, " ")}</option>)}
            </select>
            <Input placeholder="Topic (e.g. how Liftor scales outbound for SMB)" value={topic} onChange={(e) => setTopic(e.target.value)} />
            <Input placeholder="Goal (optional)" value={goal} onChange={(e) => setGoal(e.target.value)} />
            <Button size="sm" disabled={loading || !topic} onClick={generateAsset}>
              {loading ? <Loader2 size={12} className="animate-spin mr-1" /> : <Plus size={12} className="mr-1" />}
              Create draft (no publish)
            </Button>
          </div>
          <div className="p-3 rounded border border-border/40 bg-secondary/20 space-y-2">
            <div className="text-xs font-semibold flex items-center gap-1"><Megaphone size={12} /> Generate campaign brief</div>
            <select className="w-full bg-background border border-border/50 rounded px-2 py-1.5 text-sm" value={campaignType} onChange={(e) => setCampaignType(e.target.value)}>
              {CAMPAIGN_TYPES.map((t) => <option key={t} value={t}>{t.replace(/_/g, " ")}</option>)}
            </select>
            <Input placeholder="Goal (e.g. 200 booked calls in Q3)" value={campaignGoal} onChange={(e) => setCampaignGoal(e.target.value)} />
            <Button size="sm" disabled={loading} onClick={generateBrief}>
              {loading ? <Loader2 size={12} className="animate-spin mr-1" /> : <Plus size={12} className="mr-1" />}
              Create brief (no launch)
            </Button>
          </div>
        </div>

        {error && <div className="text-xs text-destructive">{error}</div>}

        <div className="grid lg:grid-cols-2 gap-3">
          <div>
            <div className="text-xs font-semibold mb-1">Recent content assets</div>
            <div className="space-y-1 max-h-72 overflow-auto">
              {assets.length === 0 && <div className="text-[11px] text-muted-foreground">No drafts yet.</div>}
              {assets.map((a) => (
                <div key={a.id} className="text-xs flex items-center justify-between gap-2 p-2 rounded border border-border/30 bg-background/40">
                  <div className="truncate">
                    <span className="text-muted-foreground">[{a.asset_type}]</span> {a.asset_title}
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Badge variant="secondary" className="text-[9px]">{a.approval_status}</Badge>
                    <Badge variant="secondary" className="text-[9px] bg-yellow-500/15 text-yellow-300">publish locked</Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div>
            <div className="text-xs font-semibold mb-1">Recent campaign briefs</div>
            <div className="space-y-1 max-h-72 overflow-auto">
              {briefs.length === 0 && <div className="text-[11px] text-muted-foreground">No briefs yet.</div>}
              {briefs.map((b) => (
                <div key={b.id} className="text-xs flex items-center justify-between gap-2 p-2 rounded border border-border/30 bg-background/40">
                  <div className="truncate">
                    <span className="text-muted-foreground">[{b.campaign_type}]</span> {b.campaign_name}
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Badge variant="secondary" className="text-[9px]">{b.approval_status}</Badge>
                    <Badge variant="secondary" className="text-[9px] bg-yellow-500/15 text-yellow-300">launch locked</Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}