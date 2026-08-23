import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Search } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { loadPortfolioContacts, type PortfolioContactRow } from "@/lib/portfolioCrmQueries";
import { poolLabel, uniquePoolsForBusinesses } from "@/lib/portfolioCrmPoolResolver";

export default function PortfolioContactRelationshipsTable() {
  const [rows, setRows] = useState<PortfolioContactRow[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPortfolioContacts()
      .then(setRows)
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => {
      const rel = r.business_relationships.map((b) => b.business_name).join(" ");
      const pools = uniquePoolsForBusinesses(r.business_relationships.map((b) => b.business_name)).map(poolLabel).join(" ");
      return `${r.email} ${r.name ?? ""} ${r.company ?? ""} ${rel} ${pools}`.toLowerCase().includes(q);
    });
  }, [rows, search]);

  return (
    <Card className="tech-card">
      <CardContent className="p-4 space-y-4">
        <div className="relative max-w-xl">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search person, organisation, business or shared data pool" className="pl-9" />
        </div>
        <div className="rounded-lg border border-border/50 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Person</TableHead>
                <TableHead>Organisation</TableHead>
                <TableHead>Portfolio business relationships</TableHead>
                <TableHead>Reusable data pools</TableHead>
                <TableHead>Global CRM status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={5} className="text-center py-6 text-muted-foreground">Loading…</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center py-6 text-muted-foreground">No matching contacts.</TableCell></TableRow>
              ) : filtered.map((r) => {
                const pools = uniquePoolsForBusinesses(r.business_relationships.map((b) => b.business_name));
                return (
                  <TableRow key={r.id}>
                    <TableCell>
                      <Link className="font-medium hover:text-primary" to={`/founder/crm/contacts/${r.id}`}>{r.name || r.email}</Link>
                      <div className="text-xs text-muted-foreground">{r.email}</div>
                    </TableCell>
                    <TableCell>{r.company || "—"}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1.5">
                        {r.business_relationships.length === 0 ? <span className="text-xs text-muted-foreground">No business relationships yet</span> : r.business_relationships.map((b) => (
                          <Badge key={b.id} variant={b.do_not_contact ? "destructive" : "outline"} className="text-[10px]">
                            {b.business_name} · {b.qualification} · {b.current_stage}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1.5">
                        {pools.length === 0 ? <span className="text-xs text-muted-foreground">Unmapped / review</span> : pools.map((pool) => (
                          <Badge key={pool} variant="secondary" className="text-[10px]">{poolLabel(pool)}</Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell><Badge variant="outline">{r.status}</Badge></TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
