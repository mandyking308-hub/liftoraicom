import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { IdentityLayout } from "./_shared";
import { listDoNotContact } from "@/lib/identityResolution";
import { Ban } from "lucide-react";

export default function IdentityDoNotContact() {
  const { data: list = [] } = useQuery({ queryKey: ["id-dnc"], queryFn: listDoNotContact, refetchInterval: 30000 });
  return (
    <IdentityLayout title="Global Do-Not-Contact" subtitle="People who must not be contacted under any business. Outreach, CRM, seller recruitment and customer engines all respect this list. Removing a profile from this list requires founder approval.">
      <Card className="tech-card border-red-500/30">
        <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Ban size={14} className="text-red-300" /> Suppressed identities</CardTitle></CardHeader>
        <CardContent>
          {list.length === 0 ? <p className="text-xs text-muted-foreground">No do-not-contact entries.</p> : (
            <table className="w-full text-xs">
              <thead className="text-[10px] uppercase text-muted-foreground">
                <tr className="border-b border-border/40">
                  <th className="text-left p-2">Name</th>
                  <th className="text-left p-2">Email</th>
                  <th className="text-left p-2">Phone</th>
                  <th className="text-left p-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {list.map((p: any) => (
                  <tr key={p.id} className="border-b border-border/20 hover:bg-secondary/30">
                    <td className="p-2 font-medium">{p.display_name ?? "—"}</td>
                    <td className="p-2 font-mono text-[10px]">{p.primary_email ?? "—"}</td>
                    <td className="p-2 text-muted-foreground">{p.primary_phone_summary ?? "—"}</td>
                    <td className="p-2"><Badge variant="outline" className="text-[10px] bg-red-500/15 text-red-300 border-red-500/30">DNC</Badge></td>
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