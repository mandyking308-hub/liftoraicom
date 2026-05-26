import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { IdentityLayout } from "./_shared";
import { listLinks, roleBadge } from "@/lib/identityResolution";
import { AlertTriangle } from "lucide-react";

const CONFLICTS: Array<[string, string]> = [
  ["customer","seller"], ["customer","vendor"], ["seller","vendor"],
  ["prospect","vendor"], ["adviser","seller"], ["investor","vendor"],
];

export default function IdentityRoles() {
  const { data: links = [] } = useQuery({ queryKey: ["id-links"], queryFn: () => listLinks(), refetchInterval: 30000 });
  const byProfile: Record<string, string[]> = {};
  for (const l of links as Array<{ identity_profile_id: string; linked_role: string }>) {
    (byProfile[l.identity_profile_id] ??= []).push(l.linked_role);
  }
  const rows = Object.entries(byProfile).map(([pid, roles]) => {
    const unique = Array.from(new Set(roles));
    const conflict = CONFLICTS.find(([a,b]) => unique.includes(a) && unique.includes(b));
    return { pid, roles: unique, conflict };
  });
  return (
    <IdentityLayout title="Role map" subtitle="Which roles each identity holds across businesses. Conflicts (e.g. same person is both customer and vendor) are flagged for founder review.">
      <Card className="tech-card">
        <CardHeader className="pb-2"><CardTitle className="text-sm">Per-profile roles</CardTitle></CardHeader>
        <CardContent>
          {rows.length === 0 ? <p className="text-xs text-muted-foreground">No links yet.</p> : (
            <table className="w-full text-xs">
              <thead className="text-[10px] uppercase text-muted-foreground">
                <tr className="border-b border-border/40">
                  <th className="text-left p-2">Profile</th>
                  <th className="text-left p-2">Roles</th>
                  <th className="text-left p-2">Conflict?</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(r => (
                  <tr key={r.pid} className="border-b border-border/20 hover:bg-secondary/30">
                    <td className="p-2 font-mono text-[10px]">{r.pid.slice(0,8)}</td>
                    <td className="p-2 flex flex-wrap gap-1">
                      {r.roles.map(role => <Badge key={role} variant="outline" className={`text-[10px] ${roleBadge(role)}`}>{role}</Badge>)}
                    </td>
                    <td className="p-2">
                      {r.conflict ? (
                        <Badge variant="outline" className="text-[10px] bg-red-500/15 text-red-300 border-red-500/30">
                          <AlertTriangle size={9} className="mr-1" /> {r.conflict[0]} ↔ {r.conflict[1]}
                        </Badge>
                      ) : <span className="text-muted-foreground">—</span>}
                    </td>
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