import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DocLayout } from "./_shared";
import { fetchDocuments, SENSITIVITY_META, type DocumentVaultItem } from "@/lib/documentVaultEngine";

export default function Policies() {
  const [docs, setDocs] = useState<DocumentVaultItem[]>([]);
  useEffect(() => { fetchDocuments().then(setDocs).catch(() => setDocs([])); }, []);
  const policies = docs.filter(d => ["policy","manual","legal"].includes(d.document_type));
  return (
    <DocLayout title="Policies & Manuals" subtitle="Policy, manual and legal documents indexed from the vault. Use Access Rules to control how each policy is exposed.">
      <Card className="tech-card p-3">
        <table className="w-full text-xs">
          <thead className="text-muted-foreground"><tr>
            <th className="text-left p-1">Title</th><th className="text-left p-1">Type</th>
            <th className="text-left p-1">Sensitivity</th><th className="text-left p-1">Verified</th>
          </tr></thead>
          <tbody>
            {policies.map(d => (
              <tr key={d.id} className="border-t border-border/50">
                <td className="p-1">{d.document_title}</td>
                <td className="p-1 text-muted-foreground">{d.document_type}</td>
                <td className="p-1"><Badge variant="outline" className={`text-[10px] ${SENSITIVITY_META[d.sensitivity_level]?.cls}`}>{SENSITIVITY_META[d.sensitivity_level]?.label}</Badge></td>
                <td className="p-1">{d.verified ? "✔" : "—"}</td>
              </tr>
            ))}
            {policies.length === 0 && <tr><td colSpan={4} className="p-3 text-muted-foreground text-center">No policy/manual/legal documents indexed.</td></tr>}
          </tbody>
        </table>
      </Card>
    </DocLayout>
  );
}