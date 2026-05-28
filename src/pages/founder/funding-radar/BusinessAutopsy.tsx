import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { FundingRadarLayout, FRSection } from "./_shared";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Stethoscope, ArrowRight, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { AUTOPSY_FORBIDDEN_COPYING, AUTOPSY_ALLOWED_EXTRACTION } from "@/lib/fundingRadarEngine";
import { z } from "zod";

const schema = z.object({
  company_name: z.string().trim().min(1, "Required").max(200),
  website: z.string().trim().max(500).optional().or(z.literal("")),
  funding_source: z.string().trim().max(500).optional().or(z.literal("")),
  sector: z.string().trim().max(200).optional().or(z.literal("")),
  country: z.string().trim().max(200).optional().or(z.literal("")),
  reason_for_analysis: z.string().trim().max(2000).optional().or(z.literal("")),
  competitor_notes: z.string().trim().max(4000).optional().or(z.literal("")),
  uploaded_research: z.string().trim().max(20000).optional().or(z.literal("")),
});

export default function BusinessAutopsyList() {
  const [rows, setRows] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ company_name: "", website: "", funding_source: "", sector: "", country: "", reason_for_analysis: "", competitor_notes: "", uploaded_research: "" });

  const load = async () => {
    const { data } = await (supabase as any).from("business_autopsies").select("id,company_name,sector,country,recommendation,approval_status,created_at").order("created_at", { ascending: false });
    setRows(data ?? []);
  };
  useEffect(() => { load(); }, []);

  const submit = async () => {
    const parsed = schema.safeParse(form);
    if (!parsed.success) { toast.error(parsed.error.errors[0]?.message ?? "Invalid input"); return; }
    setSubmitting(true);
    const { data: auth } = await (supabase as any).auth.getUser();
    if (!auth?.user?.id) { toast.error("Not authenticated"); setSubmitting(false); return; }
    const { error } = await (supabase as any).from("business_autopsies").insert({
      created_by: auth.user.id,
      company_name: parsed.data.company_name,
      website: parsed.data.website || null,
      funding_source: parsed.data.funding_source || null,
      sector: parsed.data.sector || null,
      country: parsed.data.country || null,
      reason_for_analysis: parsed.data.reason_for_analysis || null,
      competitor_notes: parsed.data.competitor_notes || null,
      uploaded_research: parsed.data.uploaded_research || null,
      source_kind: "manual",
      legal_warnings: [
        "Never copy: " + AUTOPSY_FORBIDDEN_COPYING.join(", "),
        "Only extract: " + AUTOPSY_ALLOWED_EXTRACTION.join(", "),
      ],
    });
    setSubmitting(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Autopsy created");
    setForm({ company_name: "", website: "", funding_source: "", sector: "", country: "", reason_for_analysis: "", competitor_notes: "", uploaded_research: "" });
    setOpen(false); load();
  };

  return (
    <FundingRadarLayout title="Business Autopsy" subtitle="Study public, manual or uploaded evidence on a funded company or category. Extract validated customer pain and weakness signals, then generate a legally distinct Better Build Pack. No copying, no scraping, no outbound action.">
      <FRSection title="Legal & data-source rules" actions={<Button size="sm" onClick={() => setOpen(!open)}><Plus className="h-3 w-3 mr-1" />New autopsy</Button>}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          <div className="border border-amber-500/20 rounded p-2">
            <p className="text-[10px] uppercase text-amber-300 mb-1 flex items-center gap-1"><AlertTriangle className="h-3 w-3" />Never copy</p>
            <div className="flex flex-wrap gap-1">{AUTOPSY_FORBIDDEN_COPYING.map((f) => (<Badge key={f} variant="outline" className="text-[10px] border-amber-500/30 text-amber-300">{f}</Badge>))}</div>
          </div>
          <div className="border border-primary/20 rounded p-2">
            <p className="text-[10px] uppercase text-primary mb-1">Only extract</p>
            <div className="flex flex-wrap gap-1">{AUTOPSY_ALLOWED_EXTRACTION.map((f) => (<Badge key={f} variant="outline" className="text-[10px] border-primary/30 text-primary">{f}</Badge>))}</div>
          </div>
        </div>
        <p className="text-[11px] text-muted-foreground mt-2">Allowed sources: public web pages, founder-uploaded research, manually entered notes, founder-approved licensed datasets. No restricted scraping, no contact with external parties.</p>
      </FRSection>

      {open && (
        <FRSection title="New autopsy">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            <Field label="Company name *" v={form.company_name} on={(v) => setForm({ ...form, company_name: v })} />
            <Field label="Website" v={form.website} on={(v) => setForm({ ...form, website: v })} />
            <Field label="Funding source / link" v={form.funding_source} on={(v) => setForm({ ...form, funding_source: v })} />
            <Field label="Sector" v={form.sector} on={(v) => setForm({ ...form, sector: v })} />
            <Field label="Country / geography" v={form.country} on={(v) => setForm({ ...form, country: v })} />
            <Field label="Reason for analysis" v={form.reason_for_analysis} on={(v) => setForm({ ...form, reason_for_analysis: v })} />
            <TextField label="Competitor / category notes" v={form.competitor_notes} on={(v) => setForm({ ...form, competitor_notes: v })} />
            <TextField label="Uploaded / manual research" v={form.uploaded_research} on={(v) => setForm({ ...form, uploaded_research: v })} />
          </div>
          <div className="flex justify-end gap-2 mt-3">
            <Button size="sm" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button size="sm" onClick={submit} disabled={submitting}>{submitting ? "Saving…" : "Create autopsy"}</Button>
          </div>
        </FRSection>
      )}

      <FRSection title="Autopsies">
        {rows.length === 0 ? (
          <p className="text-xs text-muted-foreground italic">None yet — create your first autopsy to study a funded company or category.</p>
        ) : (
          <div className="space-y-2">
            {rows.map((r) => (
              <Card key={r.id} className="tech-card"><CardContent className="py-3 flex items-center justify-between gap-3 text-xs">
                <div className="min-w-0">
                  <p className="font-medium flex items-center gap-2"><Stethoscope className="h-3 w-3 text-primary" />{r.company_name}</p>
                  <p className="text-muted-foreground truncate">{[r.sector, r.country].filter(Boolean).join(" · ") || "—"}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-[10px]">{r.recommendation}</Badge>
                  <Badge variant="outline" className="text-[10px]">{r.approval_status}</Badge>
                  <Button asChild size="sm" variant="outline"><Link to={`/founder/funding-radar/business-autopsy/${r.id}`}>Open <ArrowRight className="h-3 w-3 ml-1" /></Link></Button>
                </div>
              </CardContent></Card>
            ))}
          </div>
        )}
      </FRSection>
    </FundingRadarLayout>
  );
}

function Field({ label, v, on }: { label: string; v: string; on: (s: string) => void }) {
  return <div><Label className="text-[10px] uppercase text-muted-foreground">{label}</Label><Input value={v} onChange={(e) => on(e.target.value)} className="h-8 text-xs" /></div>;
}
function TextField({ label, v, on }: { label: string; v: string; on: (s: string) => void }) {
  return <div className="md:col-span-2"><Label className="text-[10px] uppercase text-muted-foreground">{label}</Label><Textarea value={v} onChange={(e) => on(e.target.value)} className="text-xs min-h-[80px]" /></div>;
}