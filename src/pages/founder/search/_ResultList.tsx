import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { searchIndex, type RecordType, type Sensitivity, createSavedSearch } from "@/lib/globalSearchIndex";
import { sensitivityBadge, typeBadge } from "./_shared";
import { toast } from "sonner";

const TYPES: RecordType[] = ["business","contact","customer","seller","partner","product","offer","invoice","payment","contract","document","ticket","complaint","incident","decision","approval","communication","transcript","audit","other"];
const SENSITIVITIES: Sensitivity[] = ["public","internal","confidential","restricted","legal_sensitive","financial_sensitive"];

export default function ResultList({ fixedType, scopeLabel }: { fixedType?: RecordType[] | null; scopeLabel?: string }) {
  const [q, setQ] = useState("");
  const [type, setType] = useState<RecordType | "">("");
  const [sensitivity, setSensitivity] = useState<Sensitivity | "">("");
  const [moduleStr, setModuleStr] = useState("");
  const [includeTest, setIncludeTest] = useState(true);

  const filters = useMemo(() => ({
    q,
    record_type: (type || null) as RecordType | null,
    sensitivity_level: (sensitivity || null) as Sensitivity | null,
    source_module: moduleStr.trim() || null,
    include_test: includeTest,
    limit: 200,
  }), [q, type, sensitivity, moduleStr, includeTest]);

  const query = useQuery({
    queryKey: ["gsi-search", filters, fixedType],
    queryFn: async () => {
      if (fixedType && fixedType.length) {
        const all = await Promise.all(fixedType.map(rt => searchIndex({ ...filters, record_type: rt })));
        const merged = new Map<string, any>();
        for (const arr of all) for (const r of arr) merged.set(r.id, r);
        return [...merged.values()].sort((a, b) => b.last_indexed_at.localeCompare(a.last_indexed_at)).slice(0, 200);
      }
      return searchIndex(filters);
    },
  });

  return (
    <div className="space-y-3">
      <Card className="tech-card p-3 space-y-2">
        <div className="flex flex-col md:flex-row gap-2">
          <Input placeholder={`Search ${scopeLabel ?? "everything"}…`} value={q} onChange={e => setQ(e.target.value)} className="h-9" />
          <Button variant="outline" size="sm" onClick={async () => {
            const name = window.prompt("Name this saved search:");
            if (!name) return;
            try { await createSavedSearch({ search_name: name, query_text: q, filters }); toast.success("Saved search created"); }
            catch (e: any) { toast.error(e?.message ?? "Failed to save"); }
          }}>Save search</Button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-2 text-xs">
          {!fixedType && (
            <select className="bg-background border border-border/50 rounded px-2 py-1" value={type} onChange={e => setType(e.target.value as any)}>
              <option value="">All types</option>
              {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          )}
          <select className="bg-background border border-border/50 rounded px-2 py-1" value={sensitivity} onChange={e => setSensitivity(e.target.value as any)}>
            <option value="">All sensitivity</option>
            {SENSITIVITIES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <Input placeholder="Module (e.g. document_vault)" value={moduleStr} onChange={e => setModuleStr(e.target.value)} className="h-8 text-xs" />
          <label className="flex items-center gap-2"><input type="checkbox" checked={includeTest} onChange={e => setIncludeTest(e.target.checked)} /> Include test data</label>
        </div>
      </Card>

      <div className="space-y-2">
        {(query.data ?? []).map((r: any) => (
          <Card key={r.id} className="tech-card p-3 text-xs">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline" className={`text-[10px] ${typeBadge(r.record_type)}`}>{r.record_type}</Badge>
              <Badge variant="outline" className={`text-[10px] ${sensitivityBadge(r.sensitivity_level)}`}>{r.sensitivity_level}</Badge>
              {r.is_test_data && <Badge variant="outline" className="text-[10px] bg-yellow-500/15 text-yellow-300 border-yellow-500/30">TEST</Badge>}
              <code className="text-[10px]">{r.source_module}</code>
              <span className="text-[10px] text-muted-foreground ml-auto">indexed {r.last_indexed_at.slice(0,19).replace("T"," ")}</span>
            </div>
            <p className="mt-1 font-semibold">{r.title}</p>
            {r.summary && <p className="text-muted-foreground">{r.summary}</p>}
            {r.tags?.length ? <div className="mt-1 flex flex-wrap gap-1">{r.tags.slice(0,8).map((t: string) => <Badge key={t} variant="outline" className="text-[10px]">#{t}</Badge>)}</div> : null}
            <div className="mt-2 flex gap-2 text-[11px]">
              <Link to={`/founder/audit-ledger/events?trace=${encodeURIComponent(r.audit_metadata?.trace ?? "")}`} className="text-primary hover:underline">Audit</Link>
              {r.business_id && <Link to={`/founder/businesses/${r.business_id}`} className="text-primary hover:underline">Open business</Link>}
            </div>
          </Card>
        ))}
        {!query.data?.length && <Card className="tech-card p-4 text-xs text-muted-foreground">No results. Try broader filters, or ensure indexing has run.</Card>}
      </div>
    </div>
  );
}