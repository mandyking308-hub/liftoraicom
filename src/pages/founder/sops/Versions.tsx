import { useEffect, useState } from "react";
import { SopLayout } from "./_shared";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { fetchSops, fetchVersions, type SopDocument, type SopVersion } from "@/lib/sopEngine";

export default function SopsVersions() {
  const [sops, setSops] = useState<SopDocument[]>([]);
  const [versions, setVersions] = useState<SopVersion[]>([]);
  useEffect(() => {
    Promise.all([fetchSops(), fetchVersions()]).then(([s,v]) => { setSops(s); setVersions(v); }).catch(() => {});
  }, []);
  const nameOf = (id: string) => sops.find(s => s.id === id)?.sop_name ?? "—";
  const cls = (s: string) => s === "approved" ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
    : s === "review_required" ? "bg-yellow-500/15 text-yellow-300 border-yellow-500/30"
    : s === "superseded" ? "bg-muted text-muted-foreground border-border/50"
    : s === "retired" ? "bg-muted text-muted-foreground border-border/50"
    : "bg-blue-500/15 text-blue-300 border-blue-500/30";
  return (
    <SopLayout title="Version History" subtitle="Every draft, review, approval and retirement of each SOP. Historical versions are retained for audit.">
      <Card className="tech-card p-0 overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="bg-secondary/40 text-muted-foreground"><tr>
            <th className="text-left p-2">SOP</th><th className="text-left p-2">v#</th>
            <th className="text-left p-2">Status</th><th className="text-left p-2">Summary</th>
            <th className="text-left p-2">Approved by</th><th className="text-left p-2">Effective</th>
          </tr></thead>
          <tbody>
            {versions.length === 0 && <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">No versions yet.</td></tr>}
            {versions.map(v => (
              <tr key={v.id} className="border-t border-border/40">
                <td className="p-2 font-medium">{nameOf(v.sop_id)}</td>
                <td className="p-2">v{v.version_number}</td>
                <td className="p-2"><Badge variant="outline" className={`text-[10px] ${cls(v.version_status)}`}>{v.version_status}</Badge></td>
                <td className="p-2 text-muted-foreground max-w-md truncate">{v.content_summary ?? "—"}</td>
                <td className="p-2">{v.approved_by ?? "—"}</td>
                <td className="p-2 text-muted-foreground">{v.effective_from ? new Date(v.effective_from).toLocaleDateString() : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </SopLayout>
  );
}