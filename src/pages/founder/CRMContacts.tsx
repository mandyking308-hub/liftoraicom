import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Plus, Search } from "lucide-react";
import FounderLayout from "@/components/founder/FounderLayout";
import CRMContact360Panel from "@/components/founder/crm/CRMContact360Panel";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { loadPortfolioContacts, type PortfolioContactRow } from "@/lib/portfolioCrmQueries";
import { ensureBusinessContactRelationship, resolveOrCreateContact } from "@/lib/businessContactRelationship";
import { toast } from "sonner";

const STATUSES = ["NEW", "CONTACTED", "ENGAGED", "QUALIFIED", "CLIENT", "SUPPLIER", "DO_NOT_CONTACT"];
const EDUCATION_TAG = "education_customer_universe";

const statusVariant = (s: string) => {
  if (s === "DO_NOT_CONTACT") return "destructive" as const;
  if (s === "CLIENT" || s === "QUALIFIED") return "default" as const;
  return "outline" as const;
};

function emailReadiness(c: PortfolioContactRow): { label: string; tone: "ok" | "warn" | "muted" } {
  const v = (c.email_verified_status ?? "").toLowerCase();
  if (c.email && (v === "" || v === "verified" || v === "exact" || v === "valid")) return { label: "Verified email", tone: "ok" };
  if (v === "reveal_required") return { label: "Reveal required", tone: "warn" };
  if (!c.email) return { label: "No email on file", tone: "muted" };
  return { label: v.replace(/_/g, " ") || "Unknown", tone: "warn" };
}

