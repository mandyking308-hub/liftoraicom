import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { IdentityLayout } from "./_shared";
import { listIdentities, statusBadge } from "@/lib/identityResolution";
import { Ban } from "lucide-react";

export default function IdentityPeople() {
  const { data: people = [] } = useQuery({ queryKey: ["id-people"], queryFn: () => listIdentities(200), refetchInterval: 30000 });
  return (
    <IdentityLayout title="People" subtitle="Master identity profiles. Each profile unifies records across CRM, sellers, vendors, partners, advisers and investors.">
      <Card className="tech-card">
        <CardHeader className="pb-2"><CardTitle className="text-sm">Identity profiles</CardTitle></CardHeader>
        <CardContent>
          {people.length === 0 ? <p className="text-xs text-muted-foreground">No profiles yet.</p> : (
            <table className="w-full text-xs">
              <thead className="text-[10px] uppercase text-muted-foreground">
                <tr className="border-b border-border/40">
                  <th className="text-left p-2">Name</th>
                  <th className="text-left p-2">Email</th>
                  <th className="text-left p-2">Phone</th>
                  <th className="text-left p-2">Status</th>
                  <th className="text-left p-2">DNC</th>
                  <th className="text-left p-2">Created</th>
                </tr>
              </thead>
              <tbody>
                {people.map(p => (
                  <tr key={p.id} className="border-b border-border/20 hover:bg-secondary/30">
                    <td className="p-2 font-medium">{p.display_name ?? "—"}</td>
                    <td className="p-2 font-mono text-[10px]">{p.primary_email ?? "—"}</td>
                    <td className="p-2 text-muted-foreground">{p.primary_phone_summary ?? "—"}</td>
                    <td className="p-2"><Badge variant="outline" className={`text-[10px] ${statusBadge(p.identity_status)}`}>{p.identity_status}</Badge></td>
                    <td className="p-2">{p.do_not_contact_global ? <Badge variant="outline" className="text-[10px] bg-red-500/15 text-red-300 border-red-500/30"><Ban size={9} className="mr-1" />DNC</Badge> : "—"}</td>
                    <td className="p-2 text-muted-foreground">{new Date(p.created_at).toLocaleString()}</td>
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