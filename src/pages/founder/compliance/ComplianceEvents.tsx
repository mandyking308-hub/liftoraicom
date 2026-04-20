import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import FounderLayout from "@/components/founder/FounderLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckCircle2 } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

type EventRow = {
  id: string; severity: "low" | "medium" | "high" | "critical";
  flag_type: string; message: string; entity_type: string; entity_id: string | null;
  business_name: string; jurisdiction: string; created_at: string; resolved: boolean;
};

const SEV_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  low: "outline", medium: "secondary", high: "default", critical: "destructive",
};

const ComplianceEvents = () => {
  const [filter, setFilter] = useState<"all" | "critical" | "high" | "medium" | "low" | "open">("open");

  const { data = [], refetch } = useQuery({
    queryKey: ["compliance_events_all", filter],
    queryFn: async () => {
      let q = supabase
        .from("compliance_events" as never)
        .select("id, severity, flag_type, message, entity_type, entity_id, business_name, jurisdiction, created_at, resolved")
        .order("created_at", { ascending: false })
        .limit(500);
      if (filter === "open") q = q.eq("resolved", false);
      else if (filter !== "all") q = q.eq("severity", filter);
      const { data, error } = await q;
      if (error) throw error;
      return (data as unknown as EventRow[]) ?? [];
    },
  });

  async function resolve(id: string) {
    const { error } = await supabase
      .from("compliance_events" as never)
      .update({ resolved: true } as never)
      .eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Marked resolved");
    void refetch();
  }

  return (
    <FounderLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Compliance Events</h1>
          <p className="text-muted-foreground mt-1">All flags raised by the rule engine.</p>
        </div>

        <Tabs value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
          <TabsList>
            <TabsTrigger value="open">Open</TabsTrigger>
            <TabsTrigger value="critical">Critical</TabsTrigger>
            <TabsTrigger value="high">High</TabsTrigger>
            <TabsTrigger value="medium">Medium</TabsTrigger>
            <TabsTrigger value="low">Low</TabsTrigger>
            <TabsTrigger value="all">All</TabsTrigger>
          </TabsList>
        </Tabs>

        <Card>
          <CardHeader><CardTitle>{data.length} event{data.length === 1 ? "" : "s"}</CardTitle></CardHeader>
          <CardContent>
            {data.length === 0 ? (
              <p className="text-sm text-muted-foreground">No events match this filter.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Severity</TableHead>
                    <TableHead>Flag</TableHead>
                    <TableHead>Entity</TableHead>
                    <TableHead>Business</TableHead>
                    <TableHead>Jurisdiction</TableHead>
                    <TableHead>Message</TableHead>
                    <TableHead>When</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.map((e) => (
                    <TableRow key={e.id} className={e.resolved ? "opacity-50" : ""}>
                      <TableCell><Badge variant={SEV_VARIANT[e.severity]}>{e.severity}</Badge></TableCell>
                      <TableCell className="font-mono text-xs">{e.flag_type}</TableCell>
                      <TableCell><Badge variant="outline" className="text-xs">{e.entity_type}</Badge></TableCell>
                      <TableCell className="text-xs text-muted-foreground">{e.business_name || "—"}</TableCell>
                      <TableCell><Badge variant="outline" className="text-xs">{e.jurisdiction}</Badge></TableCell>
                      <TableCell className="text-xs max-w-md truncate" title={e.message}>{e.message}</TableCell>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {format(new Date(e.created_at), "dd MMM HH:mm")}
                      </TableCell>
                      <TableCell>
                        {!e.resolved && (
                          <Button size="sm" variant="outline" onClick={() => resolve(e.id)}>
                            <CheckCircle2 className="h-3 w-3 mr-1" /> Resolve
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </FounderLayout>
  );
};

export default ComplianceEvents;
