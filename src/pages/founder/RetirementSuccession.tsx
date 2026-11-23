import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import FounderLayout from "@/components/founder/FounderLayout";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  buildCandidate, dedupeRows, parseBulk, economics, isDueDiligenceReady, fmtMoney,
  effectiveZeroUpfrontStatus, inZeroUpfrontShortlist, isZeroUpfrontDDReady, ZERO_UPFRONT_LABEL,
  SOURCE_STATUS_LABEL, SELLER_FINANCE_LABEL, type CandidateInput, type CandidateRow, type SellerFinance,
} from "@/lib/retirement/retirementAcquisition";

type Source = { source_key: string; name: string; url: string; access_mode: string; alert_status: string; scraping_allowed: boolean; terms_note: string | null; discovery_connector: string; last_checked_at: string | null };
type Candidate = CandidateRow & { id: string; status: string; first_seen_at: string; last_seen_at: string };
type Activity = { id: string; action: string; channel: string | null; inserted_count: number; updated_count: number; rejected_count: number; created_at: string };

// Tables are new; cast to keep this page independent of generated type timing.
const db = supabase as unknown as { from: (t: string) => any; rpc: (f: string, a: unknown) => any };

export function CandidateCard({ c }: { c: Candidate }) {
  const e = economics(c);
  const zc = c as any;
  const dd = isZeroUpfrontDDReady(zc);
  const zu = effectiveZeroUpfrontStatus(zc);
  return (
    <Card className="tech-card" data-testid="retirement-candidate">
      <CardContent className="p-4 space-y-2 text-xs">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <div className="text-sm font-semibold">{c.title}{c.is_test && <Badge variant="outline" className="ml-2">TEST</Badge>}</div>
            <div className="text-muted-foreground">{[c.sector, c.location].filter(Boolean).join(" · ") || "Sector/location unknown"}</div>
          </div>
          <div className="flex flex-wrap gap-1">
            <Badge variant={c.seller_finance_status === "explicit" ? "default" : "outline"}>{SELLER_FINANCE_LABEL[c.seller_finance_status as SellerFinance]}</Badge>
            <Badge variant="outline">Score {c.score ?? "—"}</Badge>
            <Badge variant={zu === "confirmed_zero" ? "default" : zu === "cash_required" ? "destructive" : "outline"} data-testid="zero-upfront-badge">{ZERO_UPFRONT_LABEL[zu]}</Badge>
            <Badge variant={dd ? "default" : "secondary"}>{dd ? "Due-diligence ready" : isDueDiligenceReady(c) ? "Not DD ready — £0 upfront not confirmed" : "Interesting — not DD ready"}</Badge>
            <Badge variant="outline">Status: {c.status}</Badge>
          </div>
        </div>
        <div className="grid md:grid-cols-4 gap-2">
          <div>Asking: {fmtMoney(c.asking_price, c.currency ?? "GBP")}</div>
          <div>Turnover: {fmtMoney(c.turnover, c.currency ?? "GBP")}</div>
          <div>Profit: {fmtMoney(c.profit, c.currency ?? "GBP")}</div>
          <div>Price/profit: {e.multiple ?? "Unknown"}</div>
          <div>Sale reason: {c.sale_reason || "Unknown"} ({c.retirement_confidence})</div>
          <div>Owner role: {c.owner_role || "Unknown"}</div>
          <div>Manager replacement: {fmtMoney(c.replacement_manager_cost)}</div>
          <div>Instalment headroom: {fmtMoney(e.instalmentHeadroom)}</div>
          <div>Recurring revenue: {c.recurring_revenue}</div>
          <div>Evidence: {c.evidence_quality}</div>
          <div>Listing: {c.listing_availability}</div>
          <div>Deposit: {c.deposit_required}</div>
        </div>
        <div className="grid md:grid-cols-4 gap-2">
          <div>Upfront cash: {zc.upfront_cash_required == null ? "Unknown (not £0)" : fmtMoney(zc.upfront_cash_required)}</div>
          <div>Seller finance %: {zc.seller_finance_percent ?? "Unknown"}</div>
          <div>Terms confirmed: {zc.terms_confirmed_at ? new Date(zc.terms_confirmed_at).toLocaleDateString("en-GB") : "No"}</div>
          <div>Seller enquiry: {(zc.seller_contact_status ?? "not_contacted").replace(/_/g, " ")}</div>
        </div>
        {zc.zero_upfront_evidence && <div>£0-upfront evidence: “{zc.zero_upfront_evidence}”</div>}
        {zc.outstanding_costs?.length > 0 && <div className="text-muted-foreground">Separate costs still to fund/assess: {zc.outstanding_costs.join(", ")}</div>}
        {c.seller_finance_evidence && <div>Seller-finance proof: “{c.seller_finance_evidence}”</div>}
        {c.third_party_finance_note && <div className="text-muted-foreground">Third-party finance mentioned (not seller finance): “{c.third_party_finance_note}”</div>}
        {c.unverified_fields?.length > 0 && <div className="text-muted-foreground">Unverified: {c.unverified_fields.join(", ")}</div>}
        {c.red_flags?.length > 0 && <div className="text-destructive">Red flags: {c.red_flags.join("; ")}</div>}
        <div className="text-muted-foreground">Still unknown: {e.unknowns.join(", ")}</div>
        <div className="flex flex-wrap justify-between gap-2">
          <a href={c.source_url} target="_blank" rel="noopener noreferrer" className="text-primary underline">Source: {c.source_key}</a>
          <span>Next: {c.next_action}</span>
        </div>
      </CardContent>
    </Card>
  );
}

