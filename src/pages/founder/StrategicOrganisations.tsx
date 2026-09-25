import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import FounderLayout from "@/components/founder/FounderLayout";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ArrowUpDown, Search, Loader2 } from "lucide-react";

type Org = {
  id: string; name: string; category: string | null; geography: string | null;
  access_model: string | null; membership_cost_text: string | null; us_relevance: string | null;
  online_usefulness: string | null; primary_value: string | null; status: string;
  website: string | null; notes: string | null; last_reviewed_at: string | null;
};

const COLS: { key: keyof Org; label: string }[] = [
  { key: "name", label: "Organisation" },
  { key: "category", label: "Category" },
  { key: "geography", label: "Geography" },
  { key: "access_model", label: "Access" },
  { key: "membership_cost_text", label: "Cost" },
  { key: "us_relevance", label: "US relevance" },
  { key: "online_usefulness", label: "Online usefulness" },
  { key: "status", label: "Status" },
];

const FIELDS: { key: keyof Org; label: string; long?: boolean }[] = [
  { key: "category", label: "Category" }, { key: "geography", label: "Geography" },
  { key: "access_model", label: "Access model" }, { key: "membership_cost_text", label: "Membership cost" },
  { key: "us_relevance", label: "US relevance" }, { key: "online_usefulness", label: "Online usefulness" },
  { key: "status", label: "Status" }, { key: "website", label: "Website" },
  { key: "primary_value", label: "Primary value", long: true }, { key: "notes", label: "Notes", long: true },
];

// Standalone register — intentionally not linked to CRM, contacts, relationship intelligence or outreach.
const table = () => (supabase as any).from("strategic_organisation_register");

export default function StrategicOrganisations() {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<{ key: keyof Org; asc: boolean }>({ key: "name", asc: true });
  const [edit, setEdit] = useState<Org | null>(null);
  const [saving, setSaving] = useState(false);

  const { data = [], isLoading } = useQuery({
    queryKey: ["strategic-org-register"],
    queryFn: async () => {
      const { data, error } = await table().select("*").order("name");
      if (error) throw error;
      return data as Org[];
    },
  });

  const rows = useMemo(() => {
    const s = q.trim().toLowerCase();
    const f = s ? data.filter((r) => COLS.some((c) => String(r[c.key] ?? "").toLowerCase().includes(s)) || (r.notes ?? "").toLowerCase().includes(s)) : data;
    return [...f].sort((a, b) => {
      const av = String(a[sort.key] ?? ""), bv = String(b[sort.key] ?? "");
      return (sort.asc ? 1 : -1) * av.localeCompare(bv);
    });
  }, [data, q, sort]);

  const save = async () => {
    if (!edit) return;
    setSaving(true);
    const patch: Record<string, unknown> = { last_reviewed_at: new Date().toISOString() };
    FIELDS.forEach((f) => { const v = edit[f.key]; patch[f.key] = typeof v === "string" && v.trim() === "" ? (f.key === "status" ? "researching" : null) : v; });
    const { error } = await table().update(patch).eq("id", edit.id);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Saved");
    setEdit(null);
    qc.invalidateQueries({ queryKey: ["strategic-org-register"] });
  };

  return (
    <FounderLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Strategic Organisations & Networks</h1>
          <p className="text-sm text-muted-foreground">Founder-only research register. Separate from CRM and outreach. {data.length} organisations.</p>
        </div>
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
          <Input className="pl-9" placeholder="Search organisations…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <div className="tech-card overflow-x-auto">
          {isLoading ? <div className="p-8 flex justify-center"><Loader2 className="animate-spin text-primary" /></div> : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-muted-foreground">
                  {COLS.map((c) => (
                    <th key={c.key} className="p-3 font-medium">
                      <button className="inline-flex items-center gap-1 hover:text-foreground" onClick={() => setSort((s) => ({ key: c.key, asc: s.key === c.key ? !s.asc : true }))}>
                        {c.label}<ArrowUpDown size={12} />
                      </button>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-b border-border/50 hover:bg-muted/30 cursor-pointer" onClick={() => setEdit({ ...r })}>
                    {COLS.map((c) => (
                      <td key={c.key} className="p-3 text-foreground">
                        {c.key === "status" ? <Badge variant="outline">{r.status}</Badge> : (r[c.key] as string) || <span className="text-muted-foreground">—</span>}
                      </td>
                    ))}
                  </tr>
                ))}
                {rows.length === 0 && <tr><td colSpan={COLS.length} className="p-6 text-center text-muted-foreground">No matches</td></tr>}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <Dialog open={!!edit} onOpenChange={(o) => !o && setEdit(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{edit?.name}</DialogTitle>
            <DialogDescription>
              Last reviewed: {edit?.last_reviewed_at ? new Date(edit.last_reviewed_at).toLocaleString() : "never"}
            </DialogDescription>
          </DialogHeader>
          {edit && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {FIELDS.map((f) => (
                <div key={f.key} className={f.long ? "sm:col-span-2 space-y-1" : "space-y-1"}>
                  <Label>{f.label}</Label>
                  {f.long ? (
                    <Textarea rows={3} value={(edit[f.key] as string) ?? ""} onChange={(e) => setEdit({ ...edit, [f.key]: e.target.value })} />
                  ) : (
                    <Input value={(edit[f.key] as string) ?? ""} onChange={(e) => setEdit({ ...edit, [f.key]: e.target.value })} />
                  )}
                </div>
              ))}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEdit(null)}>Cancel</Button>
            <Button onClick={save} disabled={saving}>{saving && <Loader2 className="animate-spin" size={14} />}Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </FounderLayout>
  );
}
