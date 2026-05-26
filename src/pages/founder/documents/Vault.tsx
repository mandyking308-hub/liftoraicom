import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { DocLayout } from "./_shared";
import { fetchDocuments, fetchAccessRules, findOverSharedSensitive, SENSITIVITY_META, type DocumentVaultItem, type DocumentAccessRule } from "@/lib/documentVaultEngine";

export default function Vault() {
  const [docs, setDocs] = useState<DocumentVaultItem[]>([]);
  const [rules, setRules] = useState<DocumentAccessRule[]>([]);
  const [q, setQ] = useState("");
  useEffect(() => { Promise.all([fetchDocuments(), fetchAccessRules()]).then(([d,r]) => { setDocs(d); setRules(r); }).catch(() => {}); }, []);
  const overShared = useMemo(() => new Set(findOverSharedSensitive(docs, rules).map(o => o.doc.id)), [docs, rules]);
  const filtered = docs.filter(d => !q || d.document_title.toLowerCase().includes(q.toLowerCase()) || d.document_type.includes(q.toLowerCase()));
  return (
    <DocLayout title="Document Vault" subtitle="Documents indexed by business/entity/type/sensitivity. File content lives in controlled storage. Sharing requires explicit access rule and founder approval.">
      <div className="flex items-center gap-2">
        <Input value={q} onChange={e => setQ(e.target.value)} placeholder="Search title or type…" className="max-w-xs" />
        <Badge variant="outline" className="text-[10px]">{filtered.length} of {docs.length}</Badge>
      </div>
      <Card className="tech-card p-3">
        <table className="w-full text-xs">
          <thead className="text-muted-foreground"><tr>
            <th className="text-left p-1">Title</th><th className="text-left p-1">Type</th>
            <th className="text-left p-1">Sensitivity</th><th className="text-left p-1">Verified</th>
            <th className="text-left p-1">Source</th><th className="text-left p-1">Warning</th>
          </tr></thead>
          <tbody>
            {filtered.map(d => {
              const sens = SENSITIVITY_META[d.sensitivity_level];
              return (
                <tr key={d.id} className="border-t border-border/50">
                  <td className="p-1 font-medium">{d.document_title}</td>
                  <td className="p-1 text-muted-foreground">{d.document_type}</td>
                  <td className="p-1"><Badge variant="outline" className={`text-[10px] ${sens?.cls}`}>{sens?.label}</Badge></td>
                  <td className="p-1">{d.verified ? <Badge variant="outline" className="text-[10px] bg-emerald-500/15 text-emerald-400 border-emerald-500/30">verified</Badge> : <Badge variant="outline" className="text-[10px] bg-yellow-500/15 text-yellow-300 border-yellow-500/30">unverified</Badge>}</td>
                  <td className="p-1 text-muted-foreground">{d.source_module ?? "—"}</td>
                  <td className="p-1">{overShared.has(d.id) ? <Badge variant="outline" className="text-[10px] bg-red-500/15 text-red-300 border-red-500/30">over-shared</Badge> : "—"}</td>
                </tr>
              );
            })}
            {filtered.length === 0 && <tr><td colSpan={6} className="p-3 text-muted-foreground text-center">No documents.</td></tr>}
          </tbody>
        </table>
      </Card>
    </DocLayout>
  );
}