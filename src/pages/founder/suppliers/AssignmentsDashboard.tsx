import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Loader2, ShieldCheck, Clock, AlertTriangle, RefreshCw, CheckCheck } from "lucide-react";
import FounderLayout from "@/components/founder/FounderLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Assignment = {
  id: string;
  supplier_id: string;
  deal_id: string;
  business_name: string;
  status: "assigned" | "in_progress" | "completed" | "failed";
  assigned_at: string;
  completed_at: string | null;
  auto_assigned: boolean;
  share_contact_details: boolean;
  supplier_note: string;
  expected_completion_date: string | null;
  sla_status: "on_track" | "at_risk" | "overdue" | "n_a";
  completion_confirmed_by_founder: boolean;
  requires_finance_action: boolean;
  acknowledged_at: string | null;
};
type Deal = { id: string; deal_name: string; business_name: string; contact_id: string | null; status: string };
type Supplier = { id: string; name: string; email: string; business_name: string; status: string; supplier_score?: number };

const STATUS_TABS = ["all","assigned","in_progress","completed","failed"] as const;

const AssignmentsDashboard = () => {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [suppliers, setSuppliers] = useState<Record<string, Supplier>>({});
  const [deals, setDeals] = useState<Record<string, Deal>>({});
  const [filter, setFilter] = useState<typeof STATUS_TABS[number]>("all");
  const [loading, setLoading] = useState(true);

  // Manual create
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [eligibleDeals, setEligibleDeals] = useState<Deal[]>([]);
  const [chosenDeal, setChosenDeal] = useState<string>("");
  const [eligibleSuppliers, setEligibleSuppliers] = useState<Supplier[]>([]);
  const [chosenSupplier, setChosenSupplier] = useState<string>("");

  useEffect(() => { void load(); }, []);

  async function load() {
    setLoading(true);
    const [a, s, d] = await Promise.all([
      supabase.from("assignments").select("*").order("assigned_at", { ascending: false }).limit(200),
      supabase.from("suppliers").select("id, name, email, business_name, status"),
      supabase.from("deals").select("id, deal_name, business_name, contact_id, status").eq("status","WON").order("won_at", { ascending: false }).limit(100),
    ]);
    setAssignments((a.data as Assignment[]) ?? []);
    setSuppliers(Object.fromEntries(((s.data as Supplier[]) ?? []).map((x) => [x.id, x])));
    setDeals(Object.fromEntries(((d.data as Deal[]) ?? []).map((x) => [x.id, x])));
    setEligibleDeals((d.data as Deal[]) ?? []);
    setLoading(false);
  }

  async function loadEligibleSuppliersForDeal(dealId: string) {
    setChosenSupplier("");
    if (!dealId) { setEligibleSuppliers([]); return; }
    const { data, error } = await supabase.rpc("eligible_suppliers_for_deal", { _deal_id: dealId });
    if (error) { toast.error(error.message); return; }
    setEligibleSuppliers((data as Supplier[]) ?? []);
  }

  async function createAssignment() {
    if (!chosenDeal || !chosenSupplier) {
      toast.error("Pick a deal and a supplier");
      return;
    }
    const deal = deals[chosenDeal] || eligibleDeals.find((d) => d.id === chosenDeal);
    if (!deal) return;
    setCreating(true);
    const { error } = await supabase.from("assignments").insert({
      supplier_id: chosenSupplier,
      deal_id: chosenDeal,
      contact_id: deal.contact_id,
      business_name: deal.business_name || "",
    });
    setCreating(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Assignment created");
    setOpen(false);
    setChosenDeal(""); setChosenSupplier(""); setEligibleSuppliers([]);
    void load();
  }

  async function updateStatus(id: string, status: Assignment["status"]) {
    const { error } = await supabase.from("assignments").update({ status } as never).eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Status updated");
    void load();
  }

  async function toggleShareContact(a: Assignment) {
    const { error } = await supabase
      .from("assignments")
      .update({ share_contact_details: !a.share_contact_details } as never)
      .eq("id", a.id);
    if (error) { toast.error(error.message); return; }
    void load();
  }

  async function confirmCompletion(a: Assignment) {
    const { data, error } = await supabase.rpc("founder_confirm_assignment", { _assignment_id: a.id });
    const r = data as { ok: boolean; error?: string } | null;
    if (error || !r?.ok) {
      toast.error(r?.error?.replace(/_/g, " ").toLowerCase() || error?.message || "Confirm failed");
      return;
    }
    toast.success("Confirmed — finance flagged for billing");
    void load();
  }

  async function setExpectedDate(a: Assignment, date: string) {
    const { error } = await supabase
      .from("assignments")
      .update({ expected_completion_date: date || null } as never)
      .eq("id", a.id);
    if (error) { toast.error(error.message); return; }
    void load();
  }

  // Reassignment suggestion dialog
  const [suggestFor, setSuggestFor] = useState<Assignment | null>(null);
  const [suggestions, setSuggestions] = useState<Supplier[]>([]);
  const [suggestLoading, setSuggestLoading] = useState(false);
  const [reassigning, setReassigning] = useState<string | null>(null);

  async function openSuggestions(a: Assignment) {
    setSuggestFor(a);
    setSuggestions([]);
    setSuggestLoading(true);
    const { data, error } = await supabase.rpc("suggest_replacement_supplier", { _assignment_id: a.id });
    setSuggestLoading(false);
    if (error) { toast.error(error.message); return; }
    setSuggestions((data as Supplier[]) ?? []);
  }

  async function reassignTo(supplierId: string) {
    if (!suggestFor) return;
    setReassigning(supplierId);
    // Mark current as failed if not already, then create a fresh assignment
    if (suggestFor.status !== "failed") {
      await supabase.from("assignments").update({ status: "failed" } as never).eq("id", suggestFor.id);
    }
    const { error } = await supabase.from("assignments").insert({
      supplier_id: supplierId,
      deal_id: suggestFor.deal_id,
      business_name: suggestFor.business_name,
      status: "assigned",
      auto_assigned: false,
    });
    setReassigning(null);
    if (error) { toast.error(error.message); return; }
    toast.success("Reassigned");
    setSuggestFor(null);
    void load();
  }

  const filtered = filter === "all" ? assignments : assignments.filter((a) => a.status === filter);

  const counts = {
    all: assignments.length,
    assigned: assignments.filter((a) => a.status === "assigned").length,
    in_progress: assignments.filter((a) => a.status === "in_progress").length,
    completed: assignments.filter((a) => a.status === "completed").length,
    failed: assignments.filter((a) => a.status === "failed").length,
  };

  return (
    <FounderLayout>
      <div className="space-y-6 max-w-7xl mx-auto">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Assignments</h1>
            <p className="text-sm text-muted-foreground mt-1">Suppliers assigned to won deals.</p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="h-4 w-4 mr-1" /> New assignment</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Assign supplier to deal</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div>
                  <Label>Won deal</Label>
                  <Select value={chosenDeal} onValueChange={(v) => { setChosenDeal(v); void loadEligibleSuppliersForDeal(v); }}>
                    <SelectTrigger><SelectValue placeholder="Select a won deal" /></SelectTrigger>
                    <SelectContent>
                      {eligibleDeals.map((d) => (
                        <SelectItem key={d.id} value={d.id}>{d.deal_name} ({d.business_name || "—"})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Eligible supplier</Label>
                  <Select value={chosenSupplier} onValueChange={setChosenSupplier} disabled={!chosenDeal}>
                    <SelectTrigger><SelectValue placeholder={chosenDeal ? "Pick supplier" : "Pick a deal first"} /></SelectTrigger>
                    <SelectContent>
                      {eligibleSuppliers.length === 0 ? (
                        <SelectItem value="none" disabled>No eligible suppliers</SelectItem>
                      ) : eligibleSuppliers.map((s) => (
                        <SelectItem key={s.id} value={s.id}>{s.name || s.email} ({s.business_name || "global"})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">Only APPROVED + available suppliers shown.</p>
                </div>
              </div>
              <DialogFooter>
                <Button onClick={createAssignment} disabled={creating || !chosenDeal || !chosenSupplier}>
                  {creating ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : null} Create
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <Tabs value={filter} onValueChange={(v) => setFilter(v as typeof STATUS_TABS[number])}>
          <TabsList>
            {STATUS_TABS.map((t) => (
              <TabsTrigger key={t} value={t} className="capitalize">
                {t.replace("_"," ")} ({counts[t]})
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        <Card className="tech-card">
          <CardHeader><CardTitle className="text-sm">All assignments</CardTitle></CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <p className="p-4 text-sm text-muted-foreground">Loading…</p>
            ) : filtered.length === 0 ? (
              <p className="p-4 text-sm text-muted-foreground">No assignments in this view.</p>
            ) : (
              <ul className="divide-y divide-border/50">
                {filtered.map((a) => {
                  const sup = suppliers[a.supplier_id];
                  const deal = deals[a.deal_id];
                  return (
                    <li key={a.id} className="p-4 flex items-center justify-between gap-3 flex-wrap">
                      <div className="text-sm">
                        <div className="flex items-center gap-2">
                          <Link to={`/founder/suppliers/${a.supplier_id}`} className="font-medium hover:underline">
                            {sup?.name || sup?.email || a.supplier_id.slice(0,8)}
                          </Link>
                          <span className="text-muted-foreground">→</span>
                          <span>{deal?.deal_name || a.deal_id.slice(0,8)}</span>
                          {a.auto_assigned && <Badge variant="outline" className="text-xs">auto</Badge>}
                          {a.sla_status === "overdue" && (
                            <Badge variant="destructive" className="text-xs gap-1">
                              <AlertTriangle className="h-3 w-3" /> overdue
                            </Badge>
                          )}
                          {a.sla_status === "at_risk" && (
                            <Badge variant="outline" className="text-xs gap-1">
                              <Clock className="h-3 w-3" /> at risk
                            </Badge>
                          )}
                          {a.completion_confirmed_by_founder && (
                            <Badge variant="outline" className="text-xs gap-1 border-primary/50 text-primary">
                              <ShieldCheck className="h-3 w-3" /> confirmed
                            </Badge>
                          )}
                          {a.requires_finance_action && (
                            <Badge variant="outline" className="text-xs">finance →</Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {a.business_name || "—"} · {new Date(a.assigned_at).toLocaleString()}
                        </p>
                        <div className="flex items-center gap-2 mt-1.5">
                          <Label className="text-xs text-muted-foreground">SLA:</Label>
                          <input
                            type="date"
                            className="bg-background border border-border/60 rounded px-2 py-0.5 text-xs"
                            defaultValue={a.expected_completion_date ?? ""}
                            onBlur={(e) => {
                              if ((e.target.value || null) !== a.expected_completion_date) {
                                void setExpectedDate(a, e.target.value);
                              }
                            }}
                          />
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="capitalize">{a.status.replace("_"," ")}</Badge>
                        <Select value={a.status} onValueChange={(v) => updateStatus(a.id, v as Assignment["status"])}>
                          <SelectTrigger className="w-[140px] h-8 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="assigned">assigned</SelectItem>
                            <SelectItem value="in_progress">in progress</SelectItem>
                            <SelectItem value="completed">completed</SelectItem>
                            <SelectItem value="failed">failed</SelectItem>
                          </SelectContent>
                        </Select>
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground" title="Share client contact email with supplier">
                          <Switch
                            checked={a.share_contact_details}
                            onCheckedChange={() => toggleShareContact(a)}
                          />
                          <span>share contact</span>
                        </div>
                        {a.status === "completed" && !a.completion_confirmed_by_founder && (
                          <Button size="sm" variant="outline" onClick={() => confirmCompletion(a)}>
                            <ShieldCheck className="h-3 w-3 mr-1" /> Confirm
                          </Button>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </FounderLayout>
  );
};

export default AssignmentsDashboard;