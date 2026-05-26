import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { IdentityLayout } from "./_shared";
import { listDuplicates } from "@/lib/identityResolution";

export default function IdentityDuplicates() {
  const { data: dupes = [] } = useQuery({ queryKey: ["id-dupes"], queryFn: listDuplicates, refetchInterval: 30000 });
  return (
    <IdentityLayout title="Duplicate candidates" subtitle="Suggested duplicates with confidence scores. Nothing is merged automatically. Send to merge queue to request founder approval.">
      <Card className="tech-card">
        <CardHeader className="pb-2"><CardTitle className="text-sm">Candidate pairs</CardTitle></CardHeader>
        <CardContent>
          {dupes.length === 0 ? <p className="text-xs text-muted-foreground">No duplicates detected.</p> : (
            <table className="w-full text-xs">
              <thead className="text-[10px] uppercase text-muted-foreground">
                <tr className="border-b border-border/40">
                  <th className="text-left p-2">A</th>
                  <th className="text-left p-2">B</th>
                  <th className="text-left p-2">Match reason</th>
                  <th className="text-right p-2">Confidence</th>
                  <th className="text-left p-2">Recommendation</th>
                  <th className="text-left p-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {dupes.map((d: any) => (
                  <tr key={d.id} className="border-b border-border/20 hover:bg-secondary/30">
                    <td className="p-2 font-mono text-[10px]">{d.identity_profile_a_id.slice(0,8)}</td>
                    <td className="p-2 font-mono text-[10px]">{d.identity_profile_b_id.slice(0,8)}</td>
                    <td className="p-2 text-muted-foreground">{d.match_reason ?? "—"}</td>
                    <td className="p-2 text-right font-mono">{Number(d.confidence_score).toFixed(2)}</td>
                    <td className="p-2 text-muted-foreground">{d.merge_recommendation ?? "—"}</td>
                    <td className="p-2"><Badge variant="outline" className="text-[10px]">{d.merge_status}</Badge></td>
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