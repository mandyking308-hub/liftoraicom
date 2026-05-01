import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "@/hooks/use-toast";
import FounderLayout from "@/components/founder/FounderLayout";
import { AlertTriangle, CheckCircle2, KeyRound, Loader2, Play, RefreshCw, ShieldAlert, Trash2, Wand2, Info } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Checkbox } from "@/components/ui/checkbox";
import { Link } from "react-router-dom";

const MUSIC_TARGET_KEYWORDS = [
  "playlist curator", "music curator", "independent curator", "music programmer",
  "music editor", "editorial curator", "music discovery", "music blogger",
  "music influencer", "music journalist", "music supervisor", "a&r", "dj",
  "radio", "label manager", "music marketing", "dance creator", "reaction creator", "ai music",
];

type LeadRow = {
  id: string;
  apollo_person_id: string;
  first_name: string | null;
  last_name: string | null;
  title: string | null;
  company: string | null;
  country: string | null;
  has_email_flag: boolean;
  search_payload: any;
};

function obfuscateLast(last: string | null): string {
  if (!last) return "—";
  const trimmed = last.trim();
  if (trimmed.length <= 1) return trimmed;
  return `${trimmed[0]}${"•".repeat(Math.min(trimmed.length - 1, 5))}`;
}

function fitTagsFor(lead: LeadRow): string[] {
  const hay = `${lead.title ?? ""} ${lead.company ?? ""}`.toLowerCase();
  return MUSIC_TARGET_KEYWORDS.filter((kw) => hay.includes(kw));
}

type ContactRow = {
  id: string;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  name: string | null;
  company: string | null;
  role: string | null;
  linkedin_url: string | null;
  apollo_person_id: string | null;
  apollo_organization_id: string | null;
  is_globally_suppressed: boolean;
  hard_bounced: boolean;
  tags: string[] | null;
  last_contacted_at: string | null;
  active_campaign_id: string | null;
};

type DupeStatus = "new" | "existing" | "possible";

type DupeMatch = {
  status: DupeStatus;
  contact: ContactRow | null;
  reason: string;
  hasKnownEmail: boolean;
  isSuppressed: boolean;
};

type PreviewSelection = {
  total: number;
  selectedIds: string[];
  newCount: number;
  existingSkipped: number;
  possibleHeld: number;
  creditsToSpend: number;
  creditsSaved: number;
  suppressedCount: number;
  matched: number;
  ready: boolean;
};

function normalize(s: string | null | undefined): string {
  return (s ?? "").trim().toLowerCase();
}

function tokenSimilar(a: string | null | undefined, b: string | null | undefined): boolean {
  const na = normalize(a);
  const nb = normalize(b);
  if (!na || !nb) return false;
  if (na === nb) return true;
  return na.includes(nb) || nb.includes(na);
}

function matchLead(lead: LeadRow, contacts: ContactRow[]): DupeMatch {
  const linkedin = normalize(lead.search_payload?.linkedin_url);
  const byPerson = contacts.find((c) => c.apollo_person_id && c.apollo_person_id === lead.apollo_person_id);
  if (byPerson) {
    return {
      status: "existing",
      contact: byPerson,
      reason: "Apollo person ID matches existing contact",
      hasKnownEmail: !!byPerson.email,
      isSuppressed: byPerson.is_globally_suppressed || byPerson.hard_bounced,
    };
  }
  if (linkedin) {
    const byLi = contacts.find((c) => normalize(c.linkedin_url) === linkedin);
    if (byLi) {
      return {
        status: "existing",
        contact: byLi,
        reason: "LinkedIn URL matches existing contact",
        hasKnownEmail: !!byLi.email,
        isSuppressed: byLi.is_globally_suppressed || byLi.hard_bounced,
      };
    }
  }
  const fn = normalize(lead.first_name);
  const co = normalize(lead.company);
  const ti = normalize(lead.title);
  if (fn && co) {
    const exact = contacts.find((c) => normalize(c.first_name) === fn && normalize(c.company) === co);
    if (exact) {
      const titleSim = tokenSimilar(ti, exact.role);
      return {
        status: titleSim ? "existing" : "possible",
        contact: exact,
        reason: titleSim
          ? "First name + company + similar title match"
          : "First name + company match (title differs)",
        hasKnownEmail: !!exact.email,
        isSuppressed: exact.is_globally_suppressed || exact.hard_bounced,
      };
    }
  }
  const orgId = lead.search_payload?.organization?.id ?? lead.search_payload?.organization_id ?? null;
  if (orgId && fn) {
    const byOrg = contacts.find((c) => c.apollo_organization_id === orgId && normalize(c.first_name) === fn);
    if (byOrg) {
      return {
        status: "possible",
        contact: byOrg,
        reason: "Same Apollo organization + first name",
        hasKnownEmail: !!byOrg.email,
        isSuppressed: byOrg.is_globally_suppressed || byOrg.hard_bounced,
      };
    }
  }
  if (fn && (co || ti)) {
    const possible = contacts.find((c) => normalize(c.first_name) === fn && (tokenSimilar(co, c.company) || tokenSimilar(ti, c.role)));
    if (possible) {
      return {
        status: "possible",
        contact: possible,
        reason: "First name + similar company/title overlap",
        hasKnownEmail: !!possible.email,
        isSuppressed: possible.is_globally_suppressed || possible.hard_bounced,
      };
    }
  }
  return { status: "new", contact: null, reason: "No CRM match", hasKnownEmail: false, isSuppressed: false };
}

