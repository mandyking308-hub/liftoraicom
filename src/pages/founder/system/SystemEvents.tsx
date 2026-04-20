import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import FounderLayout from "@/components/founder/FounderLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";

type SystemEvent = {
  id: string;
  event_type: string;
  entity_type: string | null;
  entity_id: string | null;
  business_name: string;
  severity: "low" | "medium" | "high" | "critical";
  message: string;
  metadata: Record<string, unknown>;
  resolved: boolean;
  resolved_at: string | null;
  resolution_note: string;
  created_at: string;
};

const severityBadge = (s: SystemEvent["severity"]) => {
  const cls = {
    low: "bg-muted text-muted-foreground",
    medium: "bg-amber-500/15 text-amber-300 border-amber-500/30",
    high: "bg-orange-500/15 text-orange-300 border-orange-500/30",
    critical: "bg-destructive/15 text-destructive border-destructive/30",
  }[s];
  return <Badge variant="outline" className={cls}>{s}</Badge>;
};

const SystemEvents = () => {
  const [filter, setFilter] = useState<"active" | "resolved" | "all">("active");

  const { data: events = [], refetch } = useQuery({
    queryKey: ["system_events_filter", filter],
    queryFn: async () => {
      let q = supabase.from("system_events" as never).select("*");
      if (filter === "active") q = q.eq("resolved", false);
      else if (filter === "resolved") q = q.eq("resolved", true);
      const { data, error } = await q
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data ?? []) as unknown as SystemEvent[];
    },
    refetchInterval: 30000,
  });

  const markResolved = async (id: string) => {
    const { error } = await supabase
      .from("system_events" as never)
      .update({ resolved: true, resolved_at: new Date().toISOString(), resolution_note: "Manually resolved" } as never)
      .eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success("Event resolved");
      refetch();
    }
  };

  return (
    <FounderLayout>
      <div className="max-w-7xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">System Events</h1>
          <p className="text-muted-foreground mt-1">
            Full audit trail of every anomaly detected across modules.
          </p>
        </div>

        <Tabs value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
          <TabsList>
            <TabsTrigger value="active">Active</TabsTrigger>
            <TabsTrigger value="resolved">Resolved</TabsTrigger>
            <TabsTrigger value="all">All</TabsTrigger>
          </TabsList>
        </Tabs>

        <Card>
          <CardHeader>
            <CardTitle>{events.length} events</CardTitle>
          </CardHeader>
          <CardContent>
            {events.length === 0 ? (
              <p className="text-muted-foreground text-sm">No events match this filter.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Severity</TableHead>
                    <TableHead>Event Type</TableHead>
                    <TableHead>Message</TableHead>
                    <TableHead>Entity</TableHead>
                    <TableHead>Business</TableHead>
                    <TableHead>When</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {events.map((e) => (
                    <TableRow key={e.id}>
                      <TableCell>{severityBadge(e.severity)}</TableCell>
                      <TableCell className="text-sm font-medium">{e.event_type}</TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-xs">{e.message}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{e.entity_type ?? "—"}</TableCell>
                      <TableCell className="text-xs">{e.business_name || "—"}</TableCell>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {formatDistanceToNow(new Date(e.created_at), { addSuffix: true })}
                      </TableCell>
                      <TableCell>
                        {!e.resolved && (
                          <Button size="sm" variant="outline" onClick={() => markResolved(e.id)}>
                            Resolve
                          </Button>
                        )}
                        {e.resolved && (
                          <Badge variant="outline" className="bg-emerald-500/15 text-emerald-300 border-emerald-500/30">
                            resolved
                          </Badge>
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

export default SystemEvents;