import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, ExternalLink, Network, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const sb: any = supabase as any;
const ANY = "__any__";

type NetworkRow = {
  id: string;
  network_name: string;
  category: string;
  priority_tier: number;
  region: string;
  audience: string | null;
  website_url: string | null;
  source_url: string | null;
  source_status: string;
  access_mode: string;
  inheritor_focus: boolean;
  next_gen_focus: boolean;
  family_office_focus: boolean;
  philanthropy_focus: boolean;
  impact_investing_focus: boolean;
  membership_size_note: string | null;
  ghat_route_notes: string | null;
  status: string;
  last_verified_at: string | null;
};

async function fetchNetworks(): Promise<NetworkRow[]> {
  const { data, error } = await sb
    .from("philanthropy_network_registry")
    .select("*")
    .eq("status", "active")
    .order("priority_tier", { ascending: true })
    .order("network_name", { ascending: true })
    .limit(500);
  if (error) throw error;
  return (data ?? []) as NetworkRow[];
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <Card className="tech-card p-3">
      <p className="text-[10px] uppercase text-muted-foreground">{label}</p>
      <p className="text-xl font-bold">{value}</p>
    </Card>
  );
}

function sourceBadge(status: string) {
  if (status === "official_site_verified") {
    return <Badge variant="outline" className="text-[10px] border-emerald-500/30 text-emerald-300"><ShieldCheck className="h-3 w-3 mr-1" />Official site checked</Badge>;
  }
  if (status === "reputable_directory_current") {
    return <Badge variant="outline" className="text-[10px]">Current directory</Badge>;
  }
  if (status === "historical_directory_needs_refresh") {
    return <Badge variant="outline" className="text-[10px] border-yellow-500/30 text-yellow-300"><AlertTriangle className="h-3 w-3 mr-1" />Historical — refresh</Badge>;
  }
  return <Badge variant="outline" className="text-[10px] border-yellow-500/30 text-yellow-300"><AlertTriangle className="h-3 w-3 mr-1" />Needs verification</Badge>;
}

function yesNoFilter(value: string, rowValue: boolean) {
  if (value === ANY) return true;
  return value === "yes" ? rowValue : !rowValue;
}

