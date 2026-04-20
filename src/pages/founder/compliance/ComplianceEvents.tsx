import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import FounderLayout from "@/components/founder/FounderLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckCircle2 } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

type EventRow = {
  id: string; severity: "low" | "medium" | "high" | "critical";
  flag_type: string; message: string; entity_type: string; entity_id: string | null;
  business_name: string; jurisdiction: string; created_at: string; resolved: boolean;
  resolution_note: string; resolved_at: string | null;
};

const SEV_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  low: "outline", medium: "secondary", high: "default", critical: "destructive",
};

const ComplianceEvents = () => {
  const [filter, setFilter] = useState<"all" | "critical" | "high" | "medium" | "low" | "open">("open");
  const [resolving, setResolving] = useState<EventRow | null>(null);
  const [note, setNote] = useState("");

  const { data = [], refetch } = useQuery({
    queryKey: ["compliance_events_all", filter],
    queryFn: async () => {
      let q = supabase
        .from("compliance_events" as never)
        .select("id, severity, flag_type, message, entity_type, entity_id, business_name, jurisdiction, created_at, resolved, resolution_note, resolved_at")
        .order("created_at", { ascending: false })
        .limit(500);
      if (filter === "open") q = q.eq("resolved", false);
      else if (filter !== "all") q = q.eq("severity", filter);
      const { data, error } = await q;
      if (error) throw error;
      return (data as unknown as EventRow[]) ?? [];
    },
  });

  async function confirmResolve() {
    if (!resolving) return;
    const { error } = await supabase
      .from("compliance_events" as never)
      .update({ resolved: true, resolution_note: note || "Marked false-positive / actioned" } as never)
      .eq("id", resolving.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Marked resolved");
    setResolving(null);
    setNote("");
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
                          <Button size="sm" variant="outline" onClick={() => { setResolving(e); setNote(""); }}>
                            <CheckCircle2 className="h-3 w-3 mr-1" /> Resolve
                          </Button>
                        )}
                        {e.resolved && e.resolution_note && (
                          <span className="text-xs text-muted-foreground italic" title={e.resolution_note}>
                            ✓ {e.resolution_note.slice(0, 30)}{e.resolution_note.length > 30 ? "…" : ""}
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Dialog open={!!resolving} onOpenChange={(o) => !o && setResolving(null)}>
          <DialogContent>
            <DialogHeader><DialogTitle>Resolve compliance event</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                <span className="font-mono">{resolving?.flag_type}</span> — {resolving?.message}
              </p>
              <Input
                placeholder="Resolution note (e.g. 'false positive — consent on file')"
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setResolving(null)}>Cancel</Button>
              <Button onClick={confirmResolve}>Confirm resolve</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </FounderLayout>
  );
};

export default ComplianceEvents;
