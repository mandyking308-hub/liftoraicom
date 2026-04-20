import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import FounderLayout from "@/components/founder/FounderLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";

type Rule = {
  id: string; name: string; category: string; jurisdiction: string;
  severity: "low" | "medium" | "high" | "critical";
  description: string; active: boolean;
  enforcement_mode: "log_only" | "warn" | "block";
  hit_count: number;
  last_hit_at: string | null;
};

const SEV_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  low: "outline", medium: "secondary", high: "default", critical: "destructive",
};

const ComplianceRules = () => {
  const qc = useQueryClient();
  const { data: rules = [] } = useQuery({
    queryKey: ["compliance_rules"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("compliance_rules" as never)
        .select("id, name, category, jurisdiction, severity, description, active, enforcement_mode, hit_count, last_hit_at")
        .order("category").order("hit_count", { ascending: false });
      if (error) throw error;
      return (data as unknown as Rule[]) ?? [];
    },
  });

  async function toggleActive(r: Rule, active: boolean) {
    const { error } = await supabase.from("compliance_rules" as never).update({ active } as never).eq("id", r.id);
    if (error) toast.error(error.message);
    else { toast.success(active ? "Rule enabled" : "Rule disabled"); qc.invalidateQueries({ queryKey: ["compliance_rules"] }); }
  }

  async function setEnforcement(r: Rule, mode: Rule["enforcement_mode"]) {
    const { error } = await supabase.from("compliance_rules" as never).update({ enforcement_mode: mode } as never).eq("id", r.id);
    if (error) toast.error(error.message);
    else { toast.success("Enforcement updated"); qc.invalidateQueries({ queryKey: ["compliance_rules"] }); }
  }

  const grouped = rules.reduce<Record<string, Rule[]>>((acc, r) => {
    (acc[r.category] ??= []).push(r); return acc;
  }, {});

  return (
    <FounderLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Compliance Rules</h1>
          <p className="text-muted-foreground mt-1">
            All rules are advisory in Phase 1 — enforcement mode is wired for the future upgrade.
          </p>
        </div>

        {Object.entries(grouped).map(([cat, list]) => (
          <Card key={cat}>
            <CardHeader><CardTitle className="capitalize">{cat.replace("_", " ")}</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Rule</TableHead>
                    <TableHead>Jurisdiction</TableHead>
                    <TableHead>Severity</TableHead>
                    <TableHead>Hits</TableHead>
                    <TableHead>Enforcement</TableHead>
                    <TableHead>Active</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {list.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell>
                        <p className="text-sm font-medium">{r.name}</p>
                        <p className="text-xs text-muted-foreground">{r.description}</p>
                      </TableCell>
                      <TableCell><Badge variant="outline" className="text-xs">{r.jurisdiction}</Badge></TableCell>
                      <TableCell><Badge variant={SEV_VARIANT[r.severity]}>{r.severity}</Badge></TableCell>
                      <TableCell>
                        <Badge variant={r.hit_count > 50 ? "destructive" : r.hit_count > 10 ? "default" : "outline"} className="font-mono">
                          {r.hit_count ?? 0}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Select value={r.enforcement_mode} onValueChange={(v) => setEnforcement(r, v as Rule["enforcement_mode"])}>
                          <SelectTrigger className="h-8 w-32"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="log_only">log_only</SelectItem>
                            <SelectItem value="warn">warn</SelectItem>
                            <SelectItem value="block">block</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Switch checked={r.active} onCheckedChange={(c) => toggleActive(r, c)} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        ))}
      </div>
    </FounderLayout>
  );
};

export default ComplianceRules;
