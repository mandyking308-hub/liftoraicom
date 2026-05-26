import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { IdentityLayout } from "./_shared";
import { listMergeActions } from "@/lib/identityResolution";
import { ShieldAlert } from "lucide-react";

export default function IdentityMergeQueue() {
  const { data: actions = [] } = useQuery({ queryKey: ["id-merges"], queryFn: listMergeActions, refetchInterval: 30000 });
  return (
    <IdentityLayout title="Merge queue" subtitle="Proposed merges. Every merge is irreversible by default and requires founder approval. Nothing here applies until approved.">
      <Card className="tech-card">
        <CardHeader className="pb-2"><CardTitle className="text-sm">Pending merges</CardTitle></CardHeader>
        <CardContent>
          {actions.length === 0 ? <p className="text-xs text-muted-foreground">No merge actions.</p> : (
            <table className="w-full text-xs">
              <thead className="text-[10px] uppercase text-muted-foreground">
                <tr className="border-b border-border/40">
                  <th className="text-left p-2">Candidate</th>
                  <th className="text-left p-2">Status</th>
                  <th className="text-left p-2">Summary</th>
                  <th className="text-left p-2">Irreversible</th>
                  <th className="text-left p-2">Approval</th>
                  <th className="text-left p-2">Created</th>
                </tr>
              </thead>
              <tbody>
                {actions.map((a: any) => (
                  <tr key={a.id} className="border-b border-border/20 hover:bg-secondary/30">
                    <td className="p-2 font-mono text-[10px]">{a.duplicate_candidate_id.slice(0,8)}</td>
                    <td className="p-2"><Badge variant="outline" className="text-[10px]">{a.action_status}</Badge></td>
                    <td className="p-2 text-muted-foreground">{a.merge_summary ?? "—"}</td>
                    <td className="p-2">{a.irreversible ? <Badge variant="outline" className="text-[10px] bg-red-500/15 text-red-300 border-red-500/30"><ShieldAlert size={9} className="mr-1" />yes</Badge> : "—"}</td>
                    <td className="p-2">{a.founder_approval_required ? <Badge variant="outline" className="text-[10px] bg-yellow-500/15 text-yellow-300 border-yellow-500/30">required</Badge> : "—"}</td>
                    <td className="p-2 text-muted-foreground">{new Date(a.created_at).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </IdentityLayout>
  );
}