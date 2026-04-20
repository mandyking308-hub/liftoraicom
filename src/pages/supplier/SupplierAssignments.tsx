import { useEffect, useState } from "react";
import { Loader2, Mail } from "lucide-react";
import SupplierLayout from "@/components/supplier/SupplierLayout";
import SupplierRoute from "@/components/supplier/SupplierRoute";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { supplierToken } from "@/pages/supplier/SupplierLogin";
import { toast } from "sonner";

type Row = {
  id: string;
  deal_id: string;
  deal_name: string | null;
  business_name: string;
  contact_name: string | null;
  contact_company: string | null;
  contact_email: string;
  status: "assigned" | "in_progress" | "completed" | "failed";
  share_contact_details: boolean;
  supplier_note: string;
  notes: string;
  assigned_at: string;
  started_at: string | null;
  completed_at: string | null;
};

const Inner = () => {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogRow, setDialogRow] = useState<Row | null>(null);
  const [pendingStatus, setPendingStatus] = useState<"in_progress" | "completed">("in_progress");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  async function load() {
    setLoading(true);
    const { data, error } = await supabase.rpc("supplier_list_assignments", { _token: supplierToken.get() });
    if (error) toast.error(error.message);
    setRows((data as Row[]) ?? []);
    setLoading(false);
  }
  useEffect(() => { void load(); }, []);

  function openUpdate(r: Row, next: "in_progress" | "completed") {
    setDialogRow(r);
    setPendingStatus(next);
    setNote(r.supplier_note || "");
  }

  async function submitUpdate() {
    if (!dialogRow) return;
    setBusy(true);
    const { data, error } = await supabase.rpc("supplier_update_assignment_status", {
      _token: supplierToken.get(),
      _assignment_id: dialogRow.id,
      _new_status: pendingStatus,
      _note: note.trim() || null,
    });
    setBusy(false);
    const r = data as { ok: boolean; error?: string } | null;
    if (error || !r?.ok) {
      toast.error(r?.error?.replace(/_/g, " ").toLowerCase() || error?.message || "Update failed");
      return;
    }
    toast.success(`Marked as ${pendingStatus.replace("_", " ")}`);
    setDialogRow(null);
    void load();
  }

  return (
    <SupplierLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Your assignments</h1>
          <p className="text-sm text-muted-foreground mt-1">Update progress as you start and complete each engagement.</p>
        </div>

        <Card className="tech-card">
          <CardHeader><CardTitle className="text-sm">All assignments</CardTitle></CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <p className="p-4 text-sm text-muted-foreground">Loading…</p>
            ) : rows.length === 0 ? (
              <p className="p-4 text-sm text-muted-foreground">No assignments yet.</p>
            ) : (
              <ul className="divide-y divide-border/50">
                {rows.map((r) => {
                  const locked = r.status === "completed" || r.status === "failed";
                  return (
                    <li key={r.id} className="p-4 space-y-3">
                      <div className="flex items-start justify-between gap-3 flex-wrap">
                        <div className="text-sm">
                          <p className="font-medium">{r.deal_name || "Untitled engagement"}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {r.business_name || "—"} · {r.contact_company || "—"}
                            {r.contact_name ? ` · contact: ${r.contact_name}` : ""}
                          </p>
                          {r.share_contact_details && r.contact_email && (
                            <p className="text-xs text-muted-foreground mt-0.5 inline-flex items-center gap-1">
                              <Mail className="h-3 w-3" /> {r.contact_email}
                            </p>
                          )}
                          {r.notes && (
                            <p className="text-xs text-muted-foreground mt-1 italic">Brief: {r.notes}</p>
                          )}
                        </div>
                        <Badge variant="outline" className="capitalize">{r.status.replace("_", " ")}</Badge>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap text-xs text-muted-foreground">
                        <span>Assigned {new Date(r.assigned_at).toLocaleDateString()}</span>
                        {r.started_at && <span>· Started {new Date(r.started_at).toLocaleDateString()}</span>}
                        {r.completed_at && <span>· Completed {new Date(r.completed_at).toLocaleDateString()}</span>}
                      </div>
                      {!locked && (
                        <div className="flex gap-2">
                          {r.status === "assigned" && (
                            <Button size="sm" variant="outline" onClick={() => openUpdate(r, "in_progress")}>
                              Start work
                            </Button>
                          )}
                          {(r.status === "assigned" || r.status === "in_progress") && (
                            <Button size="sm" onClick={() => openUpdate(r, "completed")}>
                              Mark completed
                            </Button>
                          )}
                        </div>
                      )}
                      {r.supplier_note && (
                        <p className="text-xs italic text-muted-foreground">Your note: {r.supplier_note}</p>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={!!dialogRow} onOpenChange={(o) => !o && setDialogRow(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark as {pendingStatus.replace("_", " ")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="note">Note (optional)</Label>
            <Textarea id="note" rows={4} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Add context, blockers, or delivery notes…" />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDialogRow(null)}>Cancel</Button>
            <Button onClick={submitUpdate} disabled={busy}>
              {busy ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SupplierLayout>
  );
};

const SupplierAssignments = () => <SupplierRoute>{() => <Inner />}</SupplierRoute>;
export default SupplierAssignments;