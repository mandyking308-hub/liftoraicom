import { useEffect, useState } from "react";
import { FundingRadarLayout, FRSection, FRStat } from "./_shared";
import { fetchMonthlyRuns } from "@/lib/fundingRadarEngine";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";

const now = () => ({ month: new Date().getMonth() + 1, year: new Date().getFullYear() });

export default function FRMonthlyRun() {
  const [rows, setRows] = useState<any[]>([]);
  const [draft, setDraft] = useState<any>({ ...now(), notes: "", candidates_reviewed: 0, shortlist_size: 0 });
  const reload = () => fetchMonthlyRuns().then(setRows).catch(() => setRows([]));
  useEffect(() => { reload(); }, []);

  const startRun = async () => {
    const { error } = await (supabase as any).from("funding_monthly_runs").insert({
      month: draft.month, year: draft.year, status: "draft",
      candidates_reviewed: Number(draft.candidates_reviewed) || 0,
      shortlist_size: Number(draft.shortlist_size) || 0,
      notes: draft.notes || null,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Run started");
    reload();
  };

  const finalise = async (id: string) => {
    const { error } = await (supabase as any).from("funding_monthly_runs").update({ status: "finalised", finalised_at: new Date().toISOString() }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    reload();
  };

  const latest = rows[0];

  return (
    <FundingRadarLayout title="Monthly run" subtitle="A monthly cadence for reviewing the funding radar and producing a shortlist.">
      {latest && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <FRStat label="Latest month" value={`${latest.month}/${latest.year}`} />
          <FRStat label="Status" value={latest.status} />
          <FRStat label="Reviewed" value={latest.candidates_reviewed} />
          <FRStat label="Shortlist" value={latest.shortlist_size} />
        </div>
      )}

      <FRSection title="Start / log a monthly run">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <div><Label className="text-xs">Month</Label><Input type="number" min={1} max={12} value={draft.month} onChange={(e) => setDraft({ ...draft, month: Number(e.target.value) })} /></div>
          <div><Label className="text-xs">Year</Label><Input type="number" value={draft.year} onChange={(e) => setDraft({ ...draft, year: Number(e.target.value) })} /></div>
          <div><Label className="text-xs">Reviewed</Label><Input type="number" value={draft.candidates_reviewed} onChange={(e) => setDraft({ ...draft, candidates_reviewed: e.target.value })} /></div>
          <div><Label className="text-xs">Shortlist size</Label><Input type="number" value={draft.shortlist_size} onChange={(e) => setDraft({ ...draft, shortlist_size: e.target.value })} /></div>
          <div className="flex items-end"><Button onClick={startRun}>Start / log run</Button></div>
          <div className="md:col-span-5"><Label className="text-xs">Notes</Label><Textarea rows={2} value={draft.notes} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} /></div>
        </div>
      </FRSection>

      <FRSection title="History">
        {rows.length === 0 ? <p className="text-sm text-muted-foreground text-center py-8">No runs yet.</p> : (
          <Table>
            <TableHeader><TableRow>
              <TableHead>Month</TableHead><TableHead>Status</TableHead><TableHead>Reviewed</TableHead><TableHead>Shortlist</TableHead><TableHead>Notes</TableHead><TableHead></TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="text-xs">{r.month}/{r.year}</TableCell>
                  <TableCell className="text-xs">{r.status}</TableCell>
                  <TableCell className="text-xs">{r.candidates_reviewed}</TableCell>
                  <TableCell className="text-xs">{r.shortlist_size}</TableCell>
                  <TableCell className="text-xs text-muted-foreground max-w-[320px] truncate">{r.notes ?? "—"}</TableCell>
                  <TableCell className="text-xs">{r.status !== "finalised" && <Button size="sm" variant="outline" onClick={() => finalise(r.id)}>Finalise</Button>}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </FRSection>
    </FundingRadarLayout>
  );
}