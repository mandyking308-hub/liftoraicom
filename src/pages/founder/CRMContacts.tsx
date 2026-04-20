import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Plus, Search } from "lucide-react";
import FounderLayout from "@/components/founder/FounderLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Contact = {
  id: string;
  email: string;
  name: string;
  company: string;
  status: string;
  assigned_business: string;
  conversation_active: boolean;
  last_contacted_at: string | null;
  last_replied_at: string | null;
  created_at: string;
};

const STATUSES = ["NEW", "CONTACTED", "ENGAGED", "QUALIFIED", "CLIENT", "SUPPLIER", "DO_NOT_CONTACT"];

const statusVariant = (s: string) => {
  if (s === "DO_NOT_CONTACT") return "destructive" as const;
  if (s === "CLIENT" || s === "QUALIFIED") return "default" as const;
  return "outline" as const;
};

const CRMContacts = () => {
  const [params, setParams] = useSearchParams();
  const initialStatus = params.get("status") ?? "ALL";
  const [statusFilter, setStatusFilter] = useState<string>(initialStatus);
  const [search, setSearch] = useState("");
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ email: "", name: "", company: "", role: "", source: "", assigned_business: "" });

  useEffect(() => {
    void load();
  }, [statusFilter]);

  async function load() {
    setLoading(true);
    let q = supabase.from("contacts").select("*").order("created_at", { ascending: false }).limit(200);
    if (statusFilter !== "ALL") q = q.eq("status", statusFilter);
    const { data, error } = await q;
    if (error) toast.error(error.message);
    setContacts((data as Contact[]) ?? []);
    setLoading(false);
  }

  const filtered = useMemo(() => {
    if (!search.trim()) return contacts;
    const s = search.toLowerCase();
    return contacts.filter(
      (c) =>
        c.email.toLowerCase().includes(s) ||
        c.name.toLowerCase().includes(s) ||
        c.company.toLowerCase().includes(s),
    );
  }, [contacts, search]);

  async function handleCreate() {
    if (!form.email.trim()) {
      toast.error("Email is required");
      return;
    }
    const { error } = await supabase.rpc("upsert_contact", {
      _email: form.email.trim().toLowerCase(),
      _name: form.name || null,
      _company: form.company || null,
      _role: form.role || null,
      _source: form.source || null,
      _assigned_business: form.assigned_business || null,
      _assigned_inbox_id: null,
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Contact saved");
    setOpen(false);
    setForm({ email: "", name: "", company: "", role: "", source: "", assigned_business: "" });
    void load();
  }

  function changeStatus(value: string) {
    setStatusFilter(value);
    if (value === "ALL") setParams({});
    else setParams({ status: value });
  }

  return (
    <FounderLayout>
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Contacts</h1>
            <p className="text-muted-foreground mt-1 text-sm">Master contact registry — single source of truth across all businesses.</p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="mr-2 h-4 w-4" /> Add contact</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add or update contact</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                {[
                  { k: "email", label: "Email *" },
                  { k: "name", label: "Name" },
                  { k: "company", label: "Company" },
                  { k: "role", label: "Role" },
                  { k: "source", label: "Source" },
                  { k: "assigned_business", label: "Assigned business" },
                ].map((f) => (
                  <div key={f.k} className="space-y-1.5">
                    <Label className="text-xs uppercase tracking-wider text-muted-foreground">{f.label}</Label>
                    <Input
                      value={(form as Record<string, string>)[f.k]}
                      onChange={(e) => setForm({ ...form, [f.k]: e.target.value })}
                    />
                  </div>
                ))}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                <Button onClick={handleCreate}>Save</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <Card className="tech-card">
          <CardContent className="p-4 space-y-4">
            <div className="flex flex-wrap gap-3 items-center">
              <div className="relative flex-1 min-w-[220px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search email, name or company" className="pl-9" />
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
                    <TableHead>Email</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Business</TableHead>
                    <TableHead>Conversation</TableHead>
                    <TableHead>Last reply</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-6">Loading…</TableCell></TableRow>
                  ) : filtered.length === 0 ? (
                    <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-6">No contacts yet.</TableCell></TableRow>
                  ) : (
                    filtered.map((c) => (
                      <TableRow key={c.id}>
                        <TableCell className="font-medium">
                          <Link to={`/founder/crm/contacts/${c.id}`} className="hover:text-primary">{c.email}</Link>
                        </TableCell>
                        <TableCell>{c.name || "—"}</TableCell>
                        <TableCell>{c.company || "—"}</TableCell>
                        <TableCell><Badge variant={statusVariant(c.status)}>{c.status}</Badge></TableCell>
                        <TableCell>{c.assigned_business || "—"}</TableCell>
                        <TableCell>{c.conversation_active ? <Badge>Active</Badge> : <span className="text-muted-foreground text-xs">Idle</span>}</TableCell>
                        <TableCell className="text-muted-foreground text-xs">
                          {c.last_replied_at ? new Date(c.last_replied_at).toLocaleString() : "—"}
                        </TableCell>
                      </TableRow>
                    ))
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