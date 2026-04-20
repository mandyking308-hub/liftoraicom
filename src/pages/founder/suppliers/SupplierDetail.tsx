import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, CheckCircle2, XCircle, Loader2, Copy, Plus, Trash2 } from "lucide-react";
import FounderLayout from "@/components/founder/FounderLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Supplier = {
  id: string; name: string; email: string; company: string; role: string;
  business_name: string; status: string; source: string; notes: string;
  skills: string[]; tags: string[];
  approved_at: string | null; rejected_at: string | null; created_at: string;
};
type Pipeline = { id: string; stage: string; notes: string; updated_at: string };
type Availability = { id: string; status: string; manual_override: boolean; capacity: number | null; notes: string };
type Assignment = { id: string; deal_id: string; status: string; assigned_at: string; completed_at: string | null; business_name: string; sla_status: string };
type SupplierUser = { id: string; email: string; access_token: string; active: boolean; last_login_at: string | null };

const STATUS_OPTIONS = ["NEW","CONTACTED","QUALIFIED","APPROVED","REJECTED","INACTIVE"];
const AVAIL_OPTIONS = ["available","busy","unavailable"];

const SupplierDetail = () => {
  const { id } = useParams<{ id: string }>();
  const [supplier, setSupplier] = useState<Supplier | null>(null);
  const [pipeline, setPipeline] = useState<Pipeline | null>(null);
  const [availability, setAvailability] = useState<Availability | null>(null);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [users, setUsers] = useState<SupplierUser[]>([]);
  const [newUserEmail, setNewUserEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => { if (id) void load(); }, [id]);

  async function load() {
    setLoading(true);
    const [s, p, a, asg, su] = await Promise.all([
      supabase.from("suppliers").select("*").eq("id", id!).maybeSingle(),
      supabase.from("supplier_pipeline").select("*").eq("supplier_id", id!).maybeSingle(),
      supabase.from("supplier_availability").select("*").eq("supplier_id", id!).maybeSingle(),
      supabase.from("assignments").select("*").eq("supplier_id", id!).order("assigned_at", { ascending: false }),
      supabase.from("supplier_users").select("*").eq("supplier_id", id!).order("created_at", { ascending: true }),
    ]);
    setSupplier(s.data as Supplier);
    setPipeline(p.data as Pipeline);
    setAvailability(a.data as Availability);
    setAssignments((asg.data as Assignment[]) ?? []);
    setUsers((su.data as SupplierUser[]) ?? []);
    setLoading(false);
  }

  async function updateSupplier(patch: Partial<Supplier>) {
    if (!supplier) return;
    setBusy(true);
    const { error } = await supabase.from("suppliers").update(patch as never).eq("id", supplier.id);
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Updated");
    void load();
  }

  async function approve() { await updateSupplier({ status: "APPROVED" }); }
  async function reject() { await updateSupplier({ status: "REJECTED" }); }

  async function updateAvailability(patch: Partial<Availability>) {
    if (!availability) return;
    setBusy(true);
    const { error } = await supabase.from("supplier_availability").update(patch as never).eq("id", availability.id);
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    void load();
  }

  async function updatePipelineNotes(notes: string) {
    if (!pipeline) return;
    const { error } = await supabase.from("supplier_pipeline").update({ notes } as never).eq("id", pipeline.id);
    if (error) toast.error(error.message);
    else toast.success("Notes saved");
  }

  async function addPortalUser() {
    if (!supplier || !newUserEmail.trim()) return;
    setBusy(true);
    const { error } = await supabase.from("supplier_users").insert({
      supplier_id: supplier.id,
      email: newUserEmail.trim().toLowerCase(),
    });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    setNewUserEmail("");
    toast.success("Portal access created");
    void load();
  }

  async function toggleUserActive(u: SupplierUser) {
    const { error } = await supabase.from("supplier_users").update({ active: !u.active } as never).eq("id", u.id);
    if (error) toast.error(error.message);
    else void load();
  }

  async function deleteUser(u: SupplierUser) {
    if (!confirm(`Revoke portal access for ${u.email}?`)) return;
    const { error } = await supabase.from("supplier_users").delete().eq("id", u.id);
    if (error) toast.error(error.message);
    else { toast.success("Revoked"); void load(); }
  }

  function copyLink(token: string) {
    const url = `${window.location.origin}/supplier/login?token=${encodeURIComponent(token)}`;
    navigator.clipboard.writeText(url);
    toast.success("Magic link copied");
  }

  if (loading || !supplier) {
    return <FounderLayout><p className="text-muted-foreground">Loading…</p></FounderLayout>;
  }

  return (
    <FounderLayout>
      <div className="max-w-5xl mx-auto space-y-6">
        <Link to="/founder/suppliers" className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
          <ArrowLeft className="h-4 w-4" /> Back to suppliers
        </Link>

        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{supplier.name || supplier.email}</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {supplier.email} · {supplier.company || "—"} · {supplier.role || "—"} · {supplier.business_name || "global"}
            </p>
          </div>
          <div className="flex gap-2">
            {supplier.status !== "APPROVED" && (
              <Button size="sm" onClick={approve} disabled={busy}>
                {busy ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-1" />} Approve
              </Button>
            )}
            {supplier.status !== "REJECTED" && (
              <Button size="sm" variant="destructive" onClick={reject} disabled={busy}>
                <XCircle className="h-4 w-4 mr-1" /> Reject
              </Button>
            )}
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          <Card className="tech-card">
            <CardHeader><CardTitle className="text-sm">Status</CardTitle></CardHeader>
            <CardContent>
              <Select value={supplier.status} onValueChange={(v) => updateSupplier({ status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{STATUS_OPTIONS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
              <div className="mt-3 text-xs text-muted-foreground space-y-1">
                <p>Approved: {supplier.approved_at ? new Date(supplier.approved_at).toLocaleString() : "—"}</p>
                <p>Rejected: {supplier.rejected_at ? new Date(supplier.rejected_at).toLocaleString() : "—"}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="tech-card">
            <CardHeader><CardTitle className="text-sm">Pipeline stage</CardTitle></CardHeader>
            <CardContent>
              <Badge variant="outline" className="capitalize">{pipeline?.stage || "—"}</Badge>
              <p className="text-xs text-muted-foreground mt-2">
                Pipeline auto-advances on status change. Edit notes below.
              </p>
            </CardContent>
          </Card>

          <Card className="tech-card">
            <CardHeader><CardTitle className="text-sm">Availability</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <Select
                value={availability?.status || "available"}
                onValueChange={(v) => updateAvailability({ status: v as Availability["status"] })}
                disabled={!availability?.manual_override}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{AVAIL_OPTIONS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
              <div className="flex items-center gap-2">
                <Switch
                  checked={availability?.manual_override ?? false}
                  onCheckedChange={(v) => updateAvailability({ manual_override: v })}
                />
                <Label className="text-xs">Manual override (lock status)</Label>
              </div>
              <p className="text-xs text-muted-foreground">
                When off, status auto-syncs from active assignments.
              </p>
            </CardContent>
          </Card>
        </div>

        <Card className="tech-card">
          <CardHeader><CardTitle className="text-sm">Recruitment notes</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <Textarea
              defaultValue={pipeline?.notes ?? ""}
              rows={4}
              onBlur={(e) => {
                if (e.target.value !== pipeline?.notes) void updatePipelineNotes(e.target.value);
              }}
              placeholder="Evaluation notes, references, terms…"
            />
            <p className="text-xs text-muted-foreground">Saves on blur.</p>
          </CardContent>
        </Card>

        <Card className="tech-card">
          <CardHeader><CardTitle className="text-sm">Assignments ({assignments.length})</CardTitle></CardHeader>
          <CardContent className="p-0">
            {assignments.length === 0 ? (
              <p className="p-4 text-sm text-muted-foreground">No assignments yet.</p>
            ) : (
              <ul className="divide-y divide-border/50">
                {assignments.map((a) => (
                  <li key={a.id} className="p-3 text-sm flex justify-between items-center">
                    <div>
                      <Badge variant="outline" className="capitalize">{a.status.replace("_"," ")}</Badge>
                      <span className="ml-2 text-xs text-muted-foreground">{a.business_name || "—"}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">{new Date(a.assigned_at).toLocaleString()}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card className="tech-card">
          <CardHeader>
            <CardTitle className="text-sm">Portal access</CardTitle>
            <p className="text-xs text-muted-foreground">
              Send the magic link to let this supplier sign in to their portal.
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-2">
              <Input
                type="email"
                placeholder="supplier@example.com"
                value={newUserEmail}
                onChange={(e) => setNewUserEmail(e.target.value)}
              />
              <Button onClick={addPortalUser} disabled={busy || !newUserEmail.trim()}>
                <Plus className="h-4 w-4 mr-1" /> Grant access
              </Button>
            </div>
            {users.length === 0 ? (
              <p className="text-sm text-muted-foreground">No portal users yet.</p>
            ) : (
              <ul className="divide-y divide-border/50 border border-border/50 rounded-md">
                {users.map((u) => (
                  <li key={u.id} className="p-3 flex items-center justify-between gap-2 flex-wrap">
                    <div className="text-sm">
                      <p className="font-medium">{u.email}</p>
                      <p className="text-xs text-muted-foreground">
                        {u.active ? "Active" : "Disabled"} ·
                        {u.last_login_at ? ` last login ${new Date(u.last_login_at).toLocaleString()}` : " never logged in"}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="outline" onClick={() => copyLink(u.access_token)}>
                        <Copy className="h-3 w-3 mr-1" /> Magic link
                      </Button>
                      <Switch checked={u.active} onCheckedChange={() => toggleUserActive(u)} />
                      <Button size="icon" variant="ghost" onClick={() => deleteUser(u)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </FounderLayout>
  );
};

export default SupplierDetail;