const CRMContacts = () => {
  const [params, setParams] = useSearchParams();
  const initialStatus = params.get("status") ?? "ALL";
  const dataset = params.get("dataset");
  const educationMode = dataset === "education";
  const [statusFilter, setStatusFilter] = useState<string>(initialStatus);
  const [search, setSearch] = useState(params.get("search") ?? "");
  const [contacts, setContacts] = useState<PortfolioContactRow[]>([]);
  const [businesses, setBusinesses] = useState<Array<{ id: string; name: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ email: "", name: "", company: "", role: "", source: "", business_id: "" });

  useEffect(() => {
    void load();
    void loadBusinesses();
  }, []);

  async function load() {
    setLoading(true);
    try {
      setContacts(await loadPortfolioContacts());
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function loadBusinesses() {
    const { data, error } = await supabase.from("businesses").select("id,name").order("name");
    if (error) {
      toast.error(`Could not load portfolio businesses: ${error.message}`);
      return;
    }
    setBusinesses(data ?? []);
  }

  const datasetScoped = useMemo(
    () => (educationMode ? contacts.filter((c) => (c.tags ?? []).includes(EDUCATION_TAG)) : contacts),
    [contacts, educationMode],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return datasetScoped.filter((c) => {
      if (statusFilter !== "ALL" && c.status !== statusFilter) return false;
      if (!q) return true;
      const relationshipNames = c.business_relationships.map((r) => r.business_name).join(" ");
      return `${c.email ?? ""} ${c.name ?? ""} ${c.company ?? ""} ${c.role ?? ""} ${relationshipNames}`.toLowerCase().includes(q);
    });
  }, [datasetScoped, search, statusFilter]);


  async function handleCreate() {
    if (!form.email.trim()) {
      toast.error("Email is required");
      return;
    }
    const business = form.business_id ? businesses.find((row) => row.id === form.business_id) : null;
    if (form.business_id && !business) {
      toast.error("Choose a current portfolio business or clear the relationship selection.");
      return;
    }

    try {
      const contactId = await resolveOrCreateContact(supabase, {
        email: form.email,
        name: form.name,
        company: form.company,
        role: form.role,
        source: form.source,
      });
      if (business) {
        await ensureBusinessContactRelationship(supabase, {
          contactId,
          businessId: business.id,
          businessName: business.name,
        });
      }
    } catch (error) {
      toast.error((error as Error).message || "Contact could not be saved.");
      return;
    }

    toast.success(business ? "Master contact and business relationship saved" : "Contact saved to master portfolio CRM");
    setOpen(false);
    setForm({ email: "", name: "", company: "", role: "", source: "", business_id: "" });
    void load();
  }

  function changeStatus(value: string) {
    setStatusFilter(value);
    const next: Record<string, string> = {};
    if (dataset) next.dataset = dataset;
    if (value !== "ALL") next.status = value;
    setParams(next);
  }


  return (
    <FounderLayout>
      <div className="mb-4"><CRMContact360Panel /></div>
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Contacts</h1>
            <p className="text-muted-foreground mt-1 text-sm">
              One master person record across the portfolio. Business relevance is many-to-many and lives in business relationships, not in a single assigned business.
            </p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="mr-2 h-4 w-4" /> Add contact</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add or update master contact</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                {[
                  { k: "email", label: "Email *" },
                  { k: "name", label: "Name" },
                  { k: "company", label: "Organisation / company" },
                  { k: "role", label: "Role" },
                  { k: "source", label: "Source" },
                ].map((f) => (
                  <div key={f.k} className="space-y-1.5">
                    <Label className="text-xs uppercase tracking-wider text-muted-foreground">{f.label}</Label>
                    <Input
                      value={(form as Record<string, string>)[f.k]}
                      onChange={(e) => setForm({ ...form, [f.k]: e.target.value })}
                    />
                  </div>
                ))}
                <div className="space-y-1.5">
                  <Label className="text-xs uppercase tracking-wider text-muted-foreground">Business relationship (optional)</Label>
                  <Select value={form.business_id || "_none"} onValueChange={(value) => setForm({ ...form, business_id: value === "_none" ? "" : value })}>
                    <SelectTrigger><SelectValue placeholder="No business relationship" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_none">No business relationship</SelectItem>
                      {businesses.map((business) => <SelectItem key={business.id} value={business.id}>{business.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <p className="text-xs text-muted-foreground">
                  This creates or resolves a business_contact_relationships record. The master person stays global; legacy assigned_business is not used for business scope.
                </p>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                <Button onClick={handleCreate}>Save</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {educationMode && (
          <Card className="tech-card border-primary/40">
            <CardContent className="p-4 flex items-center justify-between gap-4 flex-wrap">
              <div>
                <p className="text-sm font-semibold">Global Education Customer Universe</p>
                <p className="text-xs text-muted-foreground">
                  Master CRM records tagged <code>{EDUCATION_TAG}</code>. Read-only view — nothing here is sendable until a business relationship and campaign approve it.
                </p>
              </div>
              <div className="text-right">
                <p className="text-[10px] uppercase text-muted-foreground">Education contacts</p>
                <p className="text-xl font-bold text-primary">{loading ? "…" : datasetScoped.length}</p>
                <p className="text-[10px] text-muted-foreground">{filtered.length} shown with current filters</p>
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="tech-card">
          <CardContent className="p-4 space-y-4">
            <div className="flex flex-wrap gap-3 items-center">

              <div className="relative flex-1 min-w-[220px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search person, organisation or portfolio business" className="pl-9" />
              </div>
              <Select value={statusFilter} onValueChange={changeStatus}>
                <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All statuses</SelectItem>
                  {STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="rounded-lg border border-border/50 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Person</TableHead>
                    <TableHead>Email readiness</TableHead>
                    <TableHead>Organisation</TableHead>
                    <TableHead>Role / title</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Sendable</TableHead>
                    <TableHead>Portfolio relationships</TableHead>
                    <TableHead>Last reply</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-6">Loading…</TableCell></TableRow>
                  ) : filtered.length === 0 ? (
                    <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-6">No contacts yet.</TableCell></TableRow>
                  ) : (
                    filtered.map((c) => {
                      const readiness = emailReadiness(c);
                      return (
                      <TableRow key={c.id}>
                        <TableCell>
                          <Link to={`/founder/crm/contacts/${c.id}`} className="font-medium hover:text-primary">{c.name || c.email || "Unnamed contact"}</Link>
                          <div className="text-xs text-muted-foreground">{c.email || "No email on file"}</div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={readiness.tone === "ok" ? "default" : "outline"}
                            className={`text-[10px] ${readiness.tone === "warn" ? "text-yellow-300 border-yellow-300/40" : ""}`}
                          >
                            {readiness.label}
                          </Badge>
                        </TableCell>
                        <TableCell>{c.company || "—"}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{c.role || "—"}</TableCell>
                        <TableCell><Badge variant={statusVariant(c.status)}>{c.status}</Badge></TableCell>
                        <TableCell className="text-xs text-muted-foreground">{(c.sendable_status ?? "unknown").replace(/_/g, " ")}</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {c.business_relationships.length === 0 ? (
                              <span className="text-xs text-muted-foreground">No business relationship yet</span>
                            ) : c.business_relationships.map((r) => (
                              <Badge key={r.id} variant={r.do_not_contact ? "destructive" : "outline"} className="text-[10px]">
                                {r.business_name} · {r.qualification}
                              </Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-xs">
                          {c.last_replied_at ? new Date(c.last_replied_at).toLocaleString() : "—"}
                        </TableCell>
                      </TableRow>
                      );
                    })
                  )}
                </TableBody>

              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </FounderLayout>
  );
};

export default CRMContacts;
