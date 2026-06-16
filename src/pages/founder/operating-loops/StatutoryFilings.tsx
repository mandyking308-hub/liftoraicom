import { useEffect, useState } from "react";
import { OLLayout, OLSection, StatusBadge } from "./_shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { bucketFilings, createFiling, fetchFilings, FILING_CATEGORIES, FILING_STATUSES, updateFiling, type StatutoryFiling } from "@/lib/operatingLoops/statutoryFilingsEngine";
import { toast } from "sonner";

export default function StatutoryFilingsPage() {
  const [rows, setRows] = useState<StatutoryFiling[]>([]);
  const [name, setName] = useState(""); const [category, setCategory] = useState<string>("corporate"); const [due, setDue] = useState("");
  const reload = () => fetchFilings().then(setRows).catch(e => toast.error(e.message));
  useEffect(() => { reload(); }, []);
  const b = bucketFilings(rows);

  const add = async () => {
    if (!name.trim()) return;
    try { await createFiling({ filing_name: name.trim(), filing_category: category, due_date: due || null }); setName(""); setDue(""); reload(); toast.success("Filing added."); }
    catch (e: any) { toast.error(e.message); }
  };

  const setStatus = async (id: string, status: string) => { try { await updateFiling(id, { status }); reload(); } catch (e: any) { toast.error(e.message); } };

  const Bucket = ({ label, items }: { label: string; items: StatutoryFiling[] }) => (
    <OLSection title={`${label} (${items.length})`}>
      {items.length === 0 ? <p className="text-muted-foreground">None.</p> : (
        <div className="space-y-1">{items.map(r => (
          <div key={r.id} className="flex items-center justify-between border-b border-border/20 py-1">
            <div><span className="font-medium">{r.filing_name}</span> <span className="text-muted-foreground">· {r.filing_category} · {r.jurisdiction ?? "—"} · due {r.due_date ?? "—"}</span></div>
            <StatusBadge status={r.status} />
          </div>
        ))}</div>
      )}
    </OLSection>
  );

  return (
    <OLLayout title="Statutory filings & tax calendar"
      subtitle="Corporate, tax, VAT, accounts, licences, regulatory and payroll obligations in one calendar."
      disclaimer="Liftor does not file anything, calculate tax due, or contact authorities. Tracking and evidence only.">
      <OLSection title="Add filing">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
          <Input placeholder="Filing name" value={name} onChange={e => setName(e.target.value)} />
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
            <SelectContent>{FILING_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c.replace(/_/g," ")}</SelectItem>)}</SelectContent>
          </Select>
          <Input type="date" value={due} onChange={e => setDue(e.target.value)} />
          <Button onClick={add}>Add</Button>
        </div>
      </OLSection>
      <Bucket label="Overdue" items={b.overdue} />
      <Bucket label="Due in 30 days" items={b.in30} />
      <Bucket label="Due in 60 days" items={b.in60} />
      <Bucket label="Due in 90 days" items={b.in90} />
      <Bucket label="With adviser" items={b.withAdviser} />
      <Bucket label="Founder review" items={b.founderReview} />
      <Bucket label="Evidence missing" items={b.evidenceMissing} />
      <OLSection title={`All filings (${rows.length})`}>
        <div className="overflow-x-auto"><table className="w-full text-xs">
          <thead className="text-[10px] uppercase text-muted-foreground border-b border-border/40"><tr><th className="text-left p-2">Name</th><th className="text-left p-2">Category</th><th className="text-left p-2">Due</th><th className="text-left p-2">Status</th><th className="p-2"></th></tr></thead>
          <tbody>{rows.map(r => (
            <tr key={r.id} className="border-b border-border/20">
              <td className="p-2">{r.filing_name}</td><td className="p-2 text-muted-foreground">{r.filing_category}</td>
              <td className="p-2 text-muted-foreground">{r.due_date ?? "—"}</td><td className="p-2"><StatusBadge status={r.status} /></td>
              <td className="p-2">
                <Select value={r.status} onValueChange={(v) => setStatus(r.id, v)}>
                  <SelectTrigger className="h-7 w-[170px] text-[10px]"><SelectValue /></SelectTrigger>
                  <SelectContent>{FILING_STATUSES.map(s => <SelectItem key={s} value={s} className="text-xs">{s.replace(/_/g," ")}</SelectItem>)}</SelectContent>
                </Select>
              </td>
            </tr>
          ))}</tbody>
        </table></div>
      </OLSection>
    </OLLayout>
  );
}
