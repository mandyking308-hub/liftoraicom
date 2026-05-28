import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { FundingRadarLayout, FRSection, FRStat, DemoBadge } from "./_shared";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { ShieldAlert, ArrowLeft, Plus } from "lucide-react";
import { ALL_SIGNAL_TYPES, fetchSignalsForCompany, fetchWatchlistEntry, computeWatchlistScores, polarityForSignalType } from "@/lib/fundingRadarEngine";
import { useToast } from "@/hooks/use-toast";

export default function FRWatchlistDetail() {
  const { id } = useParams();
  const [entry, setEntry] = useState<any>(null);
  const [signals, setSignals] = useState<any[]>([]);
  const [shortlist, setShortlist] = useState<any[]>([]);
  const [builds, setBuilds] = useState<any[]>([]);
  const { toast } = useToast();

  const [form, setForm] = useState({
    signal_type: "customer_complaint", signal_title: "", signal_summary: "",
    source_name: "", source_url: "", source_type: "public",
    signal_date: new Date().toISOString().slice(0, 10),
    confidence_score: 70, severity_score: 60, relevance_to_liftor_score: 60,
    legal_ip_notes: "", founder_notes: "",
  });

  async function load() {
    if (!id) return;
    const w = await fetchWatchlistEntry(id);
    setEntry(w);
    if (w?.company_id) {
      const sigs = await fetchSignalsForCompany(w.company_id);
      setSignals(sigs);
      const sl = await (supabase as any).from("funding_shortlist").select("id, status, build_thesis").eq("funding_company_id", w.company_id);
      setShortlist(sl.data ?? []);
      const bc = await (supabase as any).from("ma_build_candidates").select("id, candidate_name, recommendation_status").eq("funding_company_id", w.company_id);
      setBuilds(bc.data ?? []);
    }
  }
  useEffect(() => { load().catch(() => {}); }, [id]);

  const scores = useMemo(() => computeWatchlistScores(signals), [signals]);
  const pros = signals.filter((s) => (s.signal_polarity ?? polarityForSignalType(s.signal_type)) === "positive");
  const cons = signals.filter((s) => (s.signal_polarity ?? polarityForSignalType(s.signal_type)) === "negative");
  const neutral = signals.filter((s) => (s.signal_polarity ?? polarityForSignalType(s.signal_type)) === "neutral");

  async function addSignal() {
    if (!entry?.company_id || !form.signal_title.trim()) { toast({ title: "Title required", variant: "destructive" }); return; }
    const polarity = polarityForSignalType(form.signal_type);
    const { error } = await (supabase as any).from("funding_weakness_signals").insert({
      company_id: entry.company_id, watchlist_id: entry.id,
      signal_polarity: polarity,
      signal_type: form.signal_type,
      signal_title: form.signal_title.trim().slice(0, 200),
      signal_summary: form.signal_summary?.trim().slice(0, 2000) || null,
      source_name: form.source_name?.trim().slice(0, 200) || null,
      source_url: form.source_url?.trim().slice(0, 500) || null,
      source_type: form.source_type || null,
      signal_date: form.signal_date || null,
      confidence_score: Number(form.confidence_score) || null,
      severity_score: Number(form.severity_score) || null,
      relevance_to_liftor_score: Number(form.relevance_to_liftor_score) || null,
      legal_ip_notes: form.legal_ip_notes?.trim().slice(0, 2000) || null,
      founder_notes: form.founder_notes?.trim().slice(0, 2000) || null,
    });
    if (error) { toast({ title: "Could not add signal", description: error.message, variant: "destructive" }); return; }
    await (supabase as any).from("ma_audit_logs").insert({ action_type: "funding_radar.signal.added", table_name: "funding_weakness_signals", record_id: entry.id, new_value: { type: form.signal_type, polarity } });
    setForm({ ...form, signal_title: "", signal_summary: "", source_name: "", source_url: "", legal_ip_notes: "", founder_notes: "" });
    toast({ title: "Signal recorded" });
    load();
  }

  async function sendToShortlist() {
    if (!entry?.company_id) return;
    const { error } = await (supabase as any).from("funding_shortlist").insert({
      funding_company_id: entry.company_id,
      cluster_id: entry.problem_cluster_id ?? entry.funding_radar_companies?.cluster_id ?? null,
      status: "shortlisted",
      build_thesis: `From watchlist: ${entry.watch_reason ?? "see watch reason"}. Cons: ${cons.length}, pros: ${pros.length}. Liftor advantage ${scores.liftorAdvantage}/100.`,
      founder_notes: entry.founder_notes ?? null,
    });
    if (error) { toast({ title: "Could not shortlist", description: error.message, variant: "destructive" }); return; }
    await (supabase as any).from("ma_audit_logs").insert({ action_type: "funding_radar.watchlist.sent_to_shortlist", table_name: "funding_shortlist", record_id: entry.id });
    toast({ title: "Sent to shortlist" });
    load();
  }

  if (!entry) {
    return (
      <FundingRadarLayout title="Watchlist entry">
        <p className="text-xs text-muted-foreground">Loading…</p>
      </FundingRadarLayout>
    );
  }

  const c = entry.funding_radar_companies ?? {};

  return (
    <FundingRadarLayout title={c.company_name ?? "Watchlist entry"} subtitle={entry.watch_reason ?? undefined}>
      <Link to="/founder/funding-radar/watchlist" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"><ArrowLeft className="h-3 w-3" /> Back to watchlist</Link>

      <div className="flex items-center gap-2"><DemoBadge record={c} /><Badge variant="outline">{entry.watch_status}</Badge><Badge variant="outline">priority: {entry.priority}</Badge></div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <FRStat label="Weakness signal" value={scores.weakness} />
        <FRStat label="Customer pain evidence" value={scores.customerPain} />
        <FRStat label="Capital drag" value={scores.capitalDrag} />
        <FRStat label="Execution gap" value={scores.executionGap} />
        <FRStat label="Opportunity timing" value={scores.timing} />
        <FRStat label="Liftor advantage" value={scores.liftorAdvantage} />
        <FRStat label="Legal/IP safety" value={scores.legalIpSafety} />
        <FRStat label="Watch priority" value={scores.watchPriority} />
      </div>

      <FRSection title="Company & funding profile">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
          <div><p className="text-muted-foreground text-[10px]">Sector</p><p>{c.sector ?? "—"}</p></div>
          <div><p className="text-muted-foreground text-[10px]">Country</p><p>{c.country ?? "—"}</p></div>
          <div><p className="text-muted-foreground text-[10px]">Last round</p><p>{c.last_funding_round ?? "—"}</p></div>
          <div><p className="text-muted-foreground text-[10px]">Last amount (USD)</p><p>{c.last_funding_amount_usd ?? "—"}</p></div>
        </div>
      </FRSection>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FRSection title={`Pros · what is working (${pros.length})`}>
          {pros.length === 0 ? <p className="text-xs text-muted-foreground italic">No positive signals yet.</p> :
            <ul className="text-xs space-y-1">{pros.map((s) => <li key={s.id}>+ <span className="text-foreground">{s.signal_title}</span> <span className="text-muted-foreground">· {s.signal_type}</span></li>)}</ul>}
        </FRSection>
        <FRSection title={`Cons · what is failing or slowing them (${cons.length})`}>
          {cons.length === 0 ? <p className="text-xs text-muted-foreground italic">No weakness signals yet.</p> :
            <ul className="text-xs space-y-1">{cons.map((s) => <li key={s.id}>− <span className="text-foreground">{s.signal_title}</span> <span className="text-muted-foreground">· {s.signal_type}{s.severity_score ? ` · sev ${s.severity_score}` : ""}</span></li>)}</ul>}
        </FRSection>
      </div>

      <FRSection title="Signal timeline">
        {signals.length === 0 ? <p className="text-xs text-muted-foreground italic">No signals yet — add the first one below.</p> : (
          <div className="space-y-2">
            {signals.map((s) => (
              <div key={s.id} className="border border-border/40 rounded p-2 text-xs">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium">{s.signal_title}</span>
                  <span className="text-muted-foreground">{s.signal_date ?? new Date(s.created_at).toLocaleDateString()}</span>
                </div>
                <div className="text-muted-foreground">{s.signal_type} · {s.signal_polarity ?? polarityForSignalType(s.signal_type)} · sev {s.severity_score ?? "—"} · conf {s.confidence_score ?? "—"} · Liftor rel {s.relevance_to_liftor_score ?? "—"}</div>
                {s.signal_summary && <div className="mt-1">{s.signal_summary}</div>}
                {s.source_name && <div className="mt-1 text-[10px] text-muted-foreground">Source: {s.source_name}{s.source_url ? ` · ${s.source_url}` : ""}</div>}
                {s.legal_ip_notes && <div className="mt-1 text-[10px] text-amber-300">⚠ Legal/IP: {s.legal_ip_notes}</div>}
              </div>
            ))}
          </div>
        )}
      </FRSection>

      <FRSection title="Add signal manually" description="Public information only. No private data, no scraping of restricted platforms, no allegations.">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs">
          <Select value={form.signal_type} onValueChange={(v) => setForm({ ...form, signal_type: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {ALL_SIGNAL_TYPES.map((t) => (<SelectItem key={t} value={t}>{t} · {polarityForSignalType(t)}</SelectItem>))}
            </SelectContent>
          </Select>
          <Input placeholder="Signal title" value={form.signal_title} onChange={(e) => setForm({ ...form, signal_title: e.target.value })} maxLength={200} />
          <Input placeholder="Date" type="date" value={form.signal_date} onChange={(e) => setForm({ ...form, signal_date: e.target.value })} />
          <Input placeholder="Source name (e.g. TechCrunch, public X post)" value={form.source_name} onChange={(e) => setForm({ ...form, source_name: e.target.value })} maxLength={200} />
          <Input placeholder="Source URL (public)" value={form.source_url} onChange={(e) => setForm({ ...form, source_url: e.target.value })} maxLength={500} />
          <Input placeholder="Source type" value={form.source_type} onChange={(e) => setForm({ ...form, source_type: e.target.value })} maxLength={50} />
          <Input type="number" placeholder="Severity 0–100" value={form.severity_score} onChange={(e) => setForm({ ...form, severity_score: Number(e.target.value) })} min={0} max={100} />
          <Input type="number" placeholder="Confidence 0–100" value={form.confidence_score} onChange={(e) => setForm({ ...form, confidence_score: Number(e.target.value) })} min={0} max={100} />
          <Input type="number" placeholder="Liftor relevance 0–100" value={form.relevance_to_liftor_score} onChange={(e) => setForm({ ...form, relevance_to_liftor_score: Number(e.target.value) })} min={0} max={100} />
          <Textarea placeholder="Signal summary" value={form.signal_summary} onChange={(e) => setForm({ ...form, signal_summary: e.target.value })} className="md:col-span-3" maxLength={2000} />
          <Textarea placeholder="Legal/IP notes (defamation, terms-of-service, private data risks)" value={form.legal_ip_notes} onChange={(e) => setForm({ ...form, legal_ip_notes: e.target.value })} className="md:col-span-3" maxLength={2000} />
          <Textarea placeholder="Founder notes" value={form.founder_notes} onChange={(e) => setForm({ ...form, founder_notes: e.target.value })} className="md:col-span-3" maxLength={2000} />
          <Button size="sm" onClick={addSignal} className="md:col-span-3"><Plus className="h-3 w-3 mr-1" /> Record signal</Button>
        </div>
      </FRSection>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <FRSection title="What Liftor can learn">
          <p className="text-xs text-muted-foreground">{neutral.length + pros.length} learning signal(s). Use to inform GTM, pricing and operating model — never to copy code, UI, copy, customers or proprietary workflows.</p>
        </FRSection>
        <FRSection title="What Liftor must avoid">
          <p className="text-xs text-muted-foreground">{cons.filter((s: any) => ["product_complexity","slow_implementation","onboarding_issue","integration_problem","compliance_issue"].includes(s.signal_type)).length} cautionary signal(s) about complexity, onboarding, integration and compliance.</p>
        </FRSection>
        <FRSection title="What Liftor could build legally distinctly">
          <p className="text-xs text-muted-foreground">Promote to shortlist when weakness + capital drag are validated and Liftor advantage is high. Promotion always requires a legally distinct execution route.</p>
          <Button size="sm" variant="outline" className="mt-2 w-full" onClick={sendToShortlist}>Send to shortlist</Button>
        </FRSection>
      </div>

      <FRSection title="Related shortlist & build candidates">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          <div>
            <p className="text-muted-foreground text-[10px] mb-1">Shortlist</p>
            {shortlist.length === 0 ? <p className="text-muted-foreground italic">None.</p> : shortlist.map((s) => <div key={s.id}>· {s.status} — {s.build_thesis?.slice(0, 80) ?? "—"}</div>)}
          </div>
          <div>
            <p className="text-muted-foreground text-[10px] mb-1">Quarterly Build Selector</p>
            {builds.length === 0 ? <p className="text-muted-foreground italic">None.</p> : builds.map((b) => <div key={b.id}>· {b.candidate_name} — {b.recommendation_status}</div>)}
          </div>
        </div>
      </FRSection>

      <FRSection title="Legal / IP warning panel">
        <p className="text-xs text-amber-300 flex items-start gap-2"><ShieldAlert className="h-4 w-4 mt-0.5" /> No allegations, no defamation, no private data, no impersonation, no contact with employees/leavers/customers/investors/acquirers/competitors. Public sources only. All extracted material limited to: problem thesis, customer pain, market validation signal, buyer type, pricing logic, revenue model pattern, publicly visible weakness, legally distinct execution route.</p>
      </FRSection>
    </FundingRadarLayout>
  );
}