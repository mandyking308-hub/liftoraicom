import { useEffect, useState } from "react";
import { SopLayout } from "./_shared";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { fetchSops, fetchUsage, type SopDocument, type SopAgentUsage } from "@/lib/sopEngine";

export default function SopsAgentUsage() {
  const [sops, setSops] = useState<SopDocument[]>([]);
  const [rows, setRows] = useState<SopAgentUsage[]>([]);
  useEffect(() => { Promise.all([fetchSops(), fetchUsage()]).then(([s,u]) => { setSops(s); setRows(u); }).catch(() => {}); }, []);
  const sopOf = (id: string) => sops.find(s => s.id === id);
  return (
    <SopLayout title="Agents Using SOPs" subtitle="Every agent reference to an SOP — prompt context, checklist, rule source, escalation or manual reference. Non-approved references are highlighted.">
      <Card className="tech-card p-0 overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="bg-secondary/40 text-muted-foreground"><tr>
            <th className="text-left p-2">Agent</th><th className="text-left p-2">SOP</th>
            <th className="text-left p-2">Usage</th><th className="text-left p-2">SOP status</th>
            <th className="text-left p-2">Active</th>
          </tr></thead>
          <tbody>
            {rows.length === 0 && <tr><td colSpan={5} className="p-6 text-center text-muted-foreground">No agent usage recorded.</td></tr>}
            {rows.map(r => {
              const s = sopOf(r.sop_id);
              const flagged = s && s.sop_status !== "approved" && r.active;
              return (
                <tr key={r.id} className={`border-t border-border/40 ${flagged ? "bg-yellow-500/5" : ""}`}>
                  <td className="p-2 font-medium">{r.agent_key}</td>
                  <td className="p-2">{s?.sop_name ?? r.sop_id.slice(0,8)}</td>
                  <td className="p-2">{r.usage_type}</td>
                  <td className="p-2">{s?.sop_status ?? "—"} {flagged && <Badge variant="outline" className="ml-1 text-[9px] bg-yellow-500/15 text-yellow-300 border-yellow-500/30">NEEDS APPROVAL</Badge>}</td>
                  <td className="p-2">{r.active ? "Yes" : "No"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>
    </SopLayout>
  );
}