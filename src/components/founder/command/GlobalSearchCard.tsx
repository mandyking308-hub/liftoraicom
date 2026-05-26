import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search, Lock } from "lucide-react";
import { Link } from "react-router-dom";
import { fetchSearchSummary, type SearchSummary } from "@/lib/globalSearchIndex";

export default function GlobalSearchCard() {
  const [sum, setSum] = useState<SearchSummary | null>(null);
  useEffect(() => { fetchSearchSummary().then(setSum).catch(() => setSum(null)); }, []);
  const warn = (n: number) => n > 0 ? "bg-yellow-500/10 text-yellow-300 border-yellow-500/30" : "bg-emerald-500/10 text-emerald-400 border-emerald-500/30";
  const bad  = (n: number) => n > 0 ? "bg-red-500/10 text-red-300 border-red-500/30" : "bg-emerald-500/10 text-emerald-400 border-emerald-500/30";
  return (
    <Card className="tech-card border-primary/30">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Search size={14} className="text-primary" />
          Global Search + Knowledge Index
          <Badge variant="outline" className="ml-auto text-[10px] bg-emerald-500/10 text-emerald-400 border-emerald-500/30">Index live</Badge>
          <Badge variant="outline" className="text-[10px] bg-yellow-500/10 text-yellow-300 border-yellow-500/30">
            <Lock size={9} className="mr-1" /> Safe summaries only
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="text-xs space-y-3">
        <p className="text-muted-foreground">Search across customers, sellers, products, invoices, contracts, documents, incidents, decisions, communications, transcripts and audit.</p>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
          <Tile to="/founder/search/all"      label="Indexed"        value={sum?.total_active} />
          <Tile to="/founder/search/all"      label="Stale >14d"     value={sum?.stale_count} cls={warn(sum?.stale_count ?? 0)} />
          <Tile to="/founder/search"          label="Failed jobs 24h" value={sum?.failed_jobs_24h} cls={bad(sum?.failed_jobs_24h ?? 0)} />
          <Tile to="/founder/search/all"      label="Sensitive"      value={sum?.sensitive_blocked} />
          <Tile to="/founder/search/all"      label="Test rows"      value={sum?.test_rows} />
        </div>
        {sum && (
          <div className="border border-primary/30 rounded p-2 bg-primary/5">
            <p className="text-[10px] uppercase text-muted-foreground">Recommended review</p>
            <p className="text-sm font-medium">{sum.recommended_review}</p>
          </div>
        )}
        <div className="flex gap-2 flex-wrap text-[11px]">
          <Link to="/founder/search" className="text-primary hover:underline">Overview</Link>
          <Link to="/founder/search/all" className="text-primary hover:underline">All</Link>
          <Link to="/founder/search/customers" className="text-primary hover:underline">Customers</Link>
          <Link to="/founder/search/businesses" className="text-primary hover:underline">Businesses</Link>
          <Link to="/founder/search/documents" className="text-primary hover:underline">Documents</Link>
          <Link to="/founder/search/communications" className="text-primary hover:underline">Comms</Link>
          <Link to="/founder/search/audit" className="text-primary hover:underline">Audit</Link>
        </div>
      </CardContent>
    </Card>
  );
}
function Tile({ to, label, value, cls }: { to: string; label: string; value: any; cls?: string }) {
  return (
    <Link to={to} className={`border ${cls ?? "border-border/50"} rounded p-2 hover:border-primary/40 transition`}>
      <p className="text-[10px] uppercase text-muted-foreground">{label}</p>
      <p className="text-sm font-bold">{value ?? "—"}</p>
    </Link>
  );
}
