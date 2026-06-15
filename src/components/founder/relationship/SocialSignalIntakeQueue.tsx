import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "@/hooks/use-toast";
import { ShieldAlert, ListPlus, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";
import {
  CAPITAL_LANE, CAPITAL_ROLE, BEST_VEHICLE, SOURCE_PLATFORM,
  HNW_CONFIDENCE, PHILANTHROPY_CAUSE, DEAL_RELEVANCE, ALIGNMENT_QUALITY,
  PARK_REASON, NEXT_MOVE_OWNER, COMPLIANCE_BOUNDARY,
} from "./capitalTaxonomy";

const sb: any = supabase as any;

function pretty(s?: string | null) { return (s ?? "").replace(/_/g, " "); }

type RowAction = "include" | "skip" | "park" | "carren" | "ghat" | "both" | "do_not_contact";

type Candidate = {
  _rid: string;
  action: RowAction;
  contact_name: string;
  organisation_name: string;
  facebook_profile_url: string;
  linkedin_url: string;
  age_or_age_band: string;
  city_country: string;
  visible_role_or_business: string;
  money_signal: string;
  philanthropy_signal: string;
  relationship_angle: string;
  capital_lane: string;
  capital_role: string;
  best_vehicle: string;
  hnw_signal_confidence: string;
  philanthropy_cause_fit: string;
  deal_relevance: string;
  alignment_quality: string;
  park_reason: string;
  source_platform: string;
  source_evidence: string;
  priority_notes: string;
  founder_notes: string;
  next_action_summary: string;
  next_move_owner: string;
  outreach_status: string;
  disclosure_level: string;
  compliance_boundary: string;
  tags: string;
  email: string;
  // computed
  dedupe_status: "new" | "possible_match" | "existing_match" | "missing_name" | "do_not_import";
  match_id: string | null;
  warnings: string[];
};

const COLUMN_KEYS = [
  "contact_name","organisation_name","facebook_profile_url","linkedin_url","age_or_age_band","city_country",
  "visible_role_or_business","money_signal","philanthropy_signal","relationship_angle",
  "best_vehicle","hnw_signal_confidence","next_action_summary","source_evidence","email","tags",
] as const;

function emptyCandidate(defaults: Partial<Candidate>): Candidate {
  return {
    _rid: crypto.randomUUID(),
    action: "include",
    contact_name: "", organisation_name: "", facebook_profile_url: "", linkedin_url: "",
    age_or_age_band: "", city_country: "", visible_role_or_business: "",
    money_signal: "", philanthropy_signal: "", relationship_angle: "",
    capital_lane: "", capital_role: "unknown", best_vehicle: "",
    hnw_signal_confidence: "unknown", philanthropy_cause_fit: "", deal_relevance: "",
    alignment_quality: "unknown", park_reason: "",
    source_platform: "facebook", source_evidence: "",
    priority_notes: "", founder_notes: "", next_action_summary: "",
    next_move_owner: "unknown", outreach_status: "researched",
    disclosure_level: "public_only", compliance_boundary: "relationship_only",
    tags: "", email: "",
    dedupe_status: "missing_name", match_id: null, warnings: [],
    ...defaults,
  };
}

function parsePasted(text: string): Partial<Candidate>[] {
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  if (!lines.length) return [];
  const sep = lines[0].includes("\t") ? "\t" : ",";
  const split = (s: string) => {
    if (sep === "\t") return s.split("\t").map(x => x.trim());
    // CSV with simple quote handling
    const out: string[] = []; let cur = ""; let q = false;
    for (let i = 0; i < s.length; i++) {
      const c = s[i];
      if (c === '"') { if (q && s[i+1] === '"') { cur += '"'; i++; } else { q = !q; } }
      else if (c === "," && !q) { out.push(cur.trim()); cur = ""; }
      else cur += c;
    }
    out.push(cur.trim());
    return out;
  };
  const header = split(lines[0]).map(h => h.toLowerCase().replace(/[\s-]+/g, "_"));
  const looksLikeHeader = header.some(h => COLUMN_KEYS.includes(h as any) || ["name","org","organization","organisation","profile","profile_url","url","location","city","country","role","business","signal","angle","vehicle","confidence","next_action"].includes(h));
  const startAt = looksLikeHeader ? 1 : 0;
  const norm: Record<string, keyof Candidate> = {
    name: "contact_name", contact_name: "contact_name",
    org: "organisation_name", organization: "organisation_name", organisation: "organisation_name", organisation_name: "organisation_name", organization_name: "organisation_name", company: "organisation_name",
    profile: "facebook_profile_url", profile_url: "facebook_profile_url", facebook: "facebook_profile_url", facebook_profile_url: "facebook_profile_url", fb: "facebook_profile_url", url: "facebook_profile_url",
    linkedin: "linkedin_url", linkedin_url: "linkedin_url",
    age: "age_or_age_band", age_band: "age_or_age_band", age_or_age_band: "age_or_age_band",
    location: "city_country", city: "city_country", country: "city_country", city_country: "city_country",
    role: "visible_role_or_business", business: "visible_role_or_business", visible_role: "visible_role_or_business", visible_role_or_business: "visible_role_or_business",
    money_signal: "money_signal", signal: "money_signal", capital_signal: "money_signal",
    philanthropy_signal: "philanthropy_signal", philanthropy: "philanthropy_signal",
    relationship_angle: "relationship_angle", angle: "relationship_angle",
    vehicle: "best_vehicle", best_vehicle: "best_vehicle",
    confidence: "hnw_signal_confidence", hnw: "hnw_signal_confidence", hnw_signal_confidence: "hnw_signal_confidence",
    next_action: "next_action_summary", next_action_summary: "next_action_summary",
    notes: "founder_notes", founder_notes: "founder_notes", priority_notes: "priority_notes",
    source_evidence: "source_evidence", evidence: "source_evidence",
    email: "email", tags: "tags",
  };
  const out: Partial<Candidate>[] = [];
  for (let i = startAt; i < lines.length; i++) {
    const cells = split(lines[i]);
    const row: Partial<Candidate> = {};
    if (looksLikeHeader) {
      header.forEach((h, idx) => {
        const key = norm[h];
        if (key) (row as any)[key] = cells[idx] ?? "";
      });
    } else {
      // No header: assume name, organisation, profile_url, location, signal, angle
      const order: (keyof Candidate)[] = ["contact_name","organisation_name","facebook_profile_url","city_country","money_signal","relationship_angle"];
      order.forEach((k, idx) => { (row as any)[k] = cells[idx] ?? ""; });
    }
    if (Object.values(row).some(v => (v ?? "").toString().trim())) out.push(row);
  }
  return out;
}

function applyRouteDefaults(c: Candidate): Candidate {
  const x = { ...c };
  if (c.action === "carren") {
    x.best_vehicle = "carren_estate"; x.capital_lane = "carren_estate_principal_capital";
    x.compliance_boundary = "relationship_only";
  } else if (c.action === "ghat") {
    x.best_vehicle = "ghat"; x.capital_lane = "ghat_philanthropy_giving";
    x.compliance_boundary = "relationship_only";
  } else if (c.action === "both") {
    x.best_vehicle = "both"; x.compliance_boundary = "relationship_only";
  } else if (c.action === "park") {
    x.best_vehicle = "park"; x.capital_lane = "parked_not_priority";
    x.outreach_status = "parked";
  } else if (c.action === "do_not_contact") {
    x.outreach_status = "do_not_contact";
    x.compliance_boundary = "restricted"; x.disclosure_level = "restricted";
  }
  return x;
}

function buildInsertPayload(c: Candidate, batch: { label: string; source: string; notes: string }, actor: string | null) {
  const angleBits = [c.relationship_angle, c.visible_role_or_business].filter(Boolean).join(" — ");
  const philNotes = c.philanthropy_signal || null;
  const tags = (c.tags || "").split(",").map(t => t.trim()).filter(Boolean);
  const ev = [c.source_evidence, c.linkedin_url ? `LinkedIn: ${c.linkedin_url}` : "", `Batch: ${batch.label}`, batch.notes ? `Notes: ${batch.notes}` : ""].filter(Boolean).join(" | ");
  return {
    contact_name: c.contact_name.trim(),
    organisation_name: c.organisation_name || null,
    email: c.email || null,
    website: c.linkedin_url && !c.facebook_profile_url ? c.linkedin_url : null,
    facebook_profile_url: c.facebook_profile_url || null,
    age_or_age_band: c.age_or_age_band || null,
    city_country: c.city_country || null,
    relationship_type: "other",
    relationship_status: "new",
    opportunity_role: "intelligence_source",
    trust_level: "unknown",
    disclosure_level: c.disclosure_level || "public_only",
    source: c.source_platform || batch.source || "facebook",
    source_platform: c.source_platform || batch.source || "facebook",
    source_evidence: ev || null,
    money_signal: c.money_signal || null,
    relationship_angle: angleBits || null,
    capital_lane: c.capital_lane || null,
    capital_role: c.capital_role && c.capital_role !== "unknown" ? c.capital_role : null,
    best_vehicle: c.best_vehicle || null,
    hnw_signal_confidence: c.hnw_signal_confidence || "unknown",
    philanthropy_cause_fit: c.philanthropy_cause_fit || null,
    deal_relevance: c.deal_relevance || null,
    alignment_quality: c.alignment_quality || "unknown",
    park_reason: c.park_reason || null,
    outreach_status: c.outreach_status || "researched",
    compliance_boundary: c.compliance_boundary || "relationship_only",
    next_action_summary: c.next_action_summary || null,
    next_move_owner: c.next_move_owner || "unknown",
    priority_notes: c.priority_notes || null,
    philanthropy_notes: philNotes,
    founder_notes: c.founder_notes || null,
    tags,
    created_by: actor,
  };
}

const PROTECTED_NOTES = [
  "founder_notes","ai_summary","meeting_summary","source_notes",
  "priority_notes","private_capital_notes","philanthropy_notes","elite_context_notes",
] as const;

const DISCLOSURE_RANK: Record<string, number> = {
  public_only: 0, light_context: 1, nda_before_detail: 2, confidential_allowed: 3, restricted: 4,
};
const TRUST_RANK: Record<string, number> = { unknown: 0, low: 1, medium: 2, high: 3, vetted: 4 };

function buildUpdatePatch(existing: any, c: Candidate, payload: any) {
  const patch: any = {};
  const fillIfBlank = (k: string) => { if (!existing[k] && payload[k] != null && payload[k] !== "") patch[k] = payload[k]; };
  // Simple scalar fields: fill if blank
  ["organisation_name","email","facebook_profile_url","age_or_age_band","city_country",
   "money_signal","relationship_angle","capital_lane","capital_role","best_vehicle",
   "philanthropy_cause_fit","deal_relevance","park_reason","next_action_summary",
   "next_move_owner","source_platform","source_evidence","website","outreach_status",
  ].forEach(fillIfBlank);
  // Protected note fields — fill only if blank
  for (const k of PROTECTED_NOTES) fillIfBlank(k);
  // hnw_signal_confidence / alignment_quality — fill if currently unknown/blank
  if ((!existing.hnw_signal_confidence || existing.hnw_signal_confidence === "unknown") && payload.hnw_signal_confidence && payload.hnw_signal_confidence !== "unknown") patch.hnw_signal_confidence = payload.hnw_signal_confidence;
  if ((!existing.alignment_quality || existing.alignment_quality === "unknown") && payload.alignment_quality && payload.alignment_quality !== "unknown") patch.alignment_quality = payload.alignment_quality;
  // Disclosure: never downgrade. Only upgrade.
  if (DISCLOSURE_RANK[payload.disclosure_level] > DISCLOSURE_RANK[existing.disclosure_level ?? "public_only"]) {
    patch.disclosure_level = payload.disclosure_level;
  }
  // Compliance: prefer stricter restricted
  if (payload.compliance_boundary === "restricted" && existing.compliance_boundary !== "restricted") {
    patch.compliance_boundary = "restricted";
  } else if (!existing.compliance_boundary && payload.compliance_boundary) {
    patch.compliance_boundary = payload.compliance_boundary;
  }
  // Preserve do_not_contact
  if (existing.outreach_status === "do_not_contact") {
    delete patch.outreach_status;
  } else if (c.action === "do_not_contact") {
    patch.outreach_status = "do_not_contact";
  } else if (c.action === "park" && existing.outreach_status !== "do_not_contact") {
    patch.outreach_status = "parked";
  }
  // Trust: preserve higher
  // (we don't set trust from intake; skip)
  // Tags: merge
  const curTags: string[] = existing.tags ?? [];
  const newTags: string[] = payload.tags ?? [];
  const merged = Array.from(new Set([...curTags, ...newTags]));
  if (merged.length !== curTags.length) patch.tags = merged;
  return patch;
}

function recomputeDedupe(c: Candidate, existing: any[]): Candidate {
  const warnings: string[] = [];
  if (!c.contact_name.trim()) {
    return { ...c, dedupe_status: "missing_name", match_id: null, warnings: ["Missing name — cannot import"] };
  }
  if (!c.money_signal && !c.relationship_angle && !c.visible_role_or_business) warnings.push("needs research");
  if (c.source_platform === "facebook" && !c.facebook_profile_url && !c.source_evidence) warnings.push("No profile/source evidence");

  const name = c.contact_name.trim().toLowerCase();
  const org = (c.organisation_name || "").trim().toLowerCase();
  const cc = (c.city_country || "").trim().toLowerCase();
  const email = (c.email || "").trim().toLowerCase();
  const fb = (c.facebook_profile_url || "").trim().toLowerCase();

  let exact: any = null;
  let possible: any = null;
  for (const e of existing) {
    const eName = (e.contact_name ?? "").toLowerCase();
    const eOrg = (e.organisation_name ?? "").toLowerCase();
    const eCC = (e.city_country ?? "").toLowerCase();
    const eEmail = (e.email ?? "").toLowerCase();
    const eFb = (e.facebook_profile_url ?? "").toLowerCase();
    const eWeb = (e.website ?? "").toLowerCase();
    if (email && eEmail && email === eEmail) { exact = e; break; }
    if (fb && (eFb === fb || eWeb === fb)) { exact = e; break; }
    if (name && org && eName === name && eOrg === org) { exact = e; break; }
    if (name && cc && eName === name && eCC === cc) { possible = possible || e; }
    else if (name && eName === name) { possible = possible || e; }
  }
  if (exact) return { ...c, dedupe_status: "existing_match", match_id: exact.id, warnings };
  if (possible) return { ...c, dedupe_status: "possible_match", match_id: possible.id, warnings };
  return { ...c, dedupe_status: "new", match_id: null, warnings };
}

export default function SocialSignalIntakeQueue() {
  const qc = useQueryClient();
  const [batch, setBatch] = useState({
    label: "", source: "facebook", notes: "",
    default_vehicle: "", default_owner: "mandy",
    default_confidence: "unknown", default_compliance: "relationship_only",
  });
  const [paste, setPaste] = useState("");
  const [rows, setRows] = useState<Candidate[]>([]);
  const [result, setResult] = useState<null | { created: number; updated: number; skipped: number; possible: number; missing: number; carren: number; ghat: number; both: number; parked: number; do_not_contact: number; needs_research: number; recordIds: string[] }>(null);

  const { data: existing = [] } = useQuery<any[]>({
    queryKey: ["rni-contacts-for-intake"],
    queryFn: async () => {
      const { data, error } = await sb.from("relationship_intelligence_contacts").select("id,contact_name,organisation_name,email,phone,website,facebook_profile_url,city_country,disclosure_level,compliance_boundary,outreach_status,trust_level,hnw_signal_confidence,alignment_quality,tags,founder_notes,ai_summary,meeting_summary,source_notes,priority_notes,private_capital_notes,philanthropy_notes,elite_context_notes").limit(5000);
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: recent = [] } = useQuery<any[]>({
    queryKey: ["rni-recent-social"],
    queryFn: async () => {
      const { data } = await sb.from("relationship_intelligence_contacts")
        .select("id,contact_name,organisation_name,source_platform,source_evidence,updated_at,best_vehicle,outreach_status,disclosure_level")
        .in("source_platform", ["facebook","linkedin","public_research","event_list"])
        .order("updated_at", { ascending: false })
        .limit(25);
      return data ?? [];
    },
  });

  function parseNow() {
    const parsed = parsePasted(paste);
    if (!parsed.length) { toast({ title: "Nothing to parse", description: "Paste rows above first.", variant: "destructive" }); return; }
    const next: Candidate[] = parsed.map(p => {
      const c = emptyCandidate({
        ...p,
        source_platform: (p.source_platform as string) || batch.source || "facebook",
        best_vehicle: (p.best_vehicle as string) || batch.default_vehicle || "",
        hnw_signal_confidence: (p.hnw_signal_confidence as string) || batch.default_confidence || "unknown",
        next_move_owner: (p.next_move_owner as string) || batch.default_owner || "unknown",
        compliance_boundary: (p.compliance_boundary as string) || batch.default_compliance || "relationship_only",
      });
      return recomputeDedupe(c, existing);
    });
    setRows(next);
    toast({ title: `Parsed ${next.length} rows` });
  }

  function addBlank() {
    setRows(r => [...r, recomputeDedupe(emptyCandidate({
      source_platform: batch.source || "facebook",
      best_vehicle: batch.default_vehicle || "",
      hnw_signal_confidence: batch.default_confidence || "unknown",
      next_move_owner: batch.default_owner || "unknown",
      compliance_boundary: batch.default_compliance || "relationship_only",
    }), existing)]);
  }

  function updateRow(rid: string, patch: Partial<Candidate>) {
    setRows(r => r.map(x => {
      if (x._rid !== rid) return x;
      const merged = { ...x, ...patch };
      // Recompute dedupe if identity fields changed
      const identityChanged = ["contact_name","organisation_name","email","facebook_profile_url","city_country"].some(k => k in patch);
      return identityChanged ? recomputeDedupe(merged, existing) : merged;
    }));
  }

  function setAllAction(action: RowAction) {
    setRows(r => r.map(x => ({ ...x, action })));
  }

  const commit = useMutation({
    mutationFn: async () => {
      if (!batch.label.trim()) throw new Error("Batch label required");
      const { data: u } = await sb.auth.getUser();
      const actor = u?.user?.id ?? null;
      let created = 0, updated = 0, skipped = 0, possible = 0, missing = 0;
      let carren = 0, ghat = 0, both = 0, parked = 0, dnc = 0, needs = 0;
      const recordIds: string[] = [];

      for (const raw of rows) {
        if (raw.dedupe_status === "possible_match") possible++;
        if (raw.warnings.includes("needs research")) needs++;
        if (!raw.contact_name.trim()) { missing++; continue; }
        if (raw.action === "skip") {
          skipped++;
          continue;
        }
        const c = applyRouteDefaults(raw);
        const payload = buildInsertPayload(c, batch, actor);

        // counters by route
        if (c.action === "carren") carren++;
        else if (c.action === "ghat") ghat++;
        else if (c.action === "both") both++;
        else if (c.action === "park") parked++;
        else if (c.action === "do_not_contact") dnc++;

        const match = raw.match_id ? existing.find(e => e.id === raw.match_id) : null;
        const batchMeta = { batch_label: batch.label, source_platform: payload.source_platform, source_notes: batch.notes || null, action: c.action };

        if (match) {
          const patch = buildUpdatePatch(match, c, payload);
          if (Object.keys(patch).length === 0) {
            await sb.from("relationship_intelligence_events").insert({
              contact_id: match.id, event_type: "social_signal_intake_skipped", actor_id: actor,
              summary: `Already complete — batch "${batch.label}" (${payload.source_platform})`,
              metadata: batchMeta,
            });
            skipped++;
            continue;
          }
          const { error } = await sb.from("relationship_intelligence_contacts").update(patch).eq("id", match.id);
          if (error) { skipped++; continue; }
          const evType = c.action === "park" ? "social_signal_intake_parked"
            : c.action === "do_not_contact" ? "social_signal_intake_do_not_contact"
            : "social_signal_intake_updated";
          await sb.from("relationship_intelligence_events").insert({
            contact_id: match.id, event_type: evType, actor_id: actor,
            summary: `Updated from batch "${batch.label}" (${payload.source_platform}): ${Object.keys(patch).join(", ")}`,
            metadata: batchMeta,
          });
          updated++; recordIds.push(match.id);
        } else {
          const { data: ins, error } = await sb.from("relationship_intelligence_contacts").insert(payload).select("id").single();
          if (error || !ins) { skipped++; continue; }
          const evType = c.action === "park" ? "social_signal_intake_parked"
            : c.action === "do_not_contact" ? "social_signal_intake_do_not_contact"
            : "social_signal_intake_created";
          await sb.from("relationship_intelligence_events").insert({
            contact_id: ins.id, event_type: evType, actor_id: actor,
            summary: `Created from batch "${batch.label}" (${payload.source_platform})`,
            metadata: batchMeta,
          });
          created++; recordIds.push(ins.id);
        }
      }
      return { created, updated, skipped, possible, missing, carren, ghat, both, parked, do_not_contact: dnc, needs_research: needs, recordIds };
    },
    onSuccess: (r) => {
      setResult(r);
      qc.invalidateQueries({ queryKey: ["rni-contacts"] });
      qc.invalidateQueries({ queryKey: ["rni-contacts-for-intake"] });
      qc.invalidateQueries({ queryKey: ["rni-recent-social"] });
      toast({ title: "Batch committed", description: `${r.created} created · ${r.updated} updated · ${r.skipped} skipped` });
    },
    onError: (e: any) => toast({ title: "Commit failed", description: e.message, variant: "destructive" }),
  });

  const importable = useMemo(() => rows.filter(r => r.contact_name.trim()), [rows]);
  const canCommit = !!batch.label.trim() && importable.length > 0 && !commit.isPending;

  return (
    <div className="space-y-4">
      <Card className="tech-card border-yellow-500/30 bg-yellow-500/5">
        <CardContent className="p-3 text-xs text-yellow-200/90 flex items-start gap-2">
          <ShieldAlert className="h-4 w-4 mt-0.5 shrink-0" />
          <div>
            Manual relationship-intelligence intake only. No scraping, no automatic enrichment, no product literature, no solicitation, no client-money request and no external outreach.
          </div>
        </CardContent>
      </Card>

      <Card className="tech-card">
        <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><ListPlus className="h-4 w-4 text-primary" /> Social Signal Intake Queue — batch controls</CardTitle></CardHeader>
        <CardContent className="grid md:grid-cols-3 gap-2">
          <Lbl label="Batch label *"><Input value={batch.label} onChange={e => setBatch({ ...batch, label: e.target.value })} placeholder="e.g. Facebook screenshots — June 2026" /></Lbl>
          <Lbl label="Source platform"><Sel value={batch.source} onChange={v => setBatch({ ...batch, source: v })} options={SOURCE_PLATFORM} /></Lbl>
          <Lbl label="Source notes / evidence"><Input value={batch.notes} onChange={e => setBatch({ ...batch, notes: e.target.value })} placeholder="Where seen, e.g. group, mutual, event" /></Lbl>
          <Lbl label="Default vehicle"><Sel value={batch.default_vehicle} onChange={v => setBatch({ ...batch, default_vehicle: v })} options={BEST_VEHICLE} allowEmpty /></Lbl>
          <Lbl label="Default next-move owner"><Sel value={batch.default_owner} onChange={v => setBatch({ ...batch, default_owner: v })} options={NEXT_MOVE_OWNER} /></Lbl>
          <Lbl label="Default confidence"><Sel value={batch.default_confidence} onChange={v => setBatch({ ...batch, default_confidence: v })} options={HNW_CONFIDENCE} /></Lbl>
          <Lbl label="Default compliance boundary"><Sel value={batch.default_compliance} onChange={v => setBatch({ ...batch, default_compliance: v })} options={COMPLIANCE_BOUNDARY} /></Lbl>
        </CardContent>
      </Card>

      <Card className="tech-card">
        <CardHeader className="pb-2"><CardTitle className="text-sm">Paste rows</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          <p className="text-[11px] text-muted-foreground">
            Paste rows from ChatGPT extraction, spreadsheet, or manual notes. Recommended columns:
            name, organisation, profile_url, age_or_age_band, location, visible_role_or_business, money_signal, philanthropy_signal, relationship_angle, best_vehicle, confidence, next_action.
            CSV or tab-separated. A header row is detected automatically.
          </p>
          <Textarea rows={6} value={paste} onChange={e => setPaste(e.target.value)} placeholder="name,organisation,profile_url,location,money_signal,relationship_angle&#10;Jane Doe,Doe Family Office,https://facebook.com/janed,London UK,Family office signal,Met via event" className="font-mono text-xs" />
          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={parseNow}>Parse rows</Button>
            <Button size="sm" variant="outline" onClick={addBlank}>Add blank row</Button>
            <Button size="sm" variant="ghost" onClick={() => { setRows([]); setPaste(""); }}>Clear</Button>
            {rows.length > 0 && (
              <div className="flex items-center gap-1 ml-auto text-[11px] text-muted-foreground">
                Bulk action:
                {(["include","skip","park","carren","ghat","both","do_not_contact"] as RowAction[]).map(a => (
                  <Button key={a} size="sm" variant="outline" className="h-6 px-2 text-[10px]" onClick={() => setAllAction(a)}>{pretty(a)}</Button>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {rows.length > 0 && (
        <Card className="tech-card">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm">Candidate review ({rows.length})</CardTitle>
            <Button size="sm" disabled={!canCommit} onClick={() => commit.mutate()}>
              {commit.isPending ? "Committing…" : "Commit selected rows"}
            </Button>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader><TableRow>
                <TableHead>Status</TableHead>
                <TableHead>Name / Org</TableHead>
                <TableHead>Profile / Location</TableHead>
                <TableHead>Signal / Angle</TableHead>
                <TableHead>Classification</TableHead>
                <TableHead>Action</TableHead>
                <TableHead></TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {rows.map(r => (
                  <TableRow key={r._rid}>
                    <TableCell className="text-xs">
                      <DedupeBadge s={r.dedupe_status} />
                      {r.warnings.map((w, i) => <Badge key={i} variant="outline" className="text-[10px] mt-1 block bg-yellow-500/10 text-yellow-300 border-yellow-500/30">{w}</Badge>)}
                    </TableCell>
                    <TableCell className="text-xs">
                      <Input className="h-7 text-xs" value={r.contact_name} placeholder="Contact name *" onChange={e => updateRow(r._rid, { contact_name: e.target.value })} />
                      <Input className="h-7 text-xs mt-1" value={r.organisation_name} placeholder="Organisation" onChange={e => updateRow(r._rid, { organisation_name: e.target.value })} />
                    </TableCell>
                    <TableCell className="text-xs">
                      <Input className="h-7 text-xs" value={r.facebook_profile_url} placeholder="Profile URL" onChange={e => updateRow(r._rid, { facebook_profile_url: e.target.value })} />
                      <Input className="h-7 text-xs mt-1" value={r.city_country} placeholder="City / Country" onChange={e => updateRow(r._rid, { city_country: e.target.value })} />
                    </TableCell>
                    <TableCell className="text-xs max-w-[260px]">
                      <Input className="h-7 text-xs" value={r.money_signal} placeholder="Money / capital signal" onChange={e => updateRow(r._rid, { money_signal: e.target.value })} />
                      <Input className="h-7 text-xs mt-1" value={r.relationship_angle} placeholder="Relationship angle" onChange={e => updateRow(r._rid, { relationship_angle: e.target.value })} />
                    </TableCell>
                    <TableCell className="text-xs">
                      <Sel value={r.best_vehicle} onChange={v => updateRow(r._rid, { best_vehicle: v })} options={BEST_VEHICLE} allowEmpty placeholder="Vehicle" />
                      <div className="mt-1"><Sel value={r.hnw_signal_confidence} onChange={v => updateRow(r._rid, { hnw_signal_confidence: v })} options={HNW_CONFIDENCE} placeholder="Confidence" /></div>
                    </TableCell>
                    <TableCell>
                      <Sel value={r.action} onChange={v => updateRow(r._rid, { action: v as RowAction })} options={["include","skip","park","carren","ghat","both","do_not_contact"] as any} />
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" className="h-6 text-[10px]" onClick={() => setRows(rr => rr.filter(x => x._rid !== r._rid))}>Remove</Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {result && (
        <Card className="tech-card border-primary/40">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm">Batch result — {batch.label}</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => { setResult(null); setRows([]); }}>Dismiss</Button>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 md:grid-cols-6 gap-2 text-xs">
              <Stat label="Created" v={result.created} tone="ok" />
              <Stat label="Updated" v={result.updated} />
              <Stat label="Skipped" v={result.skipped} />
              <Stat label="Possible duplicates" v={result.possible} tone={result.possible ? "warn" : undefined} />
              <Stat label="Missing name" v={result.missing} tone={result.missing ? "warn" : undefined} />
              <Stat label="Carren Estate route" v={result.carren} />
              <Stat label="GHAT route" v={result.ghat} />
              <Stat label="Both routes" v={result.both} />
              <Stat label="Parked" v={result.parked} />
              <Stat label="Do not contact" v={result.do_not_contact} />
              <Stat label="Needs research" v={result.needs_research} tone={result.needs_research ? "warn" : undefined} />
            </div>
            {result.recordIds.length > 0 && (
              <div>
                <p className="text-[10px] uppercase text-muted-foreground mb-1">Committed records ({result.recordIds.length})</p>
                <div className="flex flex-wrap gap-1">
                  {result.recordIds.slice(0, 50).map(id => (
                    <Link key={id} to={`/founder/relationship-intelligence?tab=capital-influence&contact=${id}`} className="text-[10px] underline text-primary">
                      {id.slice(0, 8)}
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Card className="tech-card">
        <CardHeader className="pb-2"><CardTitle className="text-sm">Recent social-signal records</CardTitle></CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          {recent.length === 0 ? (
            <div className="p-6 text-center text-xs text-muted-foreground">No social-signal records yet. Commit a batch to populate.</div>
          ) : (
            <Table>
              <TableHeader><TableRow>
                <TableHead>Contact</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Vehicle</TableHead>
                <TableHead>Outreach</TableHead>
                <TableHead>Updated</TableHead>
                <TableHead></TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {recent.map(c => (
                  <TableRow key={c.id}>
                    <TableCell className="text-xs">
                      <div className="font-medium">{c.contact_name}</div>
                      <div className="text-muted-foreground">{c.organisation_name ?? "—"}</div>
                    </TableCell>
                    <TableCell className="text-xs">{pretty(c.source_platform)}</TableCell>
                    <TableCell className="text-xs">{pretty(c.best_vehicle) || "—"}</TableCell>
                    <TableCell className="text-xs">{pretty(c.outreach_status) || "—"}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{c.updated_at ? new Date(c.updated_at).toLocaleString() : "—"}</TableCell>
                    <TableCell>
                      <Link to={`/founder/relationship-intelligence?tab=capital-influence&contact=${c.id}`} className="text-[10px] underline text-primary flex items-center gap-1">
                        Open <ExternalLink className="h-3 w-3" />
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Lbl({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><label className="text-xs text-muted-foreground block mb-1">{label}</label>{children}</div>;
}
function Sel({ value, onChange, options, allowEmpty, placeholder }: { value: string; onChange: (v: string) => void; options: readonly string[]; allowEmpty?: boolean; placeholder?: string }) {
  return (
    <Select value={value || undefined} onValueChange={(v) => onChange(v === "__none__" ? "" : v)}>
      <SelectTrigger className="h-8 text-xs"><SelectValue placeholder={placeholder ?? "—"} /></SelectTrigger>
      <SelectContent>
        {allowEmpty && <SelectItem value="__none__">—</SelectItem>}
        {options.map(o => <SelectItem key={o} value={o}>{pretty(o)}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}
function DedupeBadge({ s }: { s: Candidate["dedupe_status"] }) {
  const map: Record<string, string> = {
    new: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
    possible_match: "bg-yellow-500/15 text-yellow-300 border-yellow-500/30",
    existing_match: "bg-blue-500/15 text-blue-300 border-blue-500/30",
    missing_name: "bg-red-500/15 text-red-300 border-red-500/30",
    do_not_import: "bg-red-500/15 text-red-300 border-red-500/30",
  };
  return <Badge variant="outline" className={`text-[10px] ${map[s] || ""}`}>{pretty(s)}</Badge>;
}
function Stat({ label, v, tone }: { label: string; v: number; tone?: "ok" | "warn" }) {
  const cls = tone === "warn" ? "border-yellow-500/40 text-yellow-300" : tone === "ok" ? "border-emerald-500/40 text-emerald-300" : "border-border/50";
  return (
    <div className={`border ${cls} rounded p-2`}>
      <p className="text-[10px] uppercase text-muted-foreground">{label}</p>
      <p className="text-base font-bold">{v}</p>
    </div>
  );
}

// Silence unused-import warnings for taxonomy enums kept available for future cells.
void CAPITAL_LANE; void CAPITAL_ROLE; void PHILANTHROPY_CAUSE; void DEAL_RELEVANCE; void ALIGNMENT_QUALITY; void PARK_REASON; void COLUMN_KEYS;