function CandidatePreview({
  runId,
  onSelectionReady,
}: {
  runId: string;
  onSelectionReady?: (info: PreviewSelection) => void;
}) {
  const [open, setOpen] = useState(true);
  const [leads, setLeads] = useState<LeadRow[] | null>(null);
  const [contacts, setContacts] = useState<ContactRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState("");
  const [tagFilter, setTagFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [overrides, setOverrides] = useState<Record<string, boolean>>({});

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      const { data, error } = await supabase
        .from("apollo_leads")
        .select("id, apollo_person_id, first_name, last_name, title, company, country, has_email_flag, search_payload")
        .eq("run_id", runId)
        .order("created_at", { ascending: true });
      if (cancelled) return;
      if (error) {
        toast({ title: "Could not load preview", description: error.message, variant: "destructive" });
        setLeads([]);
        setContacts([]);
        setLoading(false);
        return;
      }
      const leadRows = (data as LeadRow[]) ?? [];
      setLeads(leadRows);

      const personIds = leadRows.map((l) => l.apollo_person_id).filter(Boolean);
      const linkedinUrls = leadRows.map((l) => l.search_payload?.linkedin_url).filter(Boolean) as string[];
      const firstNames = Array.from(new Set(leadRows.map((l) => l.first_name).filter(Boolean) as string[]));
      const companies = Array.from(new Set(leadRows.map((l) => l.company).filter(Boolean) as string[]));
      const orgIds = Array.from(new Set(leadRows.map((l) => l.search_payload?.organization?.id ?? l.search_payload?.organization_id).filter(Boolean) as string[]));

      const quote = (s: string) => `"${s.replace(/"/g, "")}"`;
      const orParts: string[] = [];
      if (personIds.length) orParts.push(`apollo_person_id.in.(${personIds.map(quote).join(",")})`);
      if (linkedinUrls.length) orParts.push(`linkedin_url.in.(${linkedinUrls.map(quote).join(",")})`);
      if (orgIds.length) orParts.push(`apollo_organization_id.in.(${orgIds.map(quote).join(",")})`);
      if (firstNames.length) orParts.push(`first_name.in.(${firstNames.map(quote).join(",")})`);
      if (companies.length) orParts.push(`company.in.(${companies.map(quote).join(",")})`);

      let contactRows: ContactRow[] = [];
      if (orParts.length > 0) {
        const { data: cdata, error: cErr } = await supabase
          .from("contacts")
          .select("id, email, first_name, last_name, name, company, role, linkedin_url, apollo_person_id, apollo_organization_id, is_globally_suppressed, hard_bounced, tags, last_contacted_at, active_campaign_id")
          .or(orParts.join(","))
          .limit(500);
        if (!cErr && cdata) contactRows = cdata as ContactRow[];
      }
      if (cancelled) return;
      setContacts(contactRows);
      setLoading(false);
    }
    load();
    return () => { cancelled = true; };
  }, [runId]);

  const enriched = useMemo(() => {
    return (leads ?? []).map((lead) => {
      const tags = fitTagsFor(lead);
      const dupe = matchLead(lead, contacts);
      const defaultSelected =
        lead.has_email_flag &&
        dupe.status === "new" &&
        !dupe.isSuppressed;
      const selected = overrides[lead.id] ?? defaultSelected;
      return { lead, tags, dupe, selected, defaultSelected };
    });
  }, [leads, contacts, overrides]);

  const counts = useMemo<PreviewSelection>(() => {
    const total = enriched.length;
    const newCount = enriched.filter((e) => e.dupe.status === "new").length;
    const existing = enriched.filter((e) => e.dupe.status === "existing");
    const possibleHeld = enriched.filter((e) => e.dupe.status === "possible").length;
    const existingSkipped = existing.filter((e) => e.dupe.hasKnownEmail).length;
    const suppressedCount = enriched.filter((e) => e.dupe.isSuppressed).length;
    const matched = enriched.filter((e) => e.tags.length > 0).length;
    const selectedIds = enriched.filter((e) => e.selected).map((e) => e.lead.apollo_person_id);
    const creditsToSpend = selectedIds.length;
    const hasEmailTotal = enriched.filter((e) => e.lead.has_email_flag).length;
    const creditsSaved = Math.max(0, hasEmailTotal - creditsToSpend);
    return { total, newCount, existingSkipped, possibleHeld, suppressedCount, matched, selectedIds, creditsToSpend, creditsSaved, ready: leads !== null && total > 0 };
  }, [enriched, leads]);

  useEffect(() => {
    if (leads !== null) onSelectionReady?.(counts);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [counts.total, counts.creditsToSpend, counts.newCount, counts.existingSkipped, counts.possibleHeld, leads]);

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    return enriched.filter(({ lead, tags, dupe }) => {
      if (tagFilter !== "all" && !tags.includes(tagFilter)) return false;
      switch (statusFilter) {
        case "new":
          if (dupe.status !== "new") return false;
          break;
        case "existing":
          if (dupe.status !== "existing") return false;
          break;
        case "possible":
          if (dupe.status !== "possible") return false;
          break;
        case "contacted":
          if (!dupe.contact?.last_contacted_at) return false;
          break;
        case "suppressed":
          if (!dupe.isSuppressed) return false;
          break;
        case "has_email":
          if (!dupe.hasKnownEmail) return false;
          break;
        case "needs_enrichment":
          if (dupe.hasKnownEmail || !lead.has_email_flag) return false;
          break;
      }
      if (!q) return true;
      return (
        (lead.title ?? "").toLowerCase().includes(q) ||
        (lead.company ?? "").toLowerCase().includes(q) ||
        (lead.first_name ?? "").toLowerCase().includes(q)
      );
    });
  }, [enriched, filter, tagFilter, statusFilter]);

  const availableTags = useMemo(() => {
    const set = new Set<string>();
    enriched.forEach((e) => e.tags.forEach((t) => set.add(t)));
    return Array.from(set).sort();
  }, [enriched]);

  function toggle(leadId: string, current: boolean) {
    setOverrides((prev) => ({ ...prev, [leadId]: !current }));
  }

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="rounded-md border">
      <CollapsibleTrigger asChild>
        <button type="button" className="flex w-full items-center justify-between px-3 py-2 text-left text-sm font-medium hover:bg-muted/40">
          <span>Preview candidates before enrichment ({counts.total})</span>
          <span className="text-xs text-muted-foreground">{open ? "Hide" : "Show"}</span>
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent className="space-y-3 border-t p-3">
        <div className="rounded-md border border-primary/30 bg-primary/5 p-2 text-xs">
          Review these candidates before spending Apollo enrichment credits.
        </div>
        {(counts.existingSkipped > 0 || counts.possibleHeld > 0) && (
          <div className="flex items-start gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 p-2 text-xs">
            <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0 text-amber-500" />
            <span>
              Some Apollo candidates already exist in Liftor. Existing contacts with known emails have been excluded from enrichment to avoid wasting Apollo credits.
            </span>
          </div>
        )}
        <div className="grid grid-cols-2 gap-2 text-xs md:grid-cols-4">
          <Stat label="Total found" value={counts.total} />
          <Stat label="New (selected)" value={counts.newCount} />
          <Stat label="Existing skipped" value={counts.existingSkipped} />
          <Stat label="Possible held" value={counts.possibleHeld} />
          <Stat label="Will enrich" value={counts.creditsToSpend} />
          <Stat label="Est. credits" value={counts.creditsToSpend} />
          <Stat label="Credits saved" value={counts.creditsSaved} />
          <Stat label="Fit matched" value={counts.matched} />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Filter by title / company / first name (e.g. DJ, curator, music)"
            className="h-8 max-w-sm text-xs"
          />
          <div className="flex flex-wrap gap-1">
            {["DJ", "curator", "music"].map((q) => (
              <Button key={q} type="button" size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={() => setFilter(q)}>
                title: {q}
              </Button>
            ))}
            <Button type="button" size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => { setFilter(""); setTagFilter("all"); setStatusFilter("all"); }}>
              Clear
            </Button>
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-8 w-[180px] text-xs"><SelectValue placeholder="CRM status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All CRM status</SelectItem>
              <SelectItem value="new">New only</SelectItem>
              <SelectItem value="existing">Existing</SelectItem>
              <SelectItem value="possible">Possible duplicate</SelectItem>
              <SelectItem value="contacted">Already contacted</SelectItem>
              <SelectItem value="suppressed">Suppressed</SelectItem>
              <SelectItem value="has_email">Has known email</SelectItem>
              <SelectItem value="needs_enrichment">Needs enrichment</SelectItem>
            </SelectContent>
          </Select>
          {availableTags.length > 0 && (
            <Select value={tagFilter} onValueChange={setTagFilter}>
              <SelectTrigger className="h-8 w-[160px] text-xs"><SelectValue placeholder="Fit tag" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All fit tags</SelectItem>
                {availableTags.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
        </div>
        {loading ? (
          <div className="flex items-center gap-2 text-xs text-muted-foreground"><Loader2 className="h-3 w-3 animate-spin" /> Loading candidates…</div>
        ) : filtered.length === 0 ? (
          <div className="text-xs text-muted-foreground">No candidates match these filters.</div>
        ) : (
          <div className="max-h-96 overflow-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Enrich</TableHead>
                  <TableHead className="text-xs">CRM</TableHead>
                  <TableHead className="text-xs">First</TableHead>
                  <TableHead className="text-xs">Last</TableHead>
                  <TableHead className="text-xs">Title</TableHead>
                  <TableHead className="text-xs">Company</TableHead>
                  <TableHead className="text-xs">Fit tags</TableHead>
                  <TableHead className="text-xs">Email known</TableHead>
                  <TableHead className="text-xs">Last contacted</TableHead>
                  <TableHead className="text-xs">Existing tags</TableHead>
                  <TableHead className="text-xs">Suppressed</TableHead>
                  <TableHead className="text-xs">Match reason</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(({ lead, tags, dupe, selected }) => {
                  const statusBadge =
                    dupe.status === "new" ? <Badge className="text-[10px]">New</Badge>
                    : dupe.status === "existing" ? <Badge variant="secondary" className="text-[10px]">Existing</Badge>
                    : <Badge variant="destructive" className="text-[10px]">Possible</Badge>;
                  const checkboxDisabled = !lead.has_email_flag || dupe.isSuppressed;
                  return (
                    <TableRow key={lead.id}>
                      <TableCell>
                        <Checkbox
                          checked={selected}
                          disabled={checkboxDisabled}
                          onCheckedChange={() => toggle(lead.id, selected)}
                          aria-label="Enrich this candidate"
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          {statusBadge}
                          {dupe.contact && (
                            <Link to={`/founder/crm/contacts/${dupe.contact.id}`} className="text-[10px] text-primary underline">
                              Open contact
                            </Link>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs">{lead.first_name ?? "—"}</TableCell>
                      <TableCell className="text-xs">{obfuscateLast(lead.last_name)}</TableCell>
                      <TableCell className="text-xs">{lead.title ?? "—"}</TableCell>
                      <TableCell className="text-xs">{lead.company ?? "—"}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {tags.length > 0
                            ? tags.map((t) => <Badge key={t} variant="secondary" className="text-[10px]">{t}</Badge>)
                            : <span className="text-xs text-muted-foreground">none</span>}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={dupe.hasKnownEmail ? "default" : "outline"} className="text-[10px]">
                          {dupe.hasKnownEmail ? "yes" : "no"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-[10px] text-muted-foreground">
                        {dupe.contact?.last_contacted_at ? new Date(dupe.contact.last_contacted_at).toLocaleDateString() : "—"}
                      </TableCell>
                      <TableCell className="text-[10px]">
                        {dupe.contact?.tags && dupe.contact.tags.length > 0
                          ? dupe.contact.tags.slice(0, 3).join(", ")
                          : <span className="text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell>
                        {dupe.isSuppressed
                          ? <Badge variant="destructive" className="text-[10px]">yes</Badge>
                          : <span className="text-xs text-muted-foreground">no</span>}
                      </TableCell>
                      <TableCell className="text-[10px] text-muted-foreground max-w-[180px]">{dupe.reason}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
}

const NEONCANDY_MONTH1_CRITERIA = {
  person_titles: [
    "DJ",
    "music curator",
    "playlist curator",
    "music editor",
    "music programmer",
    "music blogger",
    "music supervisor",
    "A&R",
    "music marketing",
    "label manager",
  ],
  contact_email_status: ["verified"],
};

type Connection = {
  id: string;
  business_name: string;
  api_key_last4: string;
  search_api_status: string;
  search_api_error: string;
  search_api_verified_at: string | null;
  enrichment_api_status: string;
  enrichment_api_error: string;
  enrichment_api_verified_at: string | null;
  is_active: boolean;
};

type Segment = {
  id: string;
  business_name: string;
  segment_name: string;
  mode: "saved_list" | "people_search";
  saved_list_id: string | null;
  search_criteria: Record<string, unknown>;
  max_contacts_per_run: number;
  hold_for_approval: boolean;
  is_active: boolean;
};

type Run = {
  id: string;
  segment_id: string;
  business_name: string;
  status: string;
  people_found: number;
  people_with_email_flag: number;
  enrichment_attempted: number;
  emails_returned: number;
  contacts_imported: number;
  contacts_new: number;
  contacts_updated: number;
  contacts_skipped_no_email: number;
  contacts_duplicate: number;
  contacts_suppressed: number;
  qualified_count: number;
  maybe_count: number;
  not_qualified_count: number;
  needs_review_count: number;
  errors: unknown;
  started_at: string;
  completed_at: string | null;
};

type RunDiagnostics = {
  raw_people_found?: number;
  has_email_true?: number;
  has_email_false?: number;
  has_email_missing?: number;
  email_status_verified?: number;
  email_status_unavailable?: number;
  sample_titles?: Array<{ title: string | null; company: string | null }>;
  detected_tags?: string[];
  fit_matched?: number;
  fit_ratio?: number;
  segment_fit?: "good" | "weak" | "poor";
  enrichment_skip_reason?: string | null;
  search_filter_contact_email_status?: string[] | null;
  search_mode?: string;
  saved_list_id?: string | null;
};

function extractDiagnostics(errors: unknown): RunDiagnostics | null {
  if (!Array.isArray(errors)) return null;
  for (const entry of errors) {
    if (typeof entry !== "string") continue;
    const trimmed = entry.trim();
    if (!trimmed.startsWith("{")) continue;
    try {
      return JSON.parse(trimmed) as RunDiagnostics;
    } catch {
      // ignore
    }
  }
  return null;
}

function fitBadgeVariant(fit?: string): "default" | "secondary" | "destructive" | "outline" {
  if (fit === "good") return "default";
  if (fit === "weak") return "secondary";
  if (fit === "poor") return "destructive";
  return "outline";
}

type DiagnosticCategory =
  | "ok"
  | "key_invalid"
  | "endpoint_permission_missing"
  | "workspace_plan_lacks_api_access"
  | "endpoint_path_method_error"
  | "rate_limit"
  | "error";

type DiagnosticProbe = {
  label: string;
  status: number | null;
  error_code: string | null;
  response_preview: string;
  request: {
    base_url: string;
    endpoint_path: string;
    method: string;
    x_api_key_header_present: boolean;
    key_last4: string;
  };
  raw_category: DiagnosticCategory;
  capability_ok: boolean;
  message: string;
};

type DiagnosticResult = {
  ok: boolean;
  summary?: {
    category: DiagnosticCategory;
    message: string;
  };
  key_validity?: DiagnosticProbe;
  search?: DiagnosticProbe;
  enrichment?: DiagnosticProbe;
};

type SearchRunResponse = {
  people_found?: number;
  people_with_email_flag?: number;
};

type EnrichmentRunResponse = {
  imported?: number;
  emails_returned?: number;
  skipped_no_email?: number;
  duplicate?: number;
  suppressed?: number;
};

const statusLabels: Record<string, string> = {
  ok: "ok",
  unverified: "unverified",
  key_invalid: "key invalid",
  endpoint_permission_missing: "permission missing",
  workspace_plan_lacks_api_access: "plan lacks API access",
  endpoint_path_method_error: "path/method error",
  rate_limit: "rate limit",
  error: "error",
};

function StatusBadge({ status }: { status: string }) {
  const variant = status === "ok" ? "default" : status === "unverified" ? "secondary" : "destructive";
  return <Badge variant={variant}>{statusLabels[status] ?? status}</Badge>;
}

function formatDiagnosticToast(data: DiagnosticResult) {
  const parts = [data.summary?.message, data.key_validity?.message, data.search?.message, data.enrichment?.message].filter(Boolean);
  return parts.join(" • ").slice(0, 320);
}

function formatCapabilityError(connection: Connection) {
  if (connection.search_api_status === "ok" && connection.enrichment_api_status === "ok") return "";
  if (connection.search_api_status !== "ok" && connection.enrichment_api_status !== "ok") {
    return "Sync is blocked until both Search and Enrichment diagnostics pass.";
  }
  if (connection.search_api_status !== "ok") return "Sync is blocked until Search API diagnostics pass.";
  return "Sync is blocked until Enrichment API diagnostics pass.";
}

function ProbeCard({ probe }: { probe: DiagnosticProbe }) {
  const request = probe.request ?? ({} as NonNullable<DiagnosticProbe["request"]>);
  return (
    <div className="rounded-md border p-3 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div className="font-medium text-sm">{probe.label}</div>
        <StatusBadge status={probe.raw_category} />
      </div>
      <p className="text-sm text-muted-foreground">{probe.message}</p>
      <div className="grid gap-2 text-xs sm:grid-cols-2">
        <div>
          <div className="text-muted-foreground">Status</div>
          <div>{probe.status ?? "no response"}</div>
        </div>
        <div>
          <div className="text-muted-foreground">error_code</div>
          <div>{probe.error_code ?? "—"}</div>
        </div>
        <div>
          <div className="text-muted-foreground">Base URL</div>
          <div className="break-all">{request.base_url ?? "—"}</div>
        </div>
        <div>
          <div className="text-muted-foreground">Endpoint</div>
          <div className="break-all">{request.endpoint_path ?? "—"}</div>
        </div>
        <div>
          <div className="text-muted-foreground">Method</div>
          <div>{request.method ?? "—"}</div>
        </div>
        <div>
          <div className="text-muted-foreground">x-api-key header</div>
          <div>{request.x_api_key_header_present ? "yes" : "no"}</div>
        </div>
        <div>
          <div className="text-muted-foreground">Key last4</div>
          <div>{request.key_last4 || "—"}</div>
        </div>
      </div>
      <details className="text-xs">
        <summary className="cursor-pointer text-muted-foreground">Safe raw response</summary>
        <pre className="mt-2 overflow-auto rounded-md border bg-muted/40 p-2 whitespace-pre-wrap break-words">{probe.response_preview || "No response body"}</pre>
      </details>
    </div>
  );
}

export default function ApolloIntegration() {
  const [connections, setConnections] = useState<Connection[]>([]);
  const [segments, setSegments] = useState<Segment[]>([]);
  const [runs, setRuns] = useState<Run[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [diagnosticsByBusiness, setDiagnosticsByBusiness] = useState<Record<string, DiagnosticResult>>({});
  const [selectedBusiness, setSelectedBusiness] = useState<string>("Neon Candy");

  const [businessName, setBusinessName] = useState("Neon Candy");
  const [apiKeyInput, setApiKeyInput] = useState("");

  const [segBusiness, setSegBusiness] = useState("Neon Candy");
  const [segName, setSegName] = useState("Month 1");
  const [segListId, setSegListId] = useState("");

  const loadAll = useCallback(async () => {
    setLoading(true);
    const [c, s, r] = await Promise.all([
      supabase.from("apollo_connections").select("*").order("created_at"),
      supabase.from("apollo_sync_segments").select("*").order("created_at"),
      supabase.from("apollo_sync_runs").select("*").order("started_at", { ascending: false }).limit(20),
    ]);
    const nextConnections = (c.data as Connection[]) ?? [];
    setConnections(nextConnections);
    setSegments((s.data as Segment[]) ?? []);
    setRuns((r.data as Run[]) ?? []);
    setSelectedBusiness((current) => current || nextConnections[0]?.business_name || businessName);
    setLoading(false);
  }, [businessName]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const connectionByBusiness = useMemo(
    () => Object.fromEntries(connections.map((connection) => [connection.business_name, connection])),
    [connections],
  );

  async function runDiagnostic(payload: { business_name: string; api_key?: string; save: boolean }) {
    const { data, error } = await supabase.functions.invoke("apollo-test-connection", { body: payload });
    if (error) throw error;
    return (data as DiagnosticResult) ?? { ok: false };
  }

  async function saveAndTest() {
    if (!businessName.trim() || !apiKeyInput.trim()) {
      toast({ title: "Missing fields", description: "Business name + Apollo master API key required.", variant: "destructive" });
      return;
    }

    setBusy("save");
    try {
      const data = await runDiagnostic({ business_name: businessName.trim(), api_key: apiKeyInput.trim(), save: true });
      setDiagnosticsByBusiness((current) => ({ ...current, [businessName.trim()]: data }));
      setSelectedBusiness(businessName.trim());
      toast({
        title: data.ok ? "Connection saved" : "Saved with Apollo diagnostic issues",
        description: data.ok ? "Key validity, Search API, and Enrichment API all passed." : formatDiagnosticToast(data),
        variant: data.ok ? "default" : "destructive",
      });
      setApiKeyInput("");
      await loadAll();
    } catch (error) {
      toast({ title: "Error", description: error instanceof Error ? error.message : String(error), variant: "destructive" });
    } finally {
      setBusy(null);
    }
  }

  async function retestConnection(business: string) {
    setBusy(`test-${business}`);
    try {
      const data = await runDiagnostic({ business_name: business, save: false });
      setDiagnosticsByBusiness((current) => ({ ...current, [business]: data }));
      setSelectedBusiness(business);
      toast({
        title: data.ok ? "All capabilities verified" : "Apollo diagnostic completed",
        description: formatDiagnosticToast(data),
        variant: data.ok ? "default" : "destructive",
      });
      await loadAll();
    } catch (error) {
      toast({ title: "Test failed", description: error instanceof Error ? error.message : String(error), variant: "destructive" });
    } finally {
      setBusy(null);
    }
  }

  async function removeConnection(id: string) {
    if (!confirm("Remove this Apollo connection? The encrypted key will be deleted.")) return;
    const { error } = await supabase.from("apollo_connections").delete().eq("id", id);
    if (error) {
      toast({ title: "Delete failed", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Connection removed" });
    loadAll();
  }

  async function createSegment() {
    if (!segBusiness.trim() || !segName.trim()) {
      toast({ title: "Missing fields", description: "Business + segment name required.", variant: "destructive" });
      return;
    }
    const { error } = await supabase.from("apollo_sync_segments").insert({
      business_name: segBusiness.trim(),
      segment_name: segName.trim(),
      mode: "saved_list",
      saved_list_id: segListId.trim() || null,
      max_contacts_per_run: 25,
      hold_for_approval: true,
      auto_qualify: true,
      default_relevance_category: "music_creator_outreach",
    });
    if (error) {
      toast({ title: "Create failed", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Segment created" });
    setSegListId("");
    loadAll();
  }

  async function runSearch(segmentId: string) {
    setBusy(`run-${segmentId}`);
    const { data, error } = await supabase.functions.invoke("apollo-sync-search", { body: { segment_id: segmentId } });
    setBusy(null);
    if (error) {
      toast({ title: "Search failed", description: error.message, variant: "destructive" });
      return;
    }
    const result = (data as SearchRunResponse) ?? {};
    toast({ title: "Apollo search complete", description: `Found ${result.people_found ?? 0} • with email: ${result.people_with_email_flag ?? 0}. Approve enrichment in Sync Runs tab.` });
    loadAll();
  }

  async function approveEnrichment(runId: string, selectedIds: string[]) {
    if (!selectedIds.length) {
      toast({ title: "Nothing to enrich", description: "No new candidates are selected.", variant: "destructive" });
      return;
    }
    if (!confirm(`Approve enrichment for ${selectedIds.length} new candidate(s)? Existing CRM contacts and possible duplicates have been excluded.`)) return;
    setBusy(`enrich-${runId}`);
    const { data, error } = await supabase.functions.invoke("apollo-sync-enrich", { body: { run_id: runId, selected_apollo_person_ids: selectedIds } });
    setBusy(null);
    if (error) {
      const message = error.message || "Enrichment failed";
      const isPoorFit = message.includes("segment_fit_poor") || message.toLowerCase().includes("does not match");
      if (isPoorFit && confirm("Apollo blocked enrichment because the search results do not match the segment taxonomy. Force enrichment anyway and spend credits?")) {
        setBusy(`enrich-${runId}`);
        const retry = await supabase.functions.invoke("apollo-sync-enrich", { body: { run_id: runId, force: true, selected_apollo_person_ids: selectedIds } });
        setBusy(null);
        if (retry.error) {
          toast({ title: "Enrichment failed", description: retry.error.message, variant: "destructive" });
          return;
        }
        const r = (retry.data as EnrichmentRunResponse) ?? {};
        toast({ title: "Enrichment complete (forced)", description: `Imported ${r.imported ?? 0} • emails ${r.emails_returned ?? 0}` });
        loadAll();
        return;
      }
      toast({ title: "Enrichment failed", description: message, variant: "destructive" });
      return;
    }
    const result = (data as EnrichmentRunResponse) ?? {};
    toast({ title: "Enrichment complete", description: `Imported ${result.imported ?? 0} • emails returned ${result.emails_returned ?? 0} • skipped no-email ${result.skipped_no_email ?? 0} • duplicates ${result.duplicate ?? 0} • suppressed ${result.suppressed ?? 0}` });
    loadAll();
  }

  async function cancelRun(runId: string) {
    if (!confirm("Discard this sync run? Leads will remain in the table for review but no enrichment credits will be spent.")) return;
    const { error } = await supabase
      .from("apollo_sync_runs")
      .update({ status: "cancelled", completed_at: new Date().toISOString() })
      .eq("id", runId);
    if (error) {
      toast({ title: "Cancel failed", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Sync run cancelled" });
    loadAll();
  }

  async function saveSegmentEdits(segment: Segment, updates: Record<string, unknown>) {
    const { error } = await supabase
      .from("apollo_sync_segments")
      .update(updates as never)
      .eq("id", segment.id);
    if (error) {
      toast({ title: "Update failed", description: error.message, variant: "destructive" });
      return false;
    }
    toast({ title: "Segment updated" });
    loadAll();
    return true;
  }

  const selectedDiagnostics = diagnosticsByBusiness[selectedBusiness];

  return (
    <FounderLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-semibold">Apollo Integration</h1>
          <p className="mt-1 text-muted-foreground">
            Per-business encrypted Apollo master API keys. Search → enrichment → central contact pool.
            Hold-for-approval is on by default.
          </p>
        </div>

        <Tabs defaultValue="connections">
          <TabsList>
            <TabsTrigger value="connections">Connections</TabsTrigger>
            <TabsTrigger value="segments">Sync Segments</TabsTrigger>
            <TabsTrigger value="runs">Sync Runs</TabsTrigger>
          </TabsList>

          <TabsContent value="connections" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><KeyRound className="h-4 w-4" /> Add / Replace Apollo Master Key</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid gap-3 md:grid-cols-2">
                  <div>
                    <Label>Business</Label>
                    <Input value={businessName} onChange={(e) => setBusinessName(e.target.value)} />
                  </div>
                  <div>
                    <Label>Apollo master API key</Label>
                    <Input type="password" autoComplete="new-password" value={apiKeyInput} onChange={(e) => setApiKeyInput(e.target.value)} placeholder="•••••••••••••••" />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Key is encrypted at rest. Only the last 4 characters are ever displayed, and the diagnostic output never logs the raw key.
                </p>
                <Button onClick={saveAndTest} disabled={busy === "save"}>
                  {busy === "save" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Save & test connection
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Active connections</CardTitle></CardHeader>
              <CardContent>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : connections.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No Apollo connections yet.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Business</TableHead>
                        <TableHead>Key</TableHead>
                        <TableHead>Search API</TableHead>
                        <TableHead>Enrichment API</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {connections.map((connection) => {
                        const syncBlockedReason = formatCapabilityError(connection);
                        return (
                          <TableRow key={connection.id}>
                            <TableCell className="font-medium">{connection.business_name}</TableCell>
                            <TableCell><code className="text-xs">••••••••{connection.api_key_last4}</code></TableCell>
                            <TableCell>
                              <StatusBadge status={connection.search_api_status} />
                              {connection.search_api_error && <p className="mt-1 max-w-[320px] text-xs text-destructive">{connection.search_api_error}</p>}
                            </TableCell>
                            <TableCell>
                              <StatusBadge status={connection.enrichment_api_status} />
                              {connection.enrichment_api_error && <p className="mt-1 max-w-[320px] text-xs text-destructive">{connection.enrichment_api_error}</p>}
                              {syncBlockedReason && <p className="mt-2 max-w-[320px] text-xs text-muted-foreground">{syncBlockedReason}</p>}
                            </TableCell>
                            <TableCell className="space-x-2">
                              <Button size="sm" variant="outline" onClick={() => retestConnection(connection.business_name)} disabled={busy === `test-${connection.business_name}`}>
                                <RefreshCw className="mr-1 h-3 w-3" /> Re-test
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => removeConnection(connection.id)}>
                                <Trash2 className="mr-1 h-3 w-3" /> Remove
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>

            {selectedDiagnostics && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    {selectedDiagnostics.ok ? <CheckCircle2 className="h-4 w-4" /> : <ShieldAlert className="h-4 w-4" />}
                    Latest Apollo diagnostic{selectedBusiness ? ` — ${selectedBusiness}` : ""}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-wrap items-start justify-between gap-3 rounded-md border p-3">
                    <div>
                      <div className="text-sm font-medium">Summary</div>
                      <p className="text-sm text-muted-foreground">{selectedDiagnostics.summary?.message ?? "Diagnostic finished."}</p>
                    </div>
                    {selectedDiagnostics.summary && <StatusBadge status={selectedDiagnostics.summary.category} />}
                  </div>
                  <div className="grid gap-3 lg:grid-cols-3">
                    {selectedDiagnostics.key_validity && <ProbeCard probe={selectedDiagnostics.key_validity} />}
                    {selectedDiagnostics.search && <ProbeCard probe={selectedDiagnostics.search} />}
                    {selectedDiagnostics.enrichment && <ProbeCard probe={selectedDiagnostics.enrichment} />}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="segments" className="space-y-4">
            <Card>
              <CardHeader><CardTitle>Create sync segment</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div className="grid gap-3 md:grid-cols-3">
                  <div>
                    <Label>Business</Label>
                    <Input value={segBusiness} onChange={(e) => setSegBusiness(e.target.value)} />
                  </div>
                  <div>
                    <Label>Segment name</Label>
                    <Input value={segName} onChange={(e) => setSegName(e.target.value)} />
                  </div>
                  <div>
                    <Label>Apollo saved-list ID</Label>
                    <Input value={segListId} onChange={(e) => setSegListId(e.target.value)} placeholder="label_xxx" />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Defaults: max 25 contacts per run, hold-for-approval ON, mode = saved_list.
                </p>
                <Button onClick={createSegment}>Create segment</Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Active segments</CardTitle></CardHeader>
              <CardContent>
                {segments.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No segments yet.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Business</TableHead>
                        <TableHead>Segment</TableHead>
                        <TableHead>Mode</TableHead>
                        <TableHead>List ID</TableHead>
                        <TableHead>Cap</TableHead>
                        <TableHead>Hold</TableHead>
                        <TableHead>Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {segments.map((segment) => {
                        const connection = connectionByBusiness[segment.business_name];
                        const apiOk = !!connection && connection.search_api_status === "ok" && connection.enrichment_api_status === "ok";
                        const missingSavedList = segment.mode === "saved_list" && !segment.saved_list_id;
                        const missingCriteria = segment.mode === "people_search" && Object.keys(segment.search_criteria ?? {}).length === 0;
                        const sourceMissing = missingSavedList || missingCriteria;
                        const canRun = apiOk && !sourceMissing;
                        const blockReason = !connection
                          ? "Add and verify an Apollo connection before syncing."
                          : !apiOk
                          ? formatCapabilityError(connection)
                          : missingSavedList
                          ? "Add a saved-list ID or switch to criteria search before running."
                          : missingCriteria
                          ? "Add search criteria or switch to a saved list before running."
                          : "";
                        const isNeonCandyMonth1 =
                          segment.business_name.toLowerCase().includes("neon candy") &&
                          segment.segment_name.toLowerCase().includes("month 1");

                        return (
                          <TableRow key={segment.id}>
                            <TableCell>{segment.business_name}</TableCell>
                            <TableCell className="font-medium">{segment.segment_name}</TableCell>
                            <TableCell><Badge variant="outline">{segment.mode}</Badge></TableCell>
                            <TableCell>
                              {segment.mode === "saved_list" ? (
                                <code className={`text-xs ${missingSavedList ? "text-destructive" : ""}`}>
                                  {segment.saved_list_id ?? "⚠ none — segment will return generic results"}
                                </code>
                              ) : (
                                <code className="text-xs break-all">
                                  {Object.keys(segment.search_criteria ?? {}).length === 0
                                    ? "⚠ empty criteria"
                                    : `${Object.keys(segment.search_criteria).length} filter(s)`}
                                </code>
                              )}
                            </TableCell>
                            <TableCell>{segment.max_contacts_per_run}</TableCell>
                            <TableCell>{segment.hold_for_approval ? "✓" : "—"}</TableCell>
                            <TableCell>
                              <div className="space-y-2 min-w-[260px]">
                                <div className="flex flex-wrap gap-2">
                                  <Button size="sm" onClick={() => runSearch(segment.id)} disabled={!canRun || busy === `run-${segment.id}`}>
                                    {busy === `run-${segment.id}` ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <Play className="mr-1 h-3 w-3" />}
                                    Run search
                                  </Button>
                                  <EditSegmentDialog segment={segment} onSave={(u) => saveSegmentEdits(segment, u)} />
                                </div>
                                {isNeonCandyMonth1 && (
                                  <Button
                                    size="sm"
                                    variant="secondary"
                                    className="w-full"
                                    disabled={busy === `preset-${segment.id}`}
                                    onClick={async () => {
                                      if (!confirm("Switch this segment to criteria search and apply the NeonCandy Month 1 preset (DJ, music curator, playlist curator, etc. + verified emails)?")) return;
                                      setBusy(`preset-${segment.id}`);
                                      await saveSegmentEdits(segment, {
                                        mode: "people_search",
                                        saved_list_id: null,
                                        search_criteria: NEONCANDY_MONTH1_CRITERIA,
                                      });
                                      setBusy(null);
                                    }}
                                  >
                                    {busy === `preset-${segment.id}` ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : null}
                                    Use NeonCandy Month 1 preset
                                  </Button>
                                )}
                                {!canRun && blockReason && (
                                  <div className="flex items-start gap-2 text-xs text-destructive">
                                    <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                                    <span>{blockReason}</span>
                                  </div>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="runs" className="space-y-4">
            <RunsTab
              runs={runs}
              connections={connections}
              busy={busy}
              setBusy={setBusy}
              onReload={loadAll}
              onCancel={cancelRun}
              onApprove={approveEnrichment}
            />
          </TabsContent>
        </Tabs>
      </div>
    </FounderLayout>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-md border p-2">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-lg font-semibold">{value}</div>
    </div>
  );
}

function CompletedRunSummary({ run }: { run: Run }) {
  // Backfill display when older rows have 0 in the new columns
  const newCount = run.contacts_new || Math.max(run.contacts_imported - run.contacts_duplicate, 0);
  const updatedCount = run.contacts_updated || run.contacts_duplicate;
  const totalSaved = run.contacts_imported;
  const importsHref = `/founder/outreach/imports?run_id=${run.id}`;
  const stageHref = `/founder/outreach/queue?run_id=${run.id}&stage=ready_to_stage`;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3 text-sm md:grid-cols-4">
        <Stat label="Found" value={run.people_found} />
        <Stat label="Has email flag" value={run.people_with_email_flag} />
        <Stat label="Enriched" value={run.enrichment_attempted} />
        <Stat label="Emails returned" value={run.emails_returned} />
        <Stat label="New contacts created" value={newCount} />
        <Stat label="Existing contacts updated" value={updatedCount} />
        <Stat label="Duplicates skipped (no-email)" value={run.contacts_skipped_no_email} />
        <Stat label="Total saved to CRM" value={totalSaved} />
        <Stat label="Suppressed" value={run.contacts_suppressed} />
        <Stat label="Qualified" value={run.qualified_count} />
        <Stat label="Maybe" value={run.maybe_count} />
        <Stat label="Not qualified" value={run.not_qualified_count} />
      </div>
      <div className="rounded-md border border-emerald-500/30 bg-emerald-500/5 p-3 text-xs text-muted-foreground">
        <strong className="text-foreground">What “Imported” means:</strong>{" "}
        {totalSaved} contact(s) were saved to the central CRM in this run — {newCount} brand new and {updatedCount} matched an existing CRM contact (by email) and were updated in place.
      </div>
      <div className="rounded-md border border-blue-500/30 bg-blue-500/5 p-3 text-xs text-muted-foreground">
        <strong className="text-foreground">Hold-for-approval is on.</strong>{" "}
        The {run.qualified_count} qualified contact(s) are <em>not</em> in the email queue. They sit in <em>Ready to stage</em> and will only be added to a campaign queue after you stage them.
      </div>
      <div className="flex flex-wrap gap-2">
        <Button asChild size="sm" variant="outline">
          <Link to={importsHref}>View imported contacts ({totalSaved})</Link>
        </Button>
        <Button asChild size="sm" variant="outline">
          <Link to={stageHref}>View Ready to stage ({run.qualified_count})</Link>
        </Button>
      </div>
    </div>
  );
}

type RunGroups = {
  primary: Run | null;          // the single run worth showing expanded
  superseded: Run[];            // older awaiting runs (newer completed exists)
  staleAwaiting: Run[];         // older awaiting runs (multiple awaiting, not newest)
  completed: Run[];             // completed runs other than the primary
  poorFit: Run[];
  cancelled: Run[];
  failed: Run[];
  newestCompletedBySegment: Map<string, Run>;
};

function classifyRuns(runs: Run[]): RunGroups {
  const newestCompletedBySegment = new Map<string, Run>();
  for (const r of runs) {
    if (r.status === "completed") {
      const existing = newestCompletedBySegment.get(r.segment_id);
      if (!existing || new Date(r.started_at) > new Date(existing.started_at)) {
        newestCompletedBySegment.set(r.segment_id, r);
      }
    }
  }
  const newestAwaitingBySegment = new Map<string, string>();
  for (const r of runs) {
    if (r.status === "awaiting_enrichment_approval" && !newestAwaitingBySegment.has(r.segment_id)) {
      newestAwaitingBySegment.set(r.segment_id, r.id);
    }
  }

  const completed: Run[] = [];
  const poorFit: Run[] = [];
  const cancelled: Run[] = [];
  const failed: Run[] = [];
  const superseded: Run[] = [];
  const staleAwaiting: Run[] = [];
  const validAwaiting: Run[] = [];

  for (const r of runs) {
    const diag = extractDiagnostics(r.errors);
    const fit = diag?.segment_fit;
    if (r.status === "cancelled") {
      cancelled.push(r);
      continue;
    }
    if (r.status === "failed" || r.status === "search_failed" || r.status === "enrichment_failed") {
      failed.push(r);
      continue;
    }
    if (r.status === "awaiting_enrichment_approval") {
      const newerCompleted = newestCompletedBySegment.get(r.segment_id);
      if (newerCompleted && new Date(newerCompleted.started_at) > new Date(r.started_at)) {
        superseded.push(r);
        continue;
      }
      if (fit === "poor") {
        poorFit.push(r);
        continue;
      }
      if (newestAwaitingBySegment.get(r.segment_id) !== r.id) {
        staleAwaiting.push(r);
        continue;
      }
      validAwaiting.push(r);
      continue;
    }
    if (r.status === "completed") {
      completed.push(r);
    }
  }

  // Pick primary: latest valid awaiting, else latest completed, else latest failed
  let primary: Run | null = null;
  if (validAwaiting.length > 0) primary = validAwaiting[0];
  else if (completed.length > 0) primary = completed[0];
  else if (failed.length > 0) primary = failed[0];

  const completedOthers = completed.filter((r) => r.id !== primary?.id);

  return {
    primary,
    superseded,
    staleAwaiting,
    completed: completedOthers,
    poorFit,
    cancelled,
    failed: failed.filter((r) => r.id !== primary?.id),
    newestCompletedBySegment,
  };
}

function CurrentActionHero({
  groups,
  connections,
  onCleanup,
  cleanupBusy,
  cleanupCount,
}: {
  groups: RunGroups;
  connections: Connection[];
  onCleanup: () => void;
  cleanupBusy: boolean;
  cleanupCount: number;
}) {
  const connBlocked = connections.length === 0
    || connections.some((c) => c.search_api_status !== "ok" || c.enrichment_api_status !== "ok");

  const primary = groups.primary;
  const diag = primary ? extractDiagnostics(primary.errors) : null;
  const fit = diag?.segment_fit;

  type Action = {
    title: string;
    description: string;
    tone: "neutral" | "info" | "good" | "warn" | "bad";
    buttons: Array<{ label: string; href?: string; onClick?: () => void; variant?: "default" | "outline" | "secondary" | "destructive" }>;
  };

  let action: Action;
  if (connBlocked) {
    action = {
      title: "Connection / API issue",
      description: "Apollo connection diagnostics are not green. Resolve before running new searches.",
      tone: "bad",
      buttons: [{ label: "Open Connections", href: "#connections", variant: "outline" }],
    };
  } else if (!primary) {
    action = {
      title: "No action needed",
      description: "There are no active Apollo runs. Run a new search from the Sync Segments tab.",
      tone: "neutral",
      buttons: [{ label: "Go to Sync Segments", onClick: () => (document.querySelector('[data-state][value="segments"]') as HTMLElement | null)?.click(), variant: "outline" }],
    };
  } else if (primary.status === "awaiting_enrichment_approval" && fit === "poor") {
    action = {
      title: "Fix poor-fit segment",
      description: "The latest run does not match the segment taxonomy. Edit the segment and re-run before spending credits.",
      tone: "bad",
      buttons: [{ label: "Open segments", onClick: () => (document.querySelector('[data-state][value="segments"]') as HTMLElement | null)?.click(), variant: "outline" }],
    };
  } else if (primary.status === "awaiting_enrichment_approval") {
    action = {
      title: "Review candidates before enrichment",
      description: `Latest run for ${primary.business_name} is awaiting your approval. Review the candidate preview, then approve enrichment for the contacts that match.`,
      tone: "info",
      buttons: [],
    };
  } else if (primary.status === "completed") {
    const stageHref = `/founder/outreach/queue?run_id=${primary.id}&stage=ready_to_stage`;
    const importsHref = `/founder/outreach/imports?run_id=${primary.id}`;
    action = {
      title: primary.qualified_count > 0 ? "View Ready to stage" : "View imported contacts",
      description: `Latest run completed: ${primary.contacts_imported} saved to CRM, ${primary.qualified_count} qualified and held for approval.`,
      tone: "good",
      buttons: [
        { label: `View Ready to stage (${primary.qualified_count})`, href: stageHref },
        { label: `View imported contacts (${primary.contacts_imported})`, href: importsHref, variant: "outline" },
      ],
    };
  } else {
    action = {
      title: "Run failed — review and retry",
      description: "The latest run did not complete. Check details below or run a new search.",
      tone: "bad",
      buttons: [],
    };
  }

  const toneCls = {
    neutral: "border-border bg-muted/20",
    info: "border-blue-500/40 bg-blue-500/10",
    good: "border-emerald-500/40 bg-emerald-500/10",
    warn: "border-amber-500/40 bg-amber-500/10",
    bad: "border-destructive/40 bg-destructive/10",
  }[action.tone];

  return (
    <Card className={`border ${toneCls}`}>
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Current Apollo action</p>
            <CardTitle className="mt-1 text-xl">{action.title}</CardTitle>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{action.description}</p>
          </div>
          <Button size="sm" variant="outline" onClick={onCleanup} disabled={cleanupBusy || cleanupCount === 0}>
            {cleanupBusy ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <Wand2 className="mr-1 h-3 w-3" />}
            Clean up this view{cleanupCount > 0 ? ` (${cleanupCount})` : ""}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-2 pt-0">
        {action.buttons.map((b, i) =>
          b.href ? (
            b.href.startsWith("#") ? (
              <Button
                key={i}
                size="sm"
                variant={b.variant ?? "default"}
                onClick={() => {
                  const tab = b.href!.replace("#", "");
                  (document.querySelector(`[data-state][value="${tab}"]`) as HTMLElement | null)?.click();
                }}
              >
                {b.label}
              </Button>
            ) : (
              <Button key={i} asChild size="sm" variant={b.variant ?? "default"}>
                <Link to={b.href}>{b.label}</Link>
              </Button>
            )
          ) : (
            <Button key={i} size="sm" variant={b.variant ?? "default"} onClick={b.onClick}>
              {b.label}
            </Button>
          ),
        )}
      </CardContent>
    </Card>
  );
}

function RunHistoryRow({
  run,
  badge,
  badgeVariant = "secondary",
  onCancel,
  onApprove,
  busy,
  reopenable = false,
}: {
  run: Run;
  badge: string;
  badgeVariant?: "default" | "secondary" | "outline" | "destructive";
  onCancel: (id: string) => void;
  onApprove: (id: string, ids: string[]) => void;
  busy: string | null;
  reopenable?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const diag = extractDiagnostics(run.errors);
  const fit = diag?.segment_fit;
  const subtitle =
    run.status === "completed"
      ? `${run.contacts_imported} saved • ${run.qualified_count} qualified`
      : run.status === "cancelled"
      ? "Cancelled"
      : run.status === "awaiting_enrichment_approval"
      ? `Found ${run.people_found}, awaiting approval`
      : `${run.people_found} found`;

  return (
    <div className="rounded-md border bg-background/40">
      <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-xs">
        <div className="flex items-center gap-2">
          <Badge variant={badgeVariant}>{badge}</Badge>
          <span className="font-medium">{run.business_name}</span>
          <span className="text-muted-foreground">
            {new Date(run.started_at).toLocaleString()} • {subtitle}
          </span>
          {fit && fit !== "good" && <Badge variant={fitBadgeVariant(fit)}>fit: {fit}</Badge>}
        </div>
        <Button size="sm" variant="ghost" onClick={() => setOpen((v) => !v)}>
          {open ? "Hide details" : "View details"}
        </Button>
      </div>
      {open && (
        <div className="border-t p-3">
          <RunCard
            run={run}
            diag={diag}
            fit={fit}
            showFitWarning={false}
            busy={busy}
            onCancel={() => onCancel(run.id)}
            onApprove={(ids) => onApprove(run.id, ids)}
            disableApprove={!reopenable && run.status === "awaiting_enrichment_approval"}
            superseded={run.status === "awaiting_enrichment_approval" && !reopenable}
          >
            {run.status !== "awaiting_enrichment_approval" && <CompletedRunSummary run={run} />}
            <RunDeveloperDiagnostics run={run} diag={diag} />
          </RunCard>
        </div>
      )}
    </div>
  );
}

function RunDeveloperDiagnostics({ run, diag }: { run: Run; diag: RunDiagnostics | null }) {
  return (
    <details className="rounded-md border bg-muted/20 px-3 py-2 text-xs">
      <summary className="cursor-pointer text-muted-foreground">Developer diagnostics</summary>
      <div className="mt-2 space-y-2">
        {diag ? (
          <div className="space-y-2">
            <div className="grid gap-2 sm:grid-cols-2">
              <div>
                <div className="text-muted-foreground">Fit ratio</div>
                <div>{diag.fit_matched ?? 0} / {diag.raw_people_found ?? 0} ({Math.round(((diag.fit_ratio ?? 0) * 100))}%)</div>
              </div>
              <div>
                <div className="text-muted-foreground">Detected tags</div>
                <div className="flex flex-wrap gap-1">
                  {(diag.detected_tags && diag.detected_tags.length > 0)
                    ? diag.detected_tags.map((t) => <Badge key={t} variant="secondary">{t}</Badge>)
                    : <span className="text-muted-foreground">none</span>}
                </div>
              </div>
            </div>
            {diag.sample_titles && diag.sample_titles.length > 0 && (
              <div>
                <div className="text-muted-foreground">Sample (first 5)</div>
                <ul className="mt-1 list-disc pl-5">
                  {diag.sample_titles.map((s, idx) => (
                    <li key={idx}>{s.title ?? "—"} <span className="text-muted-foreground">@ {s.company ?? "—"}</span></li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ) : (
          <div className="text-muted-foreground">No diagnostics captured.</div>
        )}
        {Array.isArray(run.errors) && run.errors.length > 0 && (
          <pre className="overflow-auto rounded bg-muted p-2">{JSON.stringify(run.errors, null, 2)}</pre>
        )}
      </div>
    </details>
  );
}

function HistoryGroup({
  title,
  runs,
  badge,
  badgeVariant = "secondary",
  onCancel,
  onApprove,
  busy,
  reopenable = false,
}: {
  title: string;
  runs: Run[];
  badge: string;
  badgeVariant?: "default" | "secondary" | "outline" | "destructive";
  onCancel: (id: string) => void;
  onApprove: (id: string, ids: string[]) => void;
  busy: string | null;
  reopenable?: boolean;
}) {
  if (runs.length === 0) return null;
  return (
    <details className="rounded-md border bg-muted/10 px-3 py-2">
      <summary className="cursor-pointer text-sm">
        <span className="font-medium">{title}</span>{" "}
        <span className="text-muted-foreground">({runs.length})</span>
      </summary>
      <div className="mt-2 space-y-2">
        {runs.map((r) => (
          <RunHistoryRow
            key={r.id}
            run={r}
            badge={badge}
            badgeVariant={badgeVariant}
            onCancel={onCancel}
            onApprove={onApprove}
            busy={busy}
            reopenable={reopenable}
          />
        ))}
      </div>
    </details>
  );
}

function RunsTab({
  runs,
  connections,
  busy,
  setBusy,
  onReload,
  onCancel,
  onApprove,
}: {
  runs: Run[];
  connections: Connection[];
  busy: string | null;
  setBusy: (s: string | null) => void;
  onReload: () => Promise<void> | void;
  onCancel: (id: string) => Promise<void> | void;
  onApprove: (runId: string, ids: string[]) => Promise<void> | void;
}) {
  const groups = useMemo(() => classifyRuns(runs), [runs]);

  // Cleanup target = stale awaiting + superseded awaiting (cancel them in DB)
  const cleanupTargets = useMemo(
    () => [...groups.staleAwaiting, ...groups.superseded].map((r) => r.id),
    [groups.staleAwaiting, groups.superseded],
  );

  async function cleanupView() {
    if (cleanupTargets.length === 0) {
      toast({ title: "Already clean", description: "No stale or superseded awaiting runs." });
      return;
    }
    if (!confirm(`Discard ${cleanupTargets.length} stale / superseded awaiting run(s)? Audit history is preserved in the database. No credits are spent.`)) return;
    setBusy("cleanup");
    const { error } = await supabase
      .from("apollo_sync_runs")
      .update({ status: "cancelled", completed_at: new Date().toISOString() })
      .in("id", cleanupTargets);
    setBusy(null);
    if (error) {
      toast({ title: "Cleanup failed", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: `Cleaned up ${cleanupTargets.length} run(s)`, description: "Old records remain in Run history." });
    await onReload();
  }

  const primary = groups.primary;

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-2 rounded-md border bg-muted/10 p-3 text-xs text-muted-foreground">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        <p>
          Each Apollo sync creates a run record for audit. Only the latest valid run needs action. Older, poor-fit or cancelled runs are stored in history and can be ignored.
        </p>
      </div>

      <CurrentActionHero
        groups={groups}
        connections={connections}
        onCleanup={cleanupView}
        cleanupBusy={busy === "cleanup"}
        cleanupCount={cleanupTargets.length}
      />

      {primary ? (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Latest run</CardTitle>
          </CardHeader>
          <CardContent>
            {(() => {
              const diag = extractDiagnostics(primary.errors);
              const fit = diag?.segment_fit;
              const showFitWarning = primary.status === "awaiting_enrichment_approval" && fit && fit !== "good";
              return (
                <RunCard
                  run={primary}
                  diag={diag}
                  fit={fit}
                  showFitWarning={!!showFitWarning}
                  busy={busy}
                  onCancel={() => onCancel(primary.id)}
                  onApprove={(ids) => onApprove(primary.id, ids)}
                >
                  {primary.status === "awaiting_enrichment_approval" && fit === "good" && (
                    <div className="flex items-start gap-2 rounded-md border border-emerald-500/40 bg-emerald-500/10 p-3 text-sm">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                      <div className="font-medium">
                        Good fit — candidates match {primary.business_name === "Neon Candy" ? "NeonCandy Month 1" : "the segment"} criteria.
                      </div>
                    </div>
                  )}
                  {showFitWarning && (
                    <div className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm">
                      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
                      <div className="font-medium">
                        {fit === "poor"
                          ? "This Apollo source does not match the segment target. Discard and fix the segment before enriching."
                          : "This Apollo source may not match the segment target. Review samples below before enriching."}
                      </div>
                    </div>
                  )}
                  {primary.status !== "awaiting_enrichment_approval" && <CompletedRunSummary run={primary} />}
                  <RunDeveloperDiagnostics run={primary} diag={diag} />
                </RunCard>
              );
            })()}
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Run history</CardTitle>
            <span className="text-xs text-muted-foreground">
              Audit-only — full records remain in the database.
            </span>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          <HistoryGroup
            title="Completed"
            runs={groups.completed}
            badge="completed"
            badgeVariant="default"
            onCancel={onCancel}
            onApprove={onApprove}
            busy={busy}
          />
          <HistoryGroup
            title="Superseded — no action needed"
            runs={groups.superseded}
            badge="superseded"
            badgeVariant="outline"
            onCancel={onCancel}
            onApprove={onApprove}
            busy={busy}
          />
          <HistoryGroup
            title="Stale awaiting"
            runs={groups.staleAwaiting}
            badge="stale"
            badgeVariant="outline"
            onCancel={onCancel}
            onApprove={onApprove}
            busy={busy}
          />
          <HistoryGroup
            title="Poor fit"
            runs={groups.poorFit}
            badge="poor fit"
            badgeVariant="destructive"
            onCancel={onCancel}
            onApprove={onApprove}
            busy={busy}
          />
          <HistoryGroup
            title="Cancelled"
            runs={groups.cancelled}
            badge="cancelled"
            badgeVariant="secondary"
            onCancel={onCancel}
            onApprove={onApprove}
            busy={busy}
          />
          <HistoryGroup
            title="Failed"
            runs={groups.failed}
            badge="failed"
            badgeVariant="destructive"
            onCancel={onCancel}
            onApprove={onApprove}
            busy={busy}
          />
          {groups.completed.length === 0 &&
            groups.superseded.length === 0 &&
            groups.staleAwaiting.length === 0 &&
            groups.poorFit.length === 0 &&
            groups.cancelled.length === 0 &&
            groups.failed.length === 0 && (
              <p className="text-sm text-muted-foreground">No history yet.</p>
            )}
        </CardContent>
      </Card>
    </div>
  );
}

function RunCard({
  run,
  diag,
  fit,
  showFitWarning,
  busy,
  onCancel,
  onApprove,
  children,
}: {
  run: Run;
  diag: RunDiagnostics | null;
  fit: string | undefined;
  showFitWarning: boolean;
  busy: string | null;
  onCancel: () => void;
  onApprove: (selectedIds: string[]) => void;
  children: React.ReactNode;
}) {
  const [preview, setPreview] = useState<PreviewSelection | null>(null);
  const isAwaiting = run.status === "awaiting_enrichment_approval";
  const previewReady = preview !== null && preview.total > 0;
  const credits = preview?.creditsToSpend ?? 0;
  const selectedIds = preview?.selectedIds ?? [];
  const approveDisabled = busy === `enrich-${run.id}` || fit === "poor" || !previewReady || credits === 0;

  return (
    <div className="space-y-2 rounded-md border p-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 font-medium">
            {run.business_name}
            {fit && <Badge variant={fitBadgeVariant(fit)}>fit: {fit}</Badge>}
          </div>
          <div className="text-xs text-muted-foreground">
            {new Date(run.started_at).toLocaleString()} • <Badge variant="outline">{run.status}</Badge>
            {diag?.search_mode && <> • mode: <code>{diag.search_mode}</code></>}
            {diag?.saved_list_id && <> • list: <code>{diag.saved_list_id}</code></>}
          </div>
        </div>
        {isAwaiting && (
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={onCancel}>
              <Trash2 className="mr-1 h-3 w-3" /> Discard
            </Button>
          </div>
        )}
      </div>
      {children}
      {isAwaiting && (
        <div className="space-y-3 border-t pt-3">
          <div>
            <h3 className="text-sm font-semibold">Review candidates before enrichment</h3>
            <p className="text-xs text-muted-foreground">Review these Apollo candidates before spending enrichment credits.</p>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs md:grid-cols-4">
            <Stat label="Found" value={run.people_found ?? 0} />
            <Stat label="Has email" value={run.people_with_email_flag ?? 0} />
            <Stat label="Segment fit" value={fit ?? "—"} />
            <Stat label="New" value={preview?.newCount ?? 0} />
            <Stat label="Existing in CRM" value={preview?.existingSkipped ?? 0} />
            <Stat label="Possible duplicates" value={preview?.possibleHeld ?? 0} />
            <Stat label="Selected" value={preview?.creditsToSpend ?? 0} />
            <Stat label="Est. credits" value={preview?.creditsToSpend ?? 0} />
          </div>
          {!previewReady && (
            <div className="flex items-start gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 p-2 text-xs">
              <Loader2 className="mt-0.5 h-3 w-3 shrink-0 animate-spin text-amber-500" />
              <span>Duplicate check pending — enrichment approval disabled.</span>
            </div>
          )}
          <CandidatePreview runId={run.id} onSelectionReady={setPreview} />
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs text-muted-foreground">
              {!previewReady
                ? "Candidate preview required before enrichment."
                : credits === 0
                ? "All candidates already exist in the CRM with known emails — no enrichment needed."
                : `Will enrich ${credits} new candidate(s); ${preview?.existingSkipped ?? 0} existing skipped, ${preview?.possibleHeld ?? 0} possible held, ${preview?.creditsSaved ?? 0} credits saved.`}
            </p>
            <Button size="sm" onClick={() => onApprove(selectedIds)} disabled={approveDisabled}>
              {busy === `enrich-${run.id}` ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : null}
              Approve enrichment ({credits} credits)
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function EditSegmentDialog({
  segment,
  onSave,
}: {
  segment: Segment;
  onSave: (updates: Record<string, unknown>) => Promise<boolean>;
}) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<Segment["mode"]>(segment.mode);
  const [savedListId, setSavedListId] = useState(segment.saved_list_id ?? "");
  const [criteriaText, setCriteriaText] = useState(JSON.stringify(segment.search_criteria ?? {}, null, 2));
  const [saving, setSaving] = useState(false);

  function applyMusicPreset() {
    setMode("people_search");
    setCriteriaText(JSON.stringify(NEONCANDY_MONTH1_CRITERIA, null, 2));
  }

  async function handleSave() {
    let parsedCriteria: Record<string, unknown> = {};
    if (mode === "people_search") {
      try {
        parsedCriteria = JSON.parse(criteriaText || "{}");
      } catch {
        toast({ title: "Invalid JSON", description: "Search criteria must be valid JSON.", variant: "destructive" });
        return;
      }
    }
    setSaving(true);
    const ok = await onSave({
      mode,
      saved_list_id: mode === "saved_list" ? (savedListId.trim() || null) : null,
      search_criteria: mode === "people_search" ? parsedCriteria : {},
    });
    setSaving(false);
    if (ok) setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">Edit</Button>
      </DialogTrigger>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Edit segment — {segment.segment_name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Mode</Label>
            <Select value={mode} onValueChange={(v) => setMode(v as Segment["mode"])}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="saved_list">Apollo saved list (label_id)</SelectItem>
                <SelectItem value="people_search">Criteria search</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {mode === "saved_list" ? (
            <div>
              <Label>Saved list ID (label_id)</Label>
              <Input value={savedListId} onChange={(e) => setSavedListId(e.target.value)} placeholder="label_xxx" />
              <p className="mt-1 text-xs text-muted-foreground">
                Find this in Apollo → People → Lists → list URL ends with the label_id.
              </p>
            </div>
          ) : (
            <div>
              <div className="flex items-center justify-between">
                <Label>Search criteria (JSON)</Label>
                <Button type="button" variant="ghost" size="sm" onClick={applyMusicPreset}>
                  Use NeonCandy Month 1 preset
                </Button>
              </div>
              <Textarea
                rows={10}
                className="font-mono text-xs"
                value={criteriaText}
                onChange={(e) => setCriteriaText(e.target.value)}
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Apollo people-search payload. The sync always enforces contact_email_status = verified.
              </p>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : null}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
