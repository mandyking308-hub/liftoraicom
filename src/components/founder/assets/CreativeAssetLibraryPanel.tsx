import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Image as ImageIcon, ShieldCheck, Plus, ExternalLink, AlertTriangle } from "lucide-react";

const NEON_CANDY_ID = "b47c4b11-9a96-4af9-9aec-2f5218de9182";

const ASSET_TYPES = [
  "logo","brand_image","product_image","music_track","music_video","short_clip",
  "long_video","caption_block","hook_bank","testimonial","case_study","founder_photo",
  "document","lead_magnet","landing_page_mockup","ad_creative",
];

type Business = { id: string; name: string };
type Asset = {
  id: string; asset_type: string; asset_name: string; asset_status: string;
  storage_url: string | null; external_url: string | null; thumbnail_url: string | null;
  description: string | null; tags: string[] | null; usage_rights: string | null;
  approved_for_social: boolean; approved_for_ads: boolean; approved_for_proposals: boolean; approved_for_website: boolean;
  expires_at: string | null; created_at: string;
};
type Usage = { id: string; asset_id: string; used_in_table: string | null; usage_type: string | null; platform_key: string | null; used_at: string };

export default function CreativeAssetLibraryPanel() {
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [businessId, setBusinessId] = useState(NEON_CANDY_ID);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [usage, setUsage] = useState<Usage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [filterType, setFilterType] = useState<string>("");
  const [filterApproval, setFilterApproval] = useState<string>("");
  const [search, setSearch] = useState("");

  const [newType, setNewType] = useState("brand_image");
  const [newName, setNewName] = useState("");
  const [newUrl, setNewUrl] = useState("");
  const [newRights, setNewRights] = useState("");

  useEffect(() => {
    supabase.from("businesses").select("id,name").order("name").then(({ data }) => setBusinesses((data ?? []) as Business[]));
  }, []);

  const reload = async (bid: string) => {
    const [a, u] = await Promise.all([
      (supabase as any).from("creative_asset_library").select("*").eq("business_id", bid).order("created_at", { ascending: false }).limit(200),
      (supabase as any).from("creative_asset_usage").select("*").eq("business_id", bid).order("used_at", { ascending: false }).limit(50),
    ]);
    setAssets((a.data ?? []) as Asset[]);
    setUsage((u.data ?? []) as Usage[]);
  };
  useEffect(() => { reload(businessId); }, [businessId]);

  const addAsset = async () => {
    if (!newName.trim()) return;
    setLoading(true); setError(null);
    try {
      const { error } = await (supabase as any).from("creative_asset_library").insert({
        business_id: businessId,
        asset_type: newType,
        asset_name: newName.trim(),
        external_url: newUrl.trim() || null,
        usage_rights: newRights.trim() || null,
        asset_status: "draft",
        tags: [],
      });
      if (error) throw error;
      setNewName(""); setNewUrl(""); setNewRights("");
      await reload(businessId);
    } catch (e: any) { setError(e?.message ?? String(e)); } finally { setLoading(false); }
  };

  const filtered = useMemo(() => {
    return assets.filter((a) => {
      if (filterType && a.asset_type !== filterType) return false;
      if (filterApproval === "social" && !a.approved_for_social) return false;
      if (filterApproval === "ads" && !a.approved_for_ads) return false;
      if (filterApproval === "proposals" && !a.approved_for_proposals) return false;
      if (filterApproval === "website" && !a.approved_for_website) return false;
      if (search && !(a.asset_name.toLowerCase().includes(search.toLowerCase()) || (a.description ?? "").toLowerCase().includes(search.toLowerCase()))) return false;
      return true;
    });
  }, [assets, filterType, filterApproval, search]);

  const counts = useMemo(() => {
    const present = new Set(assets.map((a) => a.asset_type));
    const missing = ASSET_TYPES.filter((t) => !present.has(t));
    return {
      total: assets.length,
      approved_social: assets.filter((a) => a.approved_for_social).length,
      approved_ads: assets.filter((a) => a.approved_for_ads).length,
      approved_proposals: assets.filter((a) => a.approved_for_proposals).length,
      missing_rights: assets.filter((a) => !a.usage_rights).length,
      missing_types: missing,
    };
  }, [assets]);

  return (
    <Card className="bg-card border-border/50">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center justify-between gap-2">
          <span className="flex items-center gap-2"><ImageIcon size={14} className="text-primary" /> Creative Asset Library</span>
          <Badge variant="secondary" className="bg-yellow-500/10 text-yellow-300 border-yellow-500/30 text-[10px]">
            <ShieldCheck size={10} className="mr-1" /> No external upload · No publish · No delete
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-end gap-2">
          <div className="min-w-[200px]">
            <Label className="text-xs text-muted-foreground">Business</Label>
            <select className="w-full bg-background border border-border/50 rounded px-2 py-1.5 text-sm" value={businessId} onChange={(e) => setBusinessId(e.target.value)}>
              {businesses.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Type</Label>
            <select className="bg-background border border-border/50 rounded px-2 py-1.5 text-sm" value={filterType} onChange={(e) => setFilterType(e.target.value)}>
              <option value="">All types</option>
              {ASSET_TYPES.map((t) => <option key={t} value={t}>{t.replace(/_/g, " ")}</option>)}
            </select>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Approved for</Label>
            <select className="bg-background border border-border/50 rounded px-2 py-1.5 text-sm" value={filterApproval} onChange={(e) => setFilterApproval(e.target.value)}>
              <option value="">Any</option>
              <option value="social">Social</option>
              <option value="ads">Ads</option>
              <option value="proposals">Proposals</option>
              <option value="website">Website</option>
            </select>
          </div>
          <Input placeholder="Search…" value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-[220px]" />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center text-xs">
          {[
            { l: "Total assets", v: counts.total },
            { l: "Approved social", v: counts.approved_social },
            { l: "Approved ads", v: counts.approved_ads },
            { l: "Approved proposals", v: counts.approved_proposals },
            { l: "Missing rights", v: counts.missing_rights, warn: counts.missing_rights > 0 },
          ].map((t: any) => (
            <div key={t.l} className="p-2 rounded border border-border/40 bg-secondary/30">
              <div className={`text-lg font-semibold ${t.warn ? "text-yellow-400" : ""}`}>{t.v}</div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-wide">{t.l}</div>
            </div>
          ))}
        </div>

        {counts.missing_types.length > 0 && (
          <div className="text-[11px] text-muted-foreground p-2 rounded border border-yellow-500/30 bg-yellow-500/5 flex items-start gap-2">
            <AlertTriangle size={12} className="text-yellow-400 mt-0.5" />
            <span>Missing asset types for this business: <span className="text-foreground">{counts.missing_types.join(", ")}</span></span>
          </div>
        )}

        <div className="p-3 rounded border border-border/40 bg-secondary/20 space-y-2">
          <div className="text-xs font-semibold flex items-center gap-1"><Plus size={12} /> Register asset (record only — no upload)</div>
          <div className="grid sm:grid-cols-4 gap-2">
            <select className="bg-background border border-border/50 rounded px-2 py-1.5 text-sm" value={newType} onChange={(e) => setNewType(e.target.value)}>
              {ASSET_TYPES.map((t) => <option key={t} value={t}>{t.replace(/_/g, " ")}</option>)}
            </select>
            <Input placeholder="Asset name" value={newName} onChange={(e) => setNewName(e.target.value)} />
            <Input placeholder="External URL (optional)" value={newUrl} onChange={(e) => setNewUrl(e.target.value)} />
            <Input placeholder="Usage rights" value={newRights} onChange={(e) => setNewRights(e.target.value)} />
          </div>
          <Button size="sm" disabled={loading || !newName.trim()} onClick={addAsset}>
            {loading ? <Loader2 size={12} className="animate-spin mr-1" /> : <Plus size={12} className="mr-1" />}
            Register asset
          </Button>
        </div>

        {error && <div className="text-xs text-destructive">{error}</div>}

        <div>
          <div className="text-xs font-semibold mb-1">Assets ({filtered.length})</div>
          <div className="space-y-1 max-h-80 overflow-auto">
            {filtered.length === 0 && <div className="text-[11px] text-muted-foreground">No assets match.</div>}
            {filtered.map((a) => (
              <div key={a.id} className="text-xs flex items-center justify-between gap-2 p-2 rounded border border-border/30 bg-background/40">
                <div className="truncate">
                  <span className="text-muted-foreground">[{a.asset_type}]</span> {a.asset_name}
                  {a.external_url && <a href={a.external_url} target="_blank" rel="noreferrer" className="ml-2 text-primary inline-flex items-center gap-0.5"><ExternalLink size={10} /></a>}
                </div>
                <div className="flex flex-wrap gap-1 shrink-0">
                  <Badge variant="secondary" className="text-[9px]">{a.asset_status}</Badge>
                  {a.approved_for_social && <Badge variant="secondary" className="text-[9px] bg-green-500/15 text-green-400">social</Badge>}
                  {a.approved_for_ads && <Badge variant="secondary" className="text-[9px] bg-green-500/15 text-green-400">ads</Badge>}
                  {a.approved_for_proposals && <Badge variant="secondary" className="text-[9px] bg-green-500/15 text-green-400">proposals</Badge>}
                  {a.approved_for_website && <Badge variant="secondary" className="text-[9px] bg-green-500/15 text-green-400">website</Badge>}
                  {!a.usage_rights && <Badge variant="secondary" className="text-[9px] bg-yellow-500/15 text-yellow-300">no rights</Badge>}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <div className="text-xs font-semibold mb-1">Recent usage ({usage.length})</div>
          <div className="space-y-1 max-h-40 overflow-auto">
            {usage.length === 0 && <div className="text-[11px] text-muted-foreground">No usage logged yet.</div>}
            {usage.map((u) => (
              <div key={u.id} className="text-[11px] flex items-center justify-between gap-2 p-1.5 rounded border border-border/20 bg-background/30">
                <span className="truncate text-muted-foreground">{u.used_in_table ?? "—"} · {u.usage_type ?? "—"} {u.platform_key ? `· ${u.platform_key}` : ""}</span>
                <span className="text-[10px] text-muted-foreground shrink-0">{new Date(u.used_at).toLocaleDateString()}</span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}