const EMPTY: CandidateInput = { source_key: "", source_url: "", title: "" };

export default function RetirementSuccession() {
  const qc = useQueryClient();
  const sources = useQuery({ queryKey: ["ret-sources"], queryFn: async () => {
    const { data, error } = await db.from("retirement_acquisition_sources").select("*").order("name");
    if (error) throw error; return (data ?? []) as Source[];
  }});
  const candidates = useQuery({ queryKey: ["ret-candidates"], queryFn: async () => {
    const { data, error } = await db.from("retirement_acquisition_candidates").select("*").order("score", { ascending: false, nullsFirst: false });
    if (error) throw error; return (data ?? []) as Candidate[];
  }});
  const activity = useQuery({ queryKey: ["ret-activity"], queryFn: async () => {
    const { data, error } = await db.from("retirement_acquisition_activity").select("*").order("created_at", { ascending: false }).limit(50);
    if (error) throw error; return (data ?? []) as Activity[];
  }});

  const srcKeys = (sources.data ?? []).map((s) => s.source_key);
  const list = candidates.data ?? [];
  const [showExcluded, setShowExcluded] = useState(false);
  const [zeroOnly, setZeroOnly] = useState(false);
  const visible = list.filter((c) => (showExcluded || !(c.is_franchise || c.premises_only || c.status === "rejected")) && (!zeroOnly || inZeroUpfrontShortlist(c as any)));
  const totals = useMemo(() => ({
    all: list.length,
    explicit: list.filter((c) => c.seller_finance_status === "explicit").length,
    possible: list.filter((c) => c.seller_finance_status === "possible").length,
    unknown: list.filter((c) => c.seller_finance_status === "unknown" || c.seller_finance_status === "none").length,
    dd: list.filter((c) => isZeroUpfrontDDReady(c as any)).length,
    zero: list.filter((c) => inZeroUpfrontShortlist(c as any)).length,
    cash: list.filter((c) => effectiveZeroUpfrontStatus(c as any) === "cash_required").length,
    nego: list.filter((c) => effectiveZeroUpfrontStatus(c as any) === "negotiation_candidate").length,
    shortlist: list.filter((c) => c.status === "shortlist").length,
  }), [list]);

  // Import state
  const [single, setSingle] = useState<CandidateInput>(EMPTY);
  const [verifiedAll, setVerifiedAll] = useState(false);
  const [bulk, setBulk] = useState("");
  const [preview, setPreview] = useState<{ rows: CandidateRow[]; errors: string[]; duplicates: number; channel: string } | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const runPreview = (inputs: CandidateInput[], channel: string) => {
    const rows: CandidateRow[] = []; const errors: string[] = [];
    inputs.forEach((i, idx) => {
      const r = buildCandidate(i, srcKeys);
      if (r.ok === true) rows.push(r.row); else errors.push(`Row ${idx + 1}: ${r.errors.join("; ")}`);
    });
    const d = dedupeRows(rows);
    setPreview({ rows: d.rows, errors, duplicates: d.duplicates, channel });
  };
  const previewSingle = () => {
    const ver = verifiedAll ? ["asking_price", "turnover", "profit", "sale_reason", "staff_count", "owner_role", "years_trading"] : [];
    runPreview([{ ...single, verified_fields: ver }], "manual");
  };
  const previewBulk = () => {
    try { runPreview(parseBulk(bulk), bulk.trim().startsWith("[") || bulk.trim().startsWith("{") ? "json" : "csv"); }
    catch (e) { setPreview({ rows: [], errors: [`Could not read: ${(e as Error).message}`], duplicates: 0, channel: "json" }); }
  };
  const save = async () => {
    if (!preview?.rows.length) return;
    const { data, error } = await db.rpc("retirement_candidates_upsert", { _rows: preview.rows, _channel: preview.channel });
    if (error) { setMsg(`Not saved: ${error.message}`); return; }
    setMsg(`Saved: ${data.inserted} new, ${data.updated} updated, ${data.rejected} rejected.`);
    setPreview(null); setSingle(EMPTY);
    qc.invalidateQueries({ queryKey: ["ret-candidates"] }); qc.invalidateQueries({ queryKey: ["ret-activity"] });
  };
  const setStatus = async (id: string, status: string) => {
    await db.from("retirement_acquisition_candidates").update({ status, updated_at: new Date().toISOString() }).eq("id", id);
    qc.invalidateQueries({ queryKey: ["ret-candidates"] });
  };
  const num = (v: string) => (v.trim() === "" ? null : Number(v.replace(/[£,\s]/g, "")));

  return (
    <FounderLayout>
      <div className="space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold">Retirement & Succession</h1>
            <p className="text-muted-foreground mt-1 max-w-3xl">Established UK businesses for sale because the owner is retiring. Research only — Liftor never contacts sellers or brokers. Owner retiring is not distressed; a bank loan is not seller finance.</p>
          </div>
          <div className="flex gap-2 text-xs">
            <Link to="/founder/distressed-radar" className="text-primary underline">Distressed radar</Link>
            <Link to="/founder/portfolio-exit" className="text-primary underline">Portfolio & exit</Link>
          </div>
        </div>

        <div className="text-xs text-muted-foreground">Rule: £0 of the purchase price payable upfront. Seller finance offered ≠ zero down — partial seller finance or any deposit is excluded from the £0 shortlist. Score measures operational fit only; it never makes a deal eligible.</div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[["Confirmed £0 upfront", totals.zero], ["Potentially negotiable", totals.nego], ["Cash/deposit required", totals.cash], ["Candidates", totals.all], ["Seller finance (proof)", totals.explicit], ["Seller finance possible", totals.possible], ["Seller finance unknown", totals.unknown], ["Due-diligence ready", totals.dd], ["Shortlisted", totals.shortlist]].map(([l, v]) => (
            <Card key={l as string} className="tech-card"><CardContent className="p-3"><div className="text-[11px] text-muted-foreground">{l}</div><div className="text-2xl font-bold" data-testid={`total-${l}`}>{v as number}</div></CardContent></Card>
          ))}
        </div>

        <Tabs defaultValue="opportunities">
          <TabsList>
            <TabsTrigger value="opportunities">Opportunities</TabsTrigger>
            <TabsTrigger value="sources">Sources & Alerts</TabsTrigger>
            <TabsTrigger value="import">Import</TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
          </TabsList>

          <TabsContent value="opportunities" className="space-y-3">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Default filter: UK, retirement/succession, 2+ years trading; franchises, empty premises and rejected hidden.</span>
              <Button size="sm" variant={zeroOnly ? "default" : "outline"} onClick={() => setZeroOnly((v) => !v)} data-testid="zero-upfront-filter">{zeroOnly ? "Showing £0 purchase price only" : "£0 purchase-price screen"}</Button>
              <Button size="sm" variant="outline" onClick={() => setShowExcluded((v) => !v)}>{showExcluded ? "Hide excluded" : "Show excluded"}</Button>
            </div>
            {candidates.isLoading ? <div className="text-sm">Loading…</div> : visible.length === 0 ? (
              <Card className="tech-card"><CardContent className="p-6 text-sm">0 candidates. Nothing has been found yet — no discovery connector is running. Add listings in the Import tab, or set up the website alerts in Sources & Alerts.</CardContent></Card>
            ) : visible.map((c) => (
              <div key={c.id} className="space-y-1">
                <CandidateCard c={c} />
                <div className="flex flex-wrap gap-1">
                  {["review", "shortlist", "rejected", "under_offer", "sold"].map((s) => (
                    <Button key={s} size="sm" variant="ghost" className="h-6 text-[11px]" disabled={c.status === s} onClick={() => setStatus(c.id, s)}>{s.replace("_", " ")}</Button>
                  ))}
                </div>
              </div>
            ))}
          </TabsContent>

          <TabsContent value="sources" className="space-y-3">
            <p className="text-xs text-muted-foreground">Discovery connector: <b>not configured</b>. Liftor does not crawl any of these sites. Alerts must be set up on each website by you; a site shows "Receiving verified alerts" only after a real alert has been proven.</p>
            <div className="grid md:grid-cols-2 gap-3">
              {(sources.data ?? []).map((s) => (
                <Card key={s.source_key} className="tech-card"><CardContent className="p-3 text-xs space-y-1">
                  <div className="flex justify-between gap-2"><a href={s.url} target="_blank" rel="noopener noreferrer" className="font-medium text-primary underline">{s.name}</a><Badge variant="outline">{SOURCE_STATUS_LABEL[s.alert_status] ?? s.alert_status}</Badge></div>
                  <div>Mode: {s.access_mode.replace("_", " ")} · Scraping: {s.scraping_allowed ? "allowed" : "not used"}</div>
                  <div className="text-muted-foreground">{s.terms_note}</div>
                  <div>Last checked: {s.last_checked_at ? new Date(s.last_checked_at).toLocaleString("en-GB") : "Never"}</div>
                </CardContent></Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="import" className="space-y-4">
            <Card className="tech-card"><CardHeader className="pb-2"><CardTitle className="text-sm">One listing (public details only)</CardTitle></CardHeader>
              <CardContent className="grid md:grid-cols-3 gap-2 text-xs">
                <select aria-label="Source" className="h-9 rounded-md border bg-background px-2" value={single.source_key} onChange={(e) => setSingle({ ...single, source_key: e.target.value })}>
                  <option value="">Choose source…</option>{(sources.data ?? []).map((s) => <option key={s.source_key} value={s.source_key}>{s.name}</option>)}
                </select>
                <Input aria-label="Listing URL" placeholder="Listing URL" value={single.source_url} onChange={(e) => setSingle({ ...single, source_url: e.target.value })} />
                <Input aria-label="Title" placeholder="Title" value={single.title} onChange={(e) => setSingle({ ...single, title: e.target.value })} />
                <Input placeholder="Sector" onChange={(e) => setSingle({ ...single, sector: e.target.value || null })} />
                <Input placeholder="Location" onChange={(e) => setSingle({ ...single, location: e.target.value || null })} />
                <Input placeholder="Years trading" onChange={(e) => setSingle({ ...single, years_trading: num(e.target.value) })} />
                <Input placeholder="Asking price £ (blank = unknown)" onChange={(e) => setSingle({ ...single, asking_price: num(e.target.value) })} />
                <Input placeholder="Turnover £ (blank = unknown)" onChange={(e) => setSingle({ ...single, turnover: num(e.target.value) })} />
                <Input placeholder="Profit £ (blank = unknown)" onChange={(e) => setSingle({ ...single, profit: num(e.target.value) })} />
                <Input placeholder="Owner role" onChange={(e) => setSingle({ ...single, owner_role: e.target.value || null })} />
                <Input placeholder="Owner hours/week" onChange={(e) => setSingle({ ...single, owner_hours_per_week: num(e.target.value) })} />
                <Input placeholder="Manager replacement cost £/yr" onChange={(e) => setSingle({ ...single, replacement_manager_cost: num(e.target.value) })} />
                <Input placeholder="Sale reason (as stated)" onChange={(e) => setSingle({ ...single, sale_reason: e.target.value || null })} />
                <Input placeholder="Seller-finance quote from listing" onChange={(e) => setSingle({ ...single, seller_finance_evidence: e.target.value || null })} />
                <select className="h-9 rounded-md border bg-background px-2" onChange={(e) => setSingle({ ...single, recurring_revenue: e.target.value as "yes" | "no" | "unknown" })}><option value="unknown">Recurring revenue: unknown</option><option value="yes">yes</option><option value="no">no</option></select>
                <Textarea className="md:col-span-3" placeholder="Public listing excerpt (no names, emails or phone numbers)" onChange={(e) => setSingle({ ...single, listing_text: e.target.value || null, evidence_url: single.source_url || null })} />
                <label className="flex items-center gap-2 md:col-span-2"><input type="checkbox" checked={verifiedAll} onChange={(e) => setVerifiedAll(e.target.checked)} /> I checked these figures against the public listing (otherwise all are marked unverified)</label>
                <Button size="sm" onClick={previewSingle}>Preview</Button>
              </CardContent></Card>
            <Card className="tech-card"><CardHeader className="pb-2"><CardTitle className="text-sm">Bulk CSV or JSON</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-xs">
                <p className="text-muted-foreground">Columns: source_key, source_url, title, sector, location, years_trading, asking_price, turnover, profit, owner_role, owner_hours_per_week, replacement_manager_cost, recurring_revenue, is_franchise, premises_only, sale_reason, listing_text, seller_finance_evidence, evidence_url, verified_fields (separate with ;). Blank or "unknown" money = unknown.</p>
                <Textarea rows={6} aria-label="Bulk import" value={bulk} onChange={(e) => setBulk(e.target.value)} />
                <Button size="sm" onClick={previewBulk}>Preview</Button>
              </CardContent></Card>
            {preview && (
              <Card className="tech-card"><CardContent className="p-3 space-y-2 text-xs">
                <div>{preview.rows.length} ready · {preview.errors.length} rejected · {preview.duplicates} duplicate(s) merged</div>
                {preview.errors.map((e) => <div key={e} className="text-destructive">{e}</div>)}
                {preview.rows.map((r) => <CandidateCard key={r.normalized_url} c={{ ...r, id: r.normalized_url, status: "new", first_seen_at: "", last_seen_at: "" } as Candidate} />)}
                <Button size="sm" disabled={!preview.rows.length} onClick={save}>Save {preview.rows.length} to candidates</Button>
              </CardContent></Card>
            )}
            {msg && <div className="text-xs">{msg}</div>}
          </TabsContent>

          <TabsContent value="activity" className="space-y-2">
            {(activity.data ?? []).length === 0 ? <div className="text-sm">No imports yet.</div> : (activity.data ?? []).map((a) => (
              <div key={a.id} className="text-xs border border-border/40 rounded p-2">{new Date(a.created_at).toLocaleString("en-GB")} · {a.action} ({a.channel}) · {a.inserted_count} new, {a.updated_count} updated, {a.rejected_count} rejected</div>
            ))}
          </TabsContent>
        </Tabs>
      </div>
    </FounderLayout>
  );
}
