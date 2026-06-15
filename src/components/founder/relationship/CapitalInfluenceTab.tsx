import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "@/hooks/use-toast";
import { ShieldAlert, Lock, Pause, CheckCircle2, FileSignature, Crown, HeartHandshake, Briefcase, TrendingUp, Facebook, AlertTriangle } from "lucide-react";
import PositioningLibrary from "./PositioningLibrary";
import SocialSignalIntakeQueue from "./SocialSignalIntakeQueue";
import { BookOpen, Inbox } from "lucide-react";

const sb: any = supabase as any;

export const CAPITAL_LANE = ["carren_estate_principal_capital","ghat_philanthropy_giving","elite_advisory_credibility","deal_flow_acquisition","media_influence_profile","school_social_soft_power","parked_not_priority"] as const;
export const CAPITAL_ROLE = ["principal","family_office","private_bank","wealth_manager","financial_adviser","dfm","fund_manager","pe_fund","operating_partner","independent_sponsor","search_fund","m_and_a_adviser","corporate_development","strategic_acquirer","donor","foundation","philanthropy_adviser","private_client_lawyer","tax_adviser","accountant","property_adviser","media_contact","introducer","unknown"] as const;
export const BEST_VEHICLE = ["carren_estate","ghat","both","liftor_hidden","adviser_only","park"] as const;
export const CONVERSATION_POSTURE = ["principal_to_principal","philanthropy_alignment","elite_adviser","market_intelligence","deal_flow","operating_partnership","media_profile","no_contact"] as const;
export const OUTREACH_STATUS = ["not_contacted","researched","ready_to_contact","contacted","replied","meeting_requested","meeting_booked","follow_up_due","parked","do_not_contact"] as const;
export const COMPLIANCE_BOUNDARY = ["relationship_only","no_product_literature","no_solicitation","no_client_money_request","no_external_send_without_approval","legal_review_required","restricted"] as const;
export const SOURCE_PLATFORM = ["gmail","calendar","facebook","linkedin","website","qouted_or_source_platform","event_list","manual","referral","public_research","other"] as const;
export const HNW_CONFIDENCE = ["high","medium","low","unknown"] as const;
export const PHILANTHROPY_CAUSE = ["global_health","health_access","children","education","africa_commonwealth","women_girls","poverty_relief","medical_access","humanitarian","unknown","not_applicable"] as const;
export const DEAL_RELEVANCE = ["capital_source","deal_source","buyer_route","seller_route","operating_partner","co_investment_route","donor_route","adviser_route","media_route","not_relevant"] as const;
export const ALIGNMENT_QUALITY = ["high","medium","low","poor","parasite_risk","unknown"] as const;
export const PARK_REASON = ["too_narrow","over_selling","wants_fees_only","not_global_enough","no_money_route","low_trust","conflict_risk","time_waster","not_relevant","other"] as const;
export const NEXT_MOVE_OWNER = ["mandy","chatgpt","adviser","waiting_on_them","no_action","unknown"] as const;
const DISCLOSURE = ["public_only","light_context","nda_before_detail","confidential_allowed","restricted"] as const;
const TRUST = ["unknown","low","medium","high","vetted"] as const;

function pretty(s?: string | null) { return (s ?? "").replace(/_/g, " "); }

function disclosureTone(d: string) {
  if (d === "restricted" || d === "confidential_allowed") return "bg-red-500/15 text-red-300 border-red-500/30";
  if (d === "nda_before_detail") return "bg-yellow-500/15 text-yellow-300 border-yellow-500/30";
  if (d === "light_context") return "bg-blue-500/15 text-blue-300 border-blue-500/30";
  return "bg-emerald-500/15 text-emerald-300 border-emerald-500/30";
}

function capitalPriority(c: any): number {
  let s = (c.strategic_value_score ?? 0) + (c.commercial_value_score ?? 0) + (c.urgency_score ?? 0);
  if (c.best_vehicle === "carren_estate" || c.best_vehicle === "both") s += 2;
  if (["family_office","private_bank","independent_sponsor","m_and_a_adviser","pe_fund","strategic_acquirer","corporate_development","operating_partner"].includes(c.capital_role)) s += 2;
  if (c.outreach_status === "ready_to_contact" || c.outreach_status === "meeting_booked") s += 2;
  if (c.disclosure_level === "restricted") s -= 3;
  if (c.outreach_status === "do_not_contact") s -= 5;
  if (c.capital_lane === "parked_not_priority") s -= 3;
  if (c.alignment_quality === "poor") s -= 3;
  if (c.alignment_quality === "parasite_risk") s -= 5;
  return s;
}

function philanthropyPriority(c: any): number {
  let s = (c.strategic_value_score ?? 0) + (c.urgency_score ?? 0);
  if (c.best_vehicle === "ghat" || c.best_vehicle === "both") s += 2;
  if (["donor","foundation","philanthropy_adviser"].includes(c.capital_role)) s += 2;
  if (c.philanthropy_cause_fit === "global_health" || c.philanthropy_cause_fit === "health_access") s += 2;
  if (c.outreach_status === "do_not_contact") s -= 5;
  if (c.alignment_quality === "poor" || c.alignment_quality === "parasite_risk") s -= 3;
  return s;
}

const ELITE_ROLES = new Set(["private_client_lawyer","tax_adviser","accountant","property_adviser","introducer","wealth_manager","private_bank","family_office"]);
const DEAL_RELS = new Set(["capital_source","deal_source","buyer_route","seller_route","operating_partner","co_investment_route","adviser_route"]);

function matchesLane(c: any, lane: string): boolean {
  if (lane === "capital") return c.capital_lane === "carren_estate_principal_capital" || c.best_vehicle === "carren_estate" || c.best_vehicle === "both";
  if (lane === "ghat") return c.capital_lane === "ghat_philanthropy_giving" || c.best_vehicle === "ghat" || c.best_vehicle === "both";
  if (lane === "elite") return c.capital_lane === "elite_advisory_credibility" || ELITE_ROLES.has(c.capital_role);
  if (lane === "deal") return c.capital_lane === "deal_flow_acquisition" || DEAL_RELS.has(c.deal_relevance);
  if (lane === "media") return c.capital_lane === "media_influence_profile";
  if (lane === "facebook") return c.source_platform === "facebook";
  if (lane === "park") return c.capital_lane === "parked_not_priority" || c.best_vehicle === "park" || c.outreach_status === "parked" || c.outreach_status === "do_not_contact" || c.alignment_quality === "poor" || c.alignment_quality === "parasite_risk";
  return true;
}

const QUICK_ACTIONS: { key: string; label: string; patch: Record<string, any>; event: string; summary: string }[] = [
  { key: "ready", label: "Ready to contact", patch: { outreach_status: "ready_to_contact" }, event: "outreach_ready", summary: "Marked ready to contact" },
  { key: "contacted", label: "Contacted", patch: { outreach_status: "contacted", last_contact_at: "__now__" }, event: "outreach_contacted", summary: "Marked contacted" },
  { key: "replied", label: "Replied", patch: { outreach_status: "replied" }, event: "outreach_replied", summary: "Marked replied" },
  { key: "meet_req", label: "Meeting requested", patch: { outreach_status: "meeting_requested" }, event: "meeting_requested", summary: "Meeting requested" },
  { key: "meet_book", label: "Meeting booked", patch: { outreach_status: "meeting_booked", relationship_status: "meeting_booked" }, event: "meeting_booked", summary: "Meeting booked" },
  { key: "follow", label: "Follow-up due", patch: { outreach_status: "follow_up_due", relationship_status: "needs_follow_up" }, event: "follow_up_due", summary: "Marked follow-up due" },
  { key: "nda", label: "NDA before detail", patch: { disclosure_level: "nda_before_detail", relationship_status: "nda_required" }, event: "nda_required", summary: "Marked NDA before detail" },
  { key: "restrict", label: "Restricted / no disclosure", patch: { disclosure_level: "restricted" }, event: "restricted", summary: "Marked restricted / no disclosure" },
  { key: "carren", label: "Carren Estate route", patch: { best_vehicle: "carren_estate" }, event: "route_carren", summary: "Routed via Carren Estate" },
  { key: "ghat", label: "GHAT route", patch: { best_vehicle: "ghat" }, event: "route_ghat", summary: "Routed via GHAT" },
  { key: "both", label: "Both routes", patch: { best_vehicle: "both" }, event: "route_both", summary: "Routed via both Carren Estate and GHAT" },
  { key: "park", label: "Park", patch: { capital_lane: "parked_not_priority", best_vehicle: "park", outreach_status: "parked", relationship_status: "parked" }, event: "parked", summary: "Parked / not priority" },
  { key: "parasite", label: "Parasite-risk / poor alignment", patch: { alignment_quality: "parasite_risk" }, event: "alignment_parasite", summary: "Flagged parasite-risk / poor alignment" },
  { key: "own_mandy", label: "Owner: Mandy", patch: { next_move_owner: "mandy" }, event: "owner_set", summary: "Next move owner: Mandy" },
  { key: "own_chatgpt", label: "Owner: ChatGPT", patch: { next_move_owner: "chatgpt" }, event: "owner_set", summary: "Next move owner: ChatGPT" },
  { key: "own_wait", label: "Owner: waiting on them", patch: { next_move_owner: "waiting_on_them" }, event: "owner_set", summary: "Next move owner: waiting on them" },
];

const emptyIntake = {
  contact_name: "", organisation_name: "", facebook_profile_url: "", age_or_age_band: "", city_country: "",
  source_platform: "facebook", source_evidence: "",
  money_signal: "", relationship_angle: "",
  capital_lane: "", capital_role: "unknown", best_vehicle: "",
  hnw_signal_confidence: "unknown", philanthropy_cause_fit: "", deal_relevance: "",
  outreach_status: "researched", disclosure_level: "public_only", compliance_boundary: "relationship_only",
  founder_notes: "", priority_notes: "", next_action_summary: "", next_move_owner: "mandy",
};

export default function CapitalInfluenceTab({ onEdit, initialSub, initialPositioningContactId }: { onEdit: (c: any) => void; initialSub?: string; initialPositioningContactId?: string | null }) {
  const qc = useQueryClient();
  const [sub, setSub] = useState(initialSub || "overview");
  const [positioningContactId, setPositioningContactId] = useState<string | null>(initialPositioningContactId ?? null);
  const [f, setF] = useState({
    capital_lane: "all", capital_role: "all", best_vehicle: "all", conversation_posture: "all",
    outreach_status: "all", compliance_boundary: "all", source_platform: "all",
    hnw_signal_confidence: "all", philanthropy_cause_fit: "all", deal_relevance: "all",
    alignment_quality: "all", next_move_owner: "all", disclosure_level: "all", trust_level: "all",
    search: "",
  });
  const [intake, setIntake] = useState<any>(emptyIntake);

  const { data: contacts = [] } = useQuery<any[]>({
    queryKey: ["rni-contacts"],
    queryFn: async () => {
      const { data, error } = await sb.from("relationship_intelligence_contacts").select("*").order("updated_at", { ascending: false }).limit(2000);
      if (error) throw error;
      return data ?? [];
    },
  });

  const quick = useMutation({
    mutationFn: async ({ id, action }: { id: string; action: typeof QUICK_ACTIONS[number] }) => {
      const patch: any = { ...action.patch };
      if (patch.last_contact_at === "__now__") patch.last_contact_at = new Date().toISOString();
      const { error } = await sb.from("relationship_intelligence_contacts").update(patch).eq("id", id);
      if (error) throw error;
      await sb.from("relationship_intelligence_events").insert({ contact_id: id, event_type: action.event, summary: action.summary });
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["rni-contacts"] }); toast({ title: "Updated" }); },
    onError: (e: any) => toast({ title: "Update failed", description: e.message, variant: "destructive" }),
  });

  const addIntake = useMutation({
    mutationFn: async (row: any) => {
      if (!row.contact_name?.trim()) throw new Error("Contact name required");
      const { data: u } = await sb.auth.getUser();
      const payload: any = { ...row, created_by: u?.user?.id ?? null, relationship_type: "other", source: row.source_platform || "manual" };
      // strip empties so the DB keeps NULLs and check constraints (if any) pass
      for (const k of Object.keys(payload)) if (payload[k] === "") payload[k] = null;
      const { data, error } = await sb.from("relationship_intelligence_contacts").insert(payload).select("id").single();
      if (error) throw error;
      await sb.from("relationship_intelligence_events").insert({ contact_id: data.id, event_type: "capital_intake_added", summary: "Added via Capital & Influence intake (manual, no scrape)." });
    },
    onSuccess: () => { toast({ title: "Intake added" }); setIntake(emptyIntake); qc.invalidateQueries({ queryKey: ["rni-contacts"] }); },
    onError: (e: any) => toast({ title: "Intake failed", description: e.message, variant: "destructive" }),
  });

  // apply filters
  const filtered = useMemo(() => {
    return contacts.filter((c: any) => {
      for (const k of ["capital_lane","capital_role","best_vehicle","conversation_posture","outreach_status","compliance_boundary","source_platform","hnw_signal_confidence","philanthropy_cause_fit","deal_relevance","alignment_quality","next_move_owner","disclosure_level","trust_level"] as const) {
        if ((f as any)[k] !== "all" && c[k] !== (f as any)[k]) return false;
      }
      if (f.search) {
        const q = f.search.toLowerCase();
        const hay = `${c.contact_name ?? ""} ${c.organisation_name ?? ""} ${c.email ?? ""} ${c.money_signal ?? ""} ${c.relationship_angle ?? ""} ${(c.tags ?? []).join(" ")}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [contacts, f]);

  const overview = useMemo(() => {
    const c = contacts as any[];
    const ci = c.filter(x =>
      x.capital_lane || x.capital_role || x.best_vehicle || x.outreach_status ||
      x.money_signal || x.relationship_angle || x.deal_relevance || x.philanthropy_cause_fit
    );
    return {
      total: ci.length,
      carren: c.filter(x => matchesLane(x, "capital")).length,
      ghat: c.filter(x => matchesLane(x, "ghat")).length,
      elite: c.filter(x => matchesLane(x, "elite")).length,
      deal: c.filter(x => matchesLane(x, "deal")).length,
      media: c.filter(x => matchesLane(x, "media")).length,
      facebook: c.filter(x => x.source_platform === "facebook").length,
      ready: c.filter(x => x.outreach_status === "ready_to_contact").length,
      meetings: c.filter(x => x.outreach_status === "meeting_booked").length,
      followUp: c.filter(x => x.outreach_status === "follow_up_due").length,
      restricted: c.filter(x => x.disclosure_level === "restricted").length,
      parked: c.filter(x => matchesLane(x, "park")).length,
      parasite: c.filter(x => x.alignment_quality === "parasite_risk" || x.alignment_quality === "poor").length,
    };
  }, [contacts]);

  function laneRows(lane: string) {
    return filtered.filter((c: any) => matchesLane(c, lane));
  }

  return (
    <div className="space-y-4">
      <Card className="tech-card border-yellow-500/30 bg-yellow-500/5">
        <CardContent className="p-3 text-xs text-yellow-200/90 flex items-start gap-2">
          <ShieldAlert className="h-4 w-4 mt-0.5 shrink-0" />
          <div>
            Relationship intelligence only. No product literature, no solicitation, no automatic outreach, no client-money request and no external communication without founder approval.
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <Card className="tech-card"><CardContent className="p-3 grid md:grid-cols-4 lg:grid-cols-6 gap-2">
        <Input placeholder="Search name, org, signal, angle…" value={f.search} onChange={e => setF({ ...f, search: e.target.value })} />
        <FilterSel label="Capital lane" value={f.capital_lane} onChange={v => setF({ ...f, capital_lane: v })} options={CAPITAL_LANE} />
        <FilterSel label="Capital role" value={f.capital_role} onChange={v => setF({ ...f, capital_role: v })} options={CAPITAL_ROLE} />
        <FilterSel label="Best vehicle" value={f.best_vehicle} onChange={v => setF({ ...f, best_vehicle: v })} options={BEST_VEHICLE} />
        <FilterSel label="Posture" value={f.conversation_posture} onChange={v => setF({ ...f, conversation_posture: v })} options={CONVERSATION_POSTURE} />
        <FilterSel label="Outreach" value={f.outreach_status} onChange={v => setF({ ...f, outreach_status: v })} options={OUTREACH_STATUS} />
        <FilterSel label="Compliance" value={f.compliance_boundary} onChange={v => setF({ ...f, compliance_boundary: v })} options={COMPLIANCE_BOUNDARY} />
        <FilterSel label="Source" value={f.source_platform} onChange={v => setF({ ...f, source_platform: v })} options={SOURCE_PLATFORM} />
        <FilterSel label="HNW signal" value={f.hnw_signal_confidence} onChange={v => setF({ ...f, hnw_signal_confidence: v })} options={HNW_CONFIDENCE} />
        <FilterSel label="Cause fit" value={f.philanthropy_cause_fit} onChange={v => setF({ ...f, philanthropy_cause_fit: v })} options={PHILANTHROPY_CAUSE} />
        <FilterSel label="Deal relevance" value={f.deal_relevance} onChange={v => setF({ ...f, deal_relevance: v })} options={DEAL_RELEVANCE} />
        <FilterSel label="Alignment" value={f.alignment_quality} onChange={v => setF({ ...f, alignment_quality: v })} options={ALIGNMENT_QUALITY} />
        <FilterSel label="Owner" value={f.next_move_owner} onChange={v => setF({ ...f, next_move_owner: v })} options={NEXT_MOVE_OWNER} />
        <FilterSel label="Disclosure" value={f.disclosure_level} onChange={v => setF({ ...f, disclosure_level: v })} options={DISCLOSURE} />
        <FilterSel label="Trust" value={f.trust_level} onChange={v => setF({ ...f, trust_level: v })} options={TRUST} />
      </CardContent></Card>

      <Tabs value={sub} onValueChange={setSub}>
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="capital"><Crown className="h-3 w-3 mr-1" /> Capital Map</TabsTrigger>
          <TabsTrigger value="ghat"><HeartHandshake className="h-3 w-3 mr-1" /> GHAT Philanthropy</TabsTrigger>
          <TabsTrigger value="elite"><Briefcase className="h-3 w-3 mr-1" /> Elite Advisory</TabsTrigger>
          <TabsTrigger value="deal"><TrendingUp className="h-3 w-3 mr-1" /> Deal Flow</TabsTrigger>
          <TabsTrigger value="facebook"><Facebook className="h-3 w-3 mr-1" /> FB / Social Intake</TabsTrigger>
          <TabsTrigger value="intake_queue"><Inbox className="h-3 w-3 mr-1" /> Signal Intake Queue</TabsTrigger>
          <TabsTrigger value="park"><Pause className="h-3 w-3 mr-1" /> Park / Do Not Prioritise</TabsTrigger>
          <TabsTrigger value="positioning"><BookOpen className="h-3 w-3 mr-1" /> Positioning Library</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-3">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
            <Stat label="Capital & Influence records" v={overview.total} />
            <Stat label="Carren Estate capital" v={overview.carren} tone="ok" />
            <Stat label="GHAT philanthropy" v={overview.ghat} tone="ok" />
            <Stat label="Elite advisory" v={overview.elite} />
            <Stat label="Deal flow / acquisition" v={overview.deal} />
            <Stat label="Media / profile" v={overview.media} />
            <Stat label="Facebook / social signal" v={overview.facebook} />
            <Stat label="Ready to contact" v={overview.ready} tone="ok" />
            <Stat label="Meetings booked" v={overview.meetings} tone="ok" />
            <Stat label="Follow-ups due" v={overview.followUp} tone={overview.followUp ? "warn" : undefined} />
            <Stat label="Restricted / no disclosure" v={overview.restricted} tone={overview.restricted ? "warn" : undefined} />
            <Stat label="Parked / do not prioritise" v={overview.parked} />
            <Stat label="Parasite-risk / poor alignment" v={overview.parasite} tone={overview.parasite ? "warn" : undefined} />
          </div>
        </TabsContent>

        {(["capital","ghat","elite","deal","park"] as const).map((lane) => (
          <TabsContent key={lane} value={lane}>
            <LaneTable
              rows={laneRows(lane)}
              mode={lane === "ghat" ? "philanthropy" : "capital"}
              onEdit={onEdit}
              onQuick={(id, a) => quick.mutate({ id, action: a })}
              onPositioning={(id) => { setPositioningContactId(id); setSub("positioning"); }}
            />
          </TabsContent>
        ))}

        <TabsContent value="positioning">
          <PositioningLibrary contacts={contacts as any[]} initialContactId={positioningContactId} />
        </TabsContent>

        <TabsContent value="intake_queue">
          <SocialSignalIntakeQueue />
        </TabsContent>

        <TabsContent value="facebook" className="space-y-3">
          <Card className="tech-card">
            <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Facebook className="h-4 w-4 text-primary" /> Facebook / social signal intake (manual)</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <p className="text-[11px] text-muted-foreground">
                Manual capture only — no scraping, no auto-enrichment. Use the label "money signal" / "capital signal", not "confirmed HNW" unless manually entered in notes.
              </p>
              <div className="grid md:grid-cols-2 gap-2">
                <IField label="Contact name *"><Input value={intake.contact_name} onChange={e => setIntake({ ...intake, contact_name: e.target.value })} /></IField>
                <IField label="Organisation"><Input value={intake.organisation_name} onChange={e => setIntake({ ...intake, organisation_name: e.target.value })} /></IField>
                <IField label="Facebook profile URL"><Input value={intake.facebook_profile_url} onChange={e => setIntake({ ...intake, facebook_profile_url: e.target.value })} /></IField>
                <IField label="Age / age band"><Input value={intake.age_or_age_band} onChange={e => setIntake({ ...intake, age_or_age_band: e.target.value })} /></IField>
                <IField label="City / country"><Input value={intake.city_country} onChange={e => setIntake({ ...intake, city_country: e.target.value })} /></IField>
                <IField label="Source platform"><Sel value={intake.source_platform} onChange={v => setIntake({ ...intake, source_platform: v })} options={SOURCE_PLATFORM} /></IField>
                <IField label="Source evidence" full><Textarea rows={2} placeholder="Where seen, e.g. public post, event, mutual connection" value={intake.source_evidence} onChange={e => setIntake({ ...intake, source_evidence: e.target.value })} /></IField>
                <IField label="Money signal / capital signal" full><Textarea rows={2} placeholder="Observable signal only — do not record private financial detail." value={intake.money_signal} onChange={e => setIntake({ ...intake, money_signal: e.target.value })} /></IField>
                <IField label="Relationship angle" full><Textarea rows={2} value={intake.relationship_angle} onChange={e => setIntake({ ...intake, relationship_angle: e.target.value })} /></IField>
                <IField label="Capital lane"><Sel value={intake.capital_lane} onChange={v => setIntake({ ...intake, capital_lane: v })} options={CAPITAL_LANE} /></IField>
                <IField label="Capital role"><Sel value={intake.capital_role} onChange={v => setIntake({ ...intake, capital_role: v })} options={CAPITAL_ROLE} /></IField>
                <IField label="Best vehicle"><Sel value={intake.best_vehicle} onChange={v => setIntake({ ...intake, best_vehicle: v })} options={BEST_VEHICLE} /></IField>
                <IField label="HNW signal confidence"><Sel value={intake.hnw_signal_confidence} onChange={v => setIntake({ ...intake, hnw_signal_confidence: v })} options={HNW_CONFIDENCE} /></IField>
                <IField label="Philanthropy cause fit"><Sel value={intake.philanthropy_cause_fit} onChange={v => setIntake({ ...intake, philanthropy_cause_fit: v })} options={PHILANTHROPY_CAUSE} /></IField>
                <IField label="Deal relevance"><Sel value={intake.deal_relevance} onChange={v => setIntake({ ...intake, deal_relevance: v })} options={DEAL_RELEVANCE} /></IField>
                <IField label="Outreach status"><Sel value={intake.outreach_status} onChange={v => setIntake({ ...intake, outreach_status: v })} options={OUTREACH_STATUS} /></IField>
                <IField label="Disclosure level"><Sel value={intake.disclosure_level} onChange={v => setIntake({ ...intake, disclosure_level: v })} options={DISCLOSURE} /></IField>
                <IField label="Compliance boundary"><Sel value={intake.compliance_boundary} onChange={v => setIntake({ ...intake, compliance_boundary: v })} options={COMPLIANCE_BOUNDARY} /></IField>
                <IField label="Next move owner"><Sel value={intake.next_move_owner} onChange={v => setIntake({ ...intake, next_move_owner: v })} options={NEXT_MOVE_OWNER} /></IField>
                <IField label="Founder notes" full><Textarea rows={2} value={intake.founder_notes} onChange={e => setIntake({ ...intake, founder_notes: e.target.value })} placeholder="Avoid passwords, bank details or confidential documents." /></IField>
                <IField label="Priority notes" full><Textarea rows={2} value={intake.priority_notes} onChange={e => setIntake({ ...intake, priority_notes: e.target.value })} /></IField>
                <IField label="Next action summary" full><Input value={intake.next_action_summary} onChange={e => setIntake({ ...intake, next_action_summary: e.target.value })} /></IField>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="ghost" onClick={() => setIntake(emptyIntake)}>Reset</Button>
                <Button disabled={!intake.contact_name || addIntake.isPending} onClick={() => addIntake.mutate(intake)}>Add to Capital & Influence</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function LaneTable({ rows, mode, onEdit, onQuick, onPositioning }: { rows: any[]; mode: "capital" | "philanthropy"; onEdit: (c: any) => void; onQuick: (id: string, a: typeof QUICK_ACTIONS[number]) => void; onPositioning?: (id: string) => void }) {
  if (!rows.length) {
    return <Card className="tech-card"><CardContent className="p-8 text-center text-sm text-muted-foreground">No records match this lane yet. Classify contacts via the edit form or the Facebook / social intake to populate this view.</CardContent></Card>;
  }
  return (
    <Card className="tech-card"><CardContent className="p-0">
      <Table>
        <TableHeader><TableRow>
          <TableHead>Contact</TableHead>
          <TableHead>Lane / Role</TableHead>
          <TableHead>Vehicle</TableHead>
          <TableHead>Outreach</TableHead>
          <TableHead>Disclosure / Trust</TableHead>
          <TableHead>Alignment</TableHead>
          <TableHead>Signal / Angle</TableHead>
          <TableHead>Owner / Next</TableHead>
          <TableHead>Score</TableHead>
          <TableHead>Badges</TableHead>
          <TableHead></TableHead>
        </TableRow></TableHeader>
        <TableBody>
          {rows.map((c: any) => (
            <TableRow key={c.id}>
              <TableCell>
                <div className="font-medium">{c.contact_name}</div>
                <div className="text-xs text-muted-foreground">{c.organisation_name ?? "—"}</div>
              </TableCell>
              <TableCell className="text-xs">
                <div>{pretty(c.capital_lane) || <span className="text-muted-foreground">—</span>}</div>
                <div className="text-muted-foreground">{pretty(c.capital_role)}</div>
              </TableCell>
              <TableCell className="text-xs">{pretty(c.best_vehicle) || "—"}</TableCell>
              <TableCell><Badge variant="outline" className="text-[10px]">{pretty(c.outreach_status) || "—"}</Badge></TableCell>
              <TableCell className="text-xs">
                <Badge variant="outline" className={`text-[10px] ${disclosureTone(c.disclosure_level)}`}>{pretty(c.disclosure_level)}</Badge>
                <div className="text-muted-foreground mt-0.5">{pretty(c.trust_level)}</div>
              </TableCell>
              <TableCell className="text-xs">{pretty(c.alignment_quality) || "—"}</TableCell>
              <TableCell className="text-xs max-w-[220px]">
                <div className="truncate" title={c.money_signal ?? ""}>{c.money_signal ?? <span className="text-muted-foreground">—</span>}</div>
                <div className="truncate text-muted-foreground" title={c.relationship_angle ?? ""}>{c.relationship_angle ?? ""}</div>
              </TableCell>
              <TableCell className="text-xs">
                <div>{pretty(c.next_move_owner) || "—"}</div>
                <div className="text-muted-foreground truncate max-w-[180px]">{c.next_action_summary ?? ""}</div>
              </TableCell>
              <TableCell className="text-xs font-mono">{mode === "philanthropy" ? philanthropyPriority(c) : capitalPriority(c)}</TableCell>
              <TableCell><BadgesCell c={c} /></TableCell>
              <TableCell onClick={(e) => e.stopPropagation()}>
                <div className="flex flex-col gap-1 min-w-[200px]">
                  <Button variant="ghost" size="sm" onClick={() => onEdit(c)}>Edit</Button>
                  {onPositioning && (
                    <Button variant="ghost" size="sm" onClick={() => onPositioning(c.id)}>Open Positioning</Button>
                  )}
                  <details>
                    <summary className="text-[10px] text-muted-foreground cursor-pointer">Quick actions</summary>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {QUICK_ACTIONS.map(a => (
                        <Button key={a.key} size="sm" variant="outline" className="h-6 text-[10px] px-2" onClick={() => onQuick(c.id, a)}>{quickIcon(a.key)}{a.label}</Button>
                      ))}
                    </div>
                  </details>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </CardContent></Card>
  );
}

function quickIcon(key: string) {
  if (key === "park") return <Pause className="h-3 w-3 mr-1" />;
  if (key === "nda") return <FileSignature className="h-3 w-3 mr-1" />;
  if (key === "restrict") return <Lock className="h-3 w-3 mr-1" />;
  if (key === "parasite") return <AlertTriangle className="h-3 w-3 mr-1" />;
  if (key === "ready" || key === "contacted" || key === "replied" || key === "meet_book") return <CheckCircle2 className="h-3 w-3 mr-1" />;
  return null;
}

function BadgesCell({ c }: { c: any }) {
  const b: { l: string; cls: string }[] = [];
  if (c.best_vehicle === "carren_estate" || c.best_vehicle === "both") b.push({ l: "Carren Estate", cls: "bg-primary/15 text-primary border-primary/30" });
  if (c.best_vehicle === "ghat" || c.best_vehicle === "both") b.push({ l: "GHAT", cls: "bg-pink-500/15 text-pink-300 border-pink-500/30" });
  if (c.best_vehicle === "both") b.push({ l: "Both", cls: "bg-amber-500/15 text-amber-300 border-amber-500/30" });
  if (c.disclosure_level === "restricted") b.push({ l: "Restricted", cls: "bg-red-500/15 text-red-300 border-red-500/30" });
  if (c.disclosure_level === "nda_before_detail") b.push({ l: "NDA", cls: "bg-yellow-500/15 text-yellow-300 border-yellow-500/30" });
  if (c.capital_lane === "parked_not_priority" || c.best_vehicle === "park" || c.outreach_status === "parked") b.push({ l: "Park", cls: "bg-zinc-500/15 text-zinc-300 border-zinc-500/30" });
  if (c.alignment_quality === "parasite_risk") b.push({ l: "Parasite-risk", cls: "bg-red-500/15 text-red-300 border-red-500/30" });
  if (!b.length) return <span className="text-muted-foreground text-xs">—</span>;
  return <div className="flex flex-wrap gap-1">{b.map((x, i) => <Badge key={i} variant="outline" className={`text-[10px] ${x.cls}`}>{x.l}</Badge>)}</div>;
}

function Stat({ label, v, tone }: { label: string; v: number; tone?: "ok" | "warn" }) {
  const cls = tone === "warn" ? "border-yellow-500/40 text-yellow-300" : tone === "ok" ? "border-emerald-500/40 text-emerald-300" : "border-border/50";
  return (
    <div className={`border ${cls} rounded p-3`}>
      <p className="text-[10px] uppercase text-muted-foreground">{label}</p>
      <p className="text-xl font-bold">{v}</p>
    </div>
  );
}

function IField({ label, children, full }: { label: string; children: React.ReactNode; full?: boolean }) {
  return <div className={full ? "md:col-span-2" : ""}><label className="text-xs text-muted-foreground block mb-1">{label}</label>{children}</div>;
}
function Sel({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: readonly string[] }) {
  return <Select value={value || undefined} onValueChange={onChange}><SelectTrigger><SelectValue placeholder="—" /></SelectTrigger><SelectContent>{options.map(o => <SelectItem key={o} value={o}>{pretty(o)}</SelectItem>)}</SelectContent></Select>;
}
function FilterSel({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: readonly string[] }) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger><SelectValue placeholder={label} /></SelectTrigger>
      <SelectContent><SelectItem value="all">All {label.toLowerCase()}</SelectItem>{options.map(o => <SelectItem key={o} value={o}>{pretty(o)}</SelectItem>)}</SelectContent>
    </Select>
  );
}