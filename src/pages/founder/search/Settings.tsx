import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SearchLayout } from "./_shared";
export default function SearchSettings() {
  return (
    <SearchLayout title="Search settings" subtitle="Live-first knowledge index. Safe-summary only — no raw secrets, no full sensitive bodies.">
      <Card className="tech-card p-4 space-y-3 text-xs">
        <p className="text-sm font-semibold">Indexing contract</p>
        <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
          <li>Index stores safe summaries only. Long strings are truncated and obvious secret-bearing substrings are redacted at write.</li>
          <li>RLS: founders/admins read everything; other authenticated users only see active, non-test entries marked <code>public</code>/<code>internal</code>.</li>
          <li>No normal-UI deletion path on <code>global_search_index</code> — entries are append/update-only.</li>
          <li>Export of search results requires founder approval via the Approval Queue.</li>
          <li>Reindex jobs are tracked in <code>search_index_jobs</code> with status, records_indexed and failure_reason.</li>
        </ul>
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline" className="text-[10px] bg-emerald-500/15 text-emerald-400 border-emerald-500/30">Append/update only</Badge>
          <Badge variant="outline" className="text-[10px] bg-yellow-500/15 text-yellow-300 border-yellow-500/30">Safe summaries</Badge>
          <Badge variant="outline" className="text-[10px] bg-red-500/15 text-red-300 border-red-500/30">Role-gated sensitivity</Badge>
        </div>
      </Card>
    </SearchLayout>
  );
}