export default function NetworkRegistryTab() {
  const q = useQuery({ queryKey: ["bi-network-registry"], queryFn: fetchNetworks });
  const [search, setSearch] = useState("");
  const [tier, setTier] = useState(ANY);
  const [region, setRegion] = useState(ANY);
  const [category, setCategory] = useState(ANY);
  const [source, setSource] = useState(ANY);
  const [inheritor, setInheritor] = useState(ANY);
  const [nextGen, setNextGen] = useState(ANY);
  const [familyOffice, setFamilyOffice] = useState(ANY);
  const [impact, setImpact] = useState(ANY);

  const all = q.data ?? [];
  const regions = useMemo(() => Array.from(new Set(all.map(r => r.region).filter(Boolean))).sort(), [all]);
  const categories = useMemo(() => Array.from(new Set(all.map(r => r.category).filter(Boolean))).sort(), [all]);
  const sources = useMemo(() => Array.from(new Set(all.map(r => r.source_status).filter(Boolean))).sort(), [all]);

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    return all.filter(r => {
      if (s && ![r.network_name, r.category, r.region, r.audience, r.ghat_route_notes].filter(Boolean).some(v => String(v).toLowerCase().includes(s))) return false;
      if (tier !== ANY && r.priority_tier !== Number(tier)) return false;
      if (region !== ANY && r.region !== region) return false;
      if (category !== ANY && r.category !== category) return false;
      if (source !== ANY && r.source_status !== source) return false;
      if (!yesNoFilter(inheritor, r.inheritor_focus)) return false;
      if (!yesNoFilter(nextGen, r.next_gen_focus)) return false;
      if (!yesNoFilter(familyOffice, r.family_office_focus)) return false;
      if (!yesNoFilter(impact, r.impact_investing_focus)) return false;
      return true;
    });
  }, [all, search, tier, region, category, source, inheritor, nextGen, familyOffice, impact]);

  const counts = useMemo(() => ({
    total: all.length,
    t1: all.filter(r => r.priority_tier === 1).length,
    t2: all.filter(r => r.priority_tier === 2).length,
    t3: all.filter(r => r.priority_tier === 3).length,
    inheritor: all.filter(r => r.inheritor_focus).length,
    nextGen: all.filter(r => r.next_gen_focus).length,
    familyOffice: all.filter(r => r.family_office_focus).length,
    impact: all.filter(r => r.impact_investing_focus).length,
    official: all.filter(r => r.source_status === "official_site_verified").length,
    reverify: all.filter(r => r.source_status.includes("needs") || r.source_status.includes("historical")).length,
  }), [all]);

  if (q.isError) {
    return <Card className="tech-card p-4 text-sm text-destructive">Unable to load the network registry: {(q.error as Error).message}</Card>;
  }

  return (
    <div className="space-y-3">
      <Card className="tech-card p-3 border-yellow-500/30 bg-yellow-500/5">
        <p className="text-xs flex items-start gap-2">
          <Network className="h-4 w-4 text-yellow-300 shrink-0 mt-0.5" />
          <span><strong>Research intelligence only.</strong> Priority means strategic relevance, not permission to contact. Verify current membership/access rules, public routes and any no-solicitation policy before outreach. Network intelligence never overrides Liftor&apos;s separate outreach gate.</span>
        </p>
      </Card>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
        <Stat label="Networks" value={counts.total} />
        <Stat label="Tier 1" value={counts.t1} />
        <Stat label="Tier 2" value={counts.t2} />
        <Stat label="Tier 3" value={counts.t3} />
        <Stat label="Inheritor focus" value={counts.inheritor} />
        <Stat label="Next-gen focus" value={counts.nextGen} />
        <Stat label="Family-office focus" value={counts.familyOffice} />
        <Stat label="Impact focus" value={counts.impact} />
        <Stat label="Official site checked" value={counts.official} />
        <Stat label="Refresh / verify" value={counts.reverify} />
      </div>

      <Card className="tech-card p-3">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
          <Input className="text-xs" placeholder="Search networks…" value={search} onChange={e => setSearch(e.target.value)} />
          <Select value={tier} onValueChange={setTier}><SelectTrigger className="text-xs"><SelectValue placeholder="Tier" /></SelectTrigger><SelectContent><SelectItem value={ANY}>All tiers</SelectItem><SelectItem value="1">Tier 1</SelectItem><SelectItem value="2">Tier 2</SelectItem><SelectItem value="3">Tier 3</SelectItem></SelectContent></Select>
          <Select value={region} onValueChange={setRegion}><SelectTrigger className="text-xs"><SelectValue placeholder="Region" /></SelectTrigger><SelectContent><SelectItem value={ANY}>All regions</SelectItem>{regions.map(x => <SelectItem key={x} value={x}>{x}</SelectItem>)}</SelectContent></Select>
          <Select value={category} onValueChange={setCategory}><SelectTrigger className="text-xs"><SelectValue placeholder="Category" /></SelectTrigger><SelectContent><SelectItem value={ANY}>All categories</SelectItem>{categories.map(x => <SelectItem key={x} value={x}>{x.replaceAll("_", " ")}</SelectItem>)}</SelectContent></Select>
          <Select value={source} onValueChange={setSource}><SelectTrigger className="text-xs"><SelectValue placeholder="Source status" /></SelectTrigger><SelectContent><SelectItem value={ANY}>All source states</SelectItem>{sources.map(x => <SelectItem key={x} value={x}>{x.replaceAll("_", " ")}</SelectItem>)}</SelectContent></Select>
          <Select value={inheritor} onValueChange={setInheritor}><SelectTrigger className="text-xs"><SelectValue placeholder="Inheritor" /></SelectTrigger><SelectContent><SelectItem value={ANY}>Any inheritor focus</SelectItem><SelectItem value="yes">Inheritor focus</SelectItem><SelectItem value="no">Not inheritor-specific</SelectItem></SelectContent></Select>
          <Select value={nextGen} onValueChange={setNextGen}><SelectTrigger className="text-xs"><SelectValue placeholder="Next gen" /></SelectTrigger><SelectContent><SelectItem value={ANY}>Any next-gen focus</SelectItem><SelectItem value="yes">Next-gen focus</SelectItem><SelectItem value="no">Not next-gen-specific</SelectItem></SelectContent></Select>
          <Select value={familyOffice} onValueChange={setFamilyOffice}><SelectTrigger className="text-xs"><SelectValue placeholder="Family office" /></SelectTrigger><SelectContent><SelectItem value={ANY}>Any family-office focus</SelectItem><SelectItem value="yes">Family-office focus</SelectItem><SelectItem value="no">Not family-office-specific</SelectItem></SelectContent></Select>
          <Select value={impact} onValueChange={setImpact}><SelectTrigger className="text-xs"><SelectValue placeholder="Impact" /></SelectTrigger><SelectContent><SelectItem value={ANY}>Any impact focus</SelectItem><SelectItem value="yes">Impact focus</SelectItem><SelectItem value="no">Not impact-specific</SelectItem></SelectContent></Select>
          <div className="text-xs text-muted-foreground flex items-center px-2">Showing {filtered.length} of {all.length}</div>
        </div>
      </Card>

      <Card className="tech-card p-0 overflow-x-auto">
        <Table>
          <TableHeader><TableRow className="text-[10px]">
            <TableHead>Network</TableHead><TableHead>Tier</TableHead><TableHead>Category</TableHead><TableHead>Region</TableHead><TableHead>Focus</TableHead><TableHead>Access</TableHead><TableHead>Source</TableHead><TableHead>GHAT route</TableHead><TableHead>Link</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {filtered.map(r => {
              const href = r.website_url || r.source_url;
              return <TableRow key={r.id} className="text-xs">
                <TableCell className="font-medium min-w-[210px]">{r.network_name}{r.membership_size_note && <p className="text-[10px] text-muted-foreground mt-1 max-w-[260px]">{r.membership_size_note}</p>}</TableCell>
                <TableCell><Badge variant={r.priority_tier === 1 ? "default" : "outline"}>T{r.priority_tier}</Badge></TableCell>
                <TableCell className="max-w-[180px]">{r.category.replaceAll("_", " ")}</TableCell>
                <TableCell>{r.region}</TableCell>
                <TableCell><div className="flex flex-wrap gap-1 max-w-[220px]">{r.inheritor_focus && <Badge variant="outline" className="text-[9px]">inheritor</Badge>}{r.next_gen_focus && <Badge variant="outline" className="text-[9px]">next-gen</Badge>}{r.family_office_focus && <Badge variant="outline" className="text-[9px]">family office</Badge>}{r.impact_investing_focus && <Badge variant="outline" className="text-[9px]">impact</Badge>}</div></TableCell>
                <TableCell className="max-w-[150px]">{r.access_mode.replaceAll("_", " ")}</TableCell>
                <TableCell>{sourceBadge(r.source_status)}</TableCell>
                <TableCell className="min-w-[260px] max-w-[360px] text-muted-foreground">{r.ghat_route_notes ?? "—"}</TableCell>
                <TableCell>{href ? <a href={href} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">Open <ExternalLink className="h-3 w-3" /></a> : "—"}</TableCell>
              </TableRow>;
            })}
            {!filtered.length && <TableRow><TableCell colSpan={9} className="text-xs text-muted-foreground p-4">No networks match these filters.</TableCell></TableRow>}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
