import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DocLayout } from "./_shared";
import { fetchAccessRules, fetchDocuments, ACCESS_SCOPE_LABEL, SENSITIVITY_META, findOverSharedSensitive, type DocumentAccessRule, type DocumentVaultItem } from "@/lib/documentVaultEngine";

export default function Access() {
  const [rules, setRules] = useState<DocumentAccessRule[]>([]);
  const [docs, setDocs] = useState<DocumentVaultItem[]>([]);
  useEffect(() => { Promise.all([fetchAccessRules(), fetchDocuments()]).then(([r,d]) => { setRules(r); setDocs(d); }).catch(() => {}); }, []);
  const over = new Set(findOverSharedSensitive(docs, rules).map(o => o.doc.id));
  const docMap = new Map(docs.map(d => [d.id, d]));
  return (
    <DocLayout title="Access Rules" subtitle="Each rule defines a scope and whether founder approval is required before external exposure. Sensitive documents on external scopes without an approval gate are flagged.">
      <Card className="tech-card p-3">
        <table className="w-full text-xs">
          <thead className="text-muted-foreground"><tr>
            <th className="text-left p-1">Document</th><th className="text-left p-1">Sensitivity</th>
            <th className="text-left p-1">Scope</th><th className="text-left p-1">External</th>
            <th className="text-left p-1">Approval</th><th className="text-left p-1">Expires</th>
            <th className="text-left p-1">Warning</th>
          </tr></thead>
          <tbody>
            {rules.map(r => {
              const d = docMap.get(r.document_id);
              return (
                <tr key={r.id} className="border-t border-border/50">
                  <td className="p-1">{d?.document_title ?? r.document_id.slice(0,8)}</td>
                  <td className="p-1">{d ? <Badge variant="outline" className={`text-[10px] ${SENSITIVITY_META[d.sensitivity_level]?.cls}`}>{SENSITIVITY_META[d.sensitivity_level]?.label}</Badge> : "—"}</td>
                  <td className="p-1 text-muted-foreground">{ACCESS_SCOPE_LABEL[r.access_scope]}</td>
                  <td className="p-1">{r.external_access_allowed ? "yes" : "no"}</td>
                  <td className="p-1">{r.founder_approval_required ? <Badge variant="outline" className="text-[10px] bg-yellow-500/15 text-yellow-300 border-yellow-500/30">required</Badge> : <Badge variant="outline" className="text-[10px] bg-emerald-500/15 text-emerald-400 border-emerald-500/30">pre-approved</Badge>}</td>
                  <td className="p-1 text-muted-foreground">{r.expires_at ? new Date(r.expires_at).toLocaleDateString() : "—"}</td>
                  <td className="p-1">{d && over.has(d.id) ? <Badge variant="outline" className="text-[10px] bg-red-500/15 text-red-300 border-red-500/30">over-shared</Badge> : "—"}</td>
                </tr>
              );
            })}
            {rules.length === 0 && <tr><td colSpan={7} className="p-3 text-muted-foreground text-center">No access rules configured.</td></tr>}
          </tbody>
        </table>
      </Card>
    </DocLayout>
  );
}