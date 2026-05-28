import { useEffect, useMemo, useState } from "react";
import { FundingRadarLayout, FRSection, FRStat } from "./_shared";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { fetchAllSignals, ALL_SIGNAL_TYPES, polarityForSignalType, WEAKNESS_SIGNAL_CSV_COLUMNS } from "@/lib/fundingRadarEngine";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";

export default function FRWeaknessSignals() {
  const [signals, setSignals] = useState<any[]>([]);
  const [type, setType] = useState<string>("all");
  const [polarity, setPolarity] = useState<string>("all");
  const [search, setSearch] = useState("");

  useEffect(() => { fetchAllSignals().then(setSignals).catch(() => setSignals([])); }, []);

  const filtered = useMemo(() => signals.filter((s) => {
    if (type !== "all" && s.signal_type !== type) return false;
    const p = s.signal_polarity ?? polarityForSignalType(s.signal_type);
    if (polarity !== "all" && p !== polarity) return false;
    if (search) {
      const q = search.toLowerCase();
      const hay = [s.signal_title, s.signal_summary, s.funding_radar_companies?.company_name, s.source_name].filter(Boolean).join(" ").toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  }), [signals, type, polarity, search]);

  const totals = useMemo(() => ({
    total: signals.length,
    negative: signals.filter((s) => (s.signal_polarity ?? polarityForSignalType(s.signal_type)) === "negative").length,
    positive: signals.filter((s) => (s.signal_polarity ?? polarityForSignalType(s.signal_type)) === "positive").length,
    neutral: signals.filter((s) => (s.signal_polarity ?? polarityForSignalType(s.signal_type)) === "neutral").length,
  }), [signals]);

  function downloadTemplate() {
    const csv = WEAKNESS_SIGNAL_CSV_COLUMNS.join(",") + "\n";
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "weakness_signals_template.csv"; a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <FundingRadarLayout
      title="Weakness signals"
      subtitle="All public signals across watched companies. Track what's working, failing or slowing them down. Internal intelligence — never published, never sent."
    >
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <FRStat label="Total signals" value={totals.total} />
        <FRStat label="Negative" value={totals.negative} />
        <FRStat label="Positive" value={totals.positive} />
        <FRStat label="Neutral" value={totals.neutral} />
      </div>

      <FRSection
        title="Filters"
        actions={<Button size="sm" variant="outline" onClick={downloadTemplate}><Download className="h-3 w-3 mr-1" /> CSV template</Button>}
      >
        <div className="grid grid-cols-1 md:grid-cols-4 gap-2 text-xs">
          <Select value={type} onValueChange={setType}>
            <SelectTrigger><SelectValue placeholder="Signal type" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              {ALL_SIGNAL_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={polarity} onValueChange={setPolarity}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All polarities</SelectItem>
              <SelectItem value="negative">Negative</SelectItem>
              <SelectItem value="positive">Positive</SelectItem>
              <SelectItem value="neutral">Neutral</SelectItem>
            </SelectContent>
          </Select>
          <Input placeholder="Search title/summary/company/source" value={search} onChange={(e) => setSearch(e.target.value)} className="md:col-span-2" maxLength={200} />
        </div>
      </FRSection>

      <FRSection title={`Signals (${filtered.length})`}>
        {filtered.length === 0 ? (
          <p className="text-xs text-muted-foreground italic">No signals match — try clearing filters or add signals from a watchlist company.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="text-muted-foreground">
                <tr className="text-left border-b border-border/50">
                  <th className="py-2 pr-2">Company</th>
                  <th className="py-2 pr-2">Type</th>
                  <th className="py-2 pr-2">Polarity</th>
                  <th className="py-2 pr-2">Title</th>
                  <th className="py-2 pr-2">Sev</th>
                  <th className="py-2 pr-2">Conf</th>
                  <th className="py-2 pr-2">Liftor rel</th>
                  <th className="py-2 pr-2">Date</th>
                  <th className="py-2 pr-2">Source</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((s: any) => {
                  const p = s.signal_polarity ?? polarityForSignalType(s.signal_type);
                  return (
                    <tr key={s.id} className="border-b border-border/30">
                      <td className="py-2 pr-2">{s.funding_radar_companies?.company_name ?? "—"}</td>
                      <td className="py-2 pr-2 text-muted-foreground">{s.signal_type}</td>
                      <td className="py-2 pr-2"><Badge variant="outline" className={"text-[10px] " + (p === "negative" ? "border-amber-500/40 text-amber-400" : p === "positive" ? "border-emerald-500/40 text-emerald-400" : "")}>{p}</Badge></td>
                      <td className="py-2 pr-2 truncate max-w-[24ch]">{s.signal_title}</td>
                      <td className="py-2 pr-2">{s.severity_score ?? "—"}</td>
                      <td className="py-2 pr-2">{s.confidence_score ?? "—"}</td>
                      <td className="py-2 pr-2">{s.relevance_to_liftor_score ?? "—"}</td>
                      <td className="py-2 pr-2 text-muted-foreground">{s.signal_date ?? new Date(s.created_at).toLocaleDateString()}</td>
                      <td className="py-2 pr-2 text-muted-foreground truncate max-w-[18ch]">{s.source_name ?? "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </FRSection>

      <FRSection title="CSV import template" description="Use this column order for bulk weakness/positive signal entry. Only public sources permitted.">
        <code className="block bg-muted/30 border border-border/40 rounded p-2 text-[10px] overflow-x-auto">{WEAKNESS_SIGNAL_CSV_COLUMNS.join(",")}</code>
      </FRSection>
    </FundingRadarLayout>
  );
}