import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Loader2, Users, ShieldCheck, CheckCircle2, Clock, XCircle } from "lucide-react";
import FounderLayout from "@/components/founder/FounderLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Supplier = {
  id: string;
  name: string;
  email: string;
  company: string;
  role: string;
  business_name: string;
  status: string;
  source: string;
  created_at: string;
};

type AvailabilityRow = { supplier_id: string; status: string };
type AssignmentRow = { id: string; status: string };

const STATUS_VARIANT: Record<string, string> = {
  NEW: "secondary",
  CONTACTED: "secondary",
  QUALIFIED: "outline",
  APPROVED: "default",
  REJECTED: "destructive",
  INACTIVE: "outline",
};

const SuppliersDashboard = () => {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [availability, setAvailability] = useState<AvailabilityRow[]>([]);
  const [assignments, setAssignments] = useState<AssignmentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", company: "", role: "", business_name: "", source: "" });

  useEffect(() => { void load(); }, []);

  async function load() {
    setLoading(true);
    const [s, a, asg] = await Promise.all([
      supabase.from("suppliers").select("*").order("created_at", { ascending: false }).limit(200),
      supabase.from("supplier_availability").select("supplier_id, status"),
      supabase.from("assignments").select("id, status"),
    ]);
    setSuppliers((s.data as Supplier[]) ?? []);
    setAvailability((a.data as AvailabilityRow[]) ?? []);
    setAssignments((asg.data as AssignmentRow[]) ?? []);
    setLoading(false);
  }

  async function createSupplier() {
    if (!form.email) {
      toast.error("Email is required");
      return;
    }
    setCreating(true);
    const { error } = await supabase.from("suppliers").insert({
      name: form.name,
      email: form.email.toLowerCase().trim(),
      company: form.company,
      role: form.role,
      business_name: form.business_name,
      source: form.source,
    });
    setCreating(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Supplier added");
    setForm({ name: "", email: "", company: "", role: "", business_name: "", source: "" });
    setOpen(false);
    void load();
  }

  const total = suppliers.length;
  const approved = suppliers.filter((s) => s.status === "APPROVED").length;
  const available = availability.filter((a) => a.status === "available").length;
  const busy = availability.filter((a) => a.status === "busy").length;
  const activeAsg = assignments.filter((a) => ["assigned","in_progress"].includes(a.status)).length;
  const completedAsg = assignments.filter((a) => a.status === "completed").length;
  const failedAsg = assignments.filter((a) => a.status === "failed").length;

  const availabilityMap = Object.fromEntries(availability.map((a) => [a.supplier_id, a.status]));

  return (
    <FounderLayout>
      <div className="space-y-6 max-w-7xl mx-auto">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Suppliers & Operators</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Source, approve, and assign suppliers to won deals.
            </p>
          </div>
          <div className="flex gap-2">
            <Link to="/founder/assignments">
              <Button variant="outline" size="sm">View Assignments</Button>
            </Link>
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button size="sm"><Plus className="h-4 w-4 mr-1" /> Add Supplier</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Add new supplier</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <div><Label>Email *</Label><Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="supplier@example.com" /></div>
                  <div><Label>Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label>Company</Label><Input value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} /></div>
                    <div><Label>Role</Label><Input value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} /></div>
                  </div>
                  <div><Label>Business (assign pool)</Label><Input value={form.business_name} onChange={(e) => setForm({ ...form, business_name: e.target.value })} placeholder="leave blank for global pool" /></div>
                  <div><Label>Source</Label><Input value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })} placeholder="e.g. referral, sourced" /></div>
                </div>
                <DialogFooter>
                  <Button onClick={createSupplier} disabled={creating}>
                    {creating ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : null} Save
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard icon={<Users className="h-4 w-4" />} label="Total" value={total} />
          <StatCard icon={<ShieldCheck className="h-4 w-4 text-primary" />} label="Approved" value={approved} />
          <StatCard icon={<CheckCircle2 className="h-4 w-4 text-primary" />} label="Available" value={available} />
          <StatCard icon={<Clock className="h-4 w-4" />} label="Busy" value={busy} />
          <StatCard icon={<Clock className="h-4 w-4" />} label="Active assignments" value={activeAsg} />
          <StatCard icon={<CheckCircle2 className="h-4 w-4 text-primary" />} label="Completed" value={completedAsg} />
          <StatCard icon={<XCircle className="h-4 w-4 text-destructive" />} label="Failed" value={failedAsg} />
        </div>

        <Card className="tech-card">
          <CardHeader><CardTitle className="text-sm">All suppliers</CardTitle></CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <p className="p-4 text-sm text-muted-foreground">Loading…</p>
            ) : suppliers.length === 0 ? (
              <p className="p-4 text-sm text-muted-foreground">No suppliers yet. Add your first.</p>
            ) : (
              <ul className="divide-y divide-border/50">
                {suppliers.map((s) => (
                  <li key={s.id}>
                    <Link to={`/founder/suppliers/${s.id}`} className="flex items-center justify-between p-4 hover:bg-secondary/40 transition-colors">
                      <div>
                        <p className="text-sm font-medium">{s.name || s.email}</p>
                        <p className="text-xs text-muted-foreground">
                          {s.email} · {s.company || "—"} · {s.role || "—"} · {s.business_name || "global"}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={STATUS_VARIANT[s.status] as never}>{s.status}</Badge>
                        <Badge variant="outline" className="text-xs">{availabilityMap[s.id] || "—"}</Badge>
                      </div>
                    </Link>
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

const StatCard = ({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) => (
  <Card className="tech-card">
    <CardContent className="p-4">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">{icon}<span>{label}</span></div>
      <p className="text-2xl font-semibold mt-1">{value}</p>
    </CardContent>
  </Card>
);

export default SuppliersDashboard;