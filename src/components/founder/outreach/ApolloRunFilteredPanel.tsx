import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { Loader2, X } from "lucide-react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CheckCircle2, AlertTriangle } from "lucide-react";

type Stage =
  | "ready_to_stage"
  | "staged"
  | "contacted"
  | "engaged"
  | "client"
  | "do_not_contact"
  | "archived";

type Row = {
  contact_id: string;
  email: string | null;
  name: string | null;
  first_name: string | null;
  last_name: string | null;
  company: string | null;
  role: string | null;
  apollo_person_id: string | null;
  qualification: string | null;
  current_stage: Stage | null;
  bcr_id: string | null;
  campaign_eligible: boolean | null;
  business_name: string;
  source_segment_id: string | null;
};

type Campaign = { id: string; campaign_name: string; business_name: string; status: string };

type SenderStatus = {
  hello_active: boolean;
  hello_ready: string | null;
  hello_paused: string | null;
  hello_daily_limit: number | null;
  hello_sent_today: number | null;
  music_active: boolean | null;
  campaign_status: string | null;
  sequence_steps: number;
};

type Props = {
  /** When provided, restricts to BCRs currently in this stage. */
  requiredStage?: Stage;
  /** Page heading shown above filter chips. */
  heading: string;
  /** Helper subtitle shown beneath heading. */
  subtitle: string;
};

export default function ApolloRunFilteredPanel({ requiredStage, heading, subtitle }: Props) {
  const [searchParams, setSearchParams] = useSearchParams();
  const runId = searchParams.get("run_id");
  const stageParam = searchParams.get("stage") as Stage | null;
  const sourceParam = searchParams.get("source");
  const stageFilter: Stage | null = requiredStage ?? stageParam;

  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<Row[]>([]);
  const [businessName, setBusinessName] = useState<string | null>(null);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [campaignId, setCampaignId] = useState<string>("");
  const [staging, setStaging] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [senderStatus, setSenderStatus] = useState<SenderStatus | null>(null);

  const load = useCallback(async () => {
    if (!runId) return;
    setLoading(true);
    setSelected({});

    // 1. Pull the run for the business name
    const { data: run } = await supabase
      .from("apollo_sync_runs")
      .select("business_name, segment_id")
      .eq("id", runId)
      .maybeSingle();
    const business = run?.business_name ?? null;
    setBusinessName(business);

    // 2. Pull leads for this run (only those that successfully imported a contact)
    const { data: leads } = await supabase
      .from("apollo_leads")
      .select("contact_id, apollo_person_id, status")
      .eq("run_id", runId)
      .not("contact_id", "is", null);
    const leadsList = (leads ?? []) as Array<{ contact_id: string; apollo_person_id: string | null; status: string }>;
    const contactIds = Array.from(new Set(leadsList.map((l) => l.contact_id))).filter(Boolean) as string[];
    if (contactIds.length === 0) {
      setRows([]);
      setLoading(false);
      return;
    }

    // 3. Pull contacts and BCR rows
    const [{ data: contacts }, { data: bcrs }] = await Promise.all([
      supabase
        .from("contacts")
        .select("id, email, name, first_name, last_name, company, role, apollo_person_id, source")
        .in("id", contactIds),
      business
        ? supabase
            .from("business_contact_relationships")
            .select("id, contact_id, business_name, qualification, current_stage, campaign_eligible, source_segment_id")
            .in("contact_id", contactIds)
            .eq("business_name", business)
        : Promise.resolve({ data: [] as any[] }),
    ]);

    const bcrByContact = new Map<string, any>();
    (bcrs ?? []).forEach((b: any) => bcrByContact.set(b.contact_id, b));
    const personByContact = new Map<string, string | null>();
    leadsList.forEach((l) => personByContact.set(l.contact_id, l.apollo_person_id));

    let merged: Row[] = (contacts ?? []).map((c: any) => {
      const bcr = bcrByContact.get(c.id);
      return {
        contact_id: c.id,
        email: c.email ?? null,
        name: c.name ?? null,
        first_name: c.first_name ?? null,
        last_name: c.last_name ?? null,
        company: c.company ?? null,
        role: c.role ?? null,
        apollo_person_id: personByContact.get(c.id) ?? c.apollo_person_id ?? null,
        qualification: bcr?.qualification ?? null,
        current_stage: (bcr?.current_stage ?? null) as Stage | null,
        bcr_id: bcr?.id ?? null,
        campaign_eligible: bcr?.campaign_eligible ?? null,
        business_name: business ?? "",
        source_segment_id: bcr?.source_segment_id ?? null,
      };
    });

    // 4. Apply stage filter (server-side data already narrowed to business)
    if (stageFilter) {
      merged = merged.filter((r) => r.current_stage === stageFilter);
    }

    setRows(merged);
    setLoading(false);
  }, [runId, stageFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  // Load campaigns scoped to the business once known
  useEffect(() => {
    if (!businessName) return;
    void (async () => {
      const { data } = await supabase
        .from("outreach_campaigns")
        .select("id, campaign_name, business_name, status")
        .eq("business_name", businessName)
        .order("created_at", { ascending: false });
      setCampaigns((data as Campaign[]) ?? []);
    })();
  }, [businessName]);

  const selectedIds = useMemo(() => Object.keys(selected).filter((k) => selected[k]), [selected]);
  const allSelected = rows.length > 0 && rows.every((r) => selected[r.contact_id]);

  function toggleAll(next: boolean) {
    if (!next) {
      setSelected({});
      return;
    }
    const map: Record<string, boolean> = {};
    rows.forEach((r) => {
      if (r.bcr_id) map[r.contact_id] = true;
    });
    setSelected(map);
  }

  function clearFilters() {
    // Strip run_id, stage, source — keep anything else
    const next = new URLSearchParams(searchParams);
    next.delete("run_id");
    next.delete("stage");
    next.delete("source");
    setSearchParams(next, { replace: true });
  }

  function removeChip(key: "run_id" | "stage" | "source" | "business") {
    if (key === "business") {
      // business is derived — clearing it requires clearing run filter
      clearFilters();
      return;
    }
    const next = new URLSearchParams(searchParams);
    next.delete(key);
    setSearchParams(next, { replace: true });
  }

  async function stageSelected() {
    if (!campaignId) {
      toast({ title: "Pick a campaign", description: "Choose a campaign before staging.", variant: "destructive" });
      return;
    }
    const targetIds = rows.filter((r) => selected[r.contact_id] && r.bcr_id).map((r) => r.bcr_id!) as string[];
    if (targetIds.length === 0) {
      toast({ title: "Nothing to stage", description: "Select at least one contact with a relationship row.", variant: "destructive" });
      return;
    }
    if (
      !confirm(
        `Stage ${targetIds.length} contact(s) to campaign? This only marks them as staged with hold-for-approval. No emails are sent.`,
      )
    )
      return;
    setStaging(true);
    const { error } = await supabase
      .from("business_contact_relationships")
      .update({
        current_stage: "staged",
        last_campaign_id: campaignId,
        campaign_eligible: true,
      } as never)
      .in("id", targetIds);
    setStaging(false);
    if (error) {
      toast({ title: "Stage failed", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: `Staged ${targetIds.length} contact(s)`, description: "They are now in the campaign's staged pool. Nothing has been sent." });
    void load();
  }

  if (!runId) return null;

  return (
    <Card className="border-primary/30">
      <CardHeader className="space-y-3">
        <div>
          <CardTitle className="text-base">{heading}</CardTitle>
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Chip label={`Apollo run: ${runId.slice(0, 8)}…`} onRemove={() => removeChip("run_id")} />
          {businessName && <Chip label={`Business: ${businessName}`} onRemove={() => removeChip("business")} />}
          {stageFilter && (
            <Chip
              label={`Stage: ${formatStage(stageFilter)}`}
              onRemove={requiredStage ? undefined : () => removeChip("stage")}
            />
          )}
          <Chip label={`Source: ${sourceParam ?? "Apollo"}`} onRemove={sourceParam ? () => removeChip("source") : undefined} />
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            Clear filters
          </Button>
          <div className="ml-auto text-xs text-muted-foreground">
            {loading ? "Loading…" : `${rows.length} record${rows.length === 1 ? "" : "s"}`}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap items-center gap-2 rounded-md border bg-muted/20 p-3">
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={allSelected} onCheckedChange={(v) => toggleAll(!!v)} />
            Select all filtered ({rows.filter((r) => r.bcr_id).length})
          </label>
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <Select value={campaignId} onValueChange={setCampaignId}>
              <SelectTrigger className="w-64">
                <SelectValue placeholder={campaigns.length === 0 ? "No campaigns for this business" : "Choose campaign"} />
              </SelectTrigger>
              <SelectContent>
                {campaigns.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.campaign_name} <span className="text-muted-foreground">· {c.status}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button size="sm" onClick={stageSelected} disabled={staging || selectedIds.length === 0 || !campaignId}>
              {staging ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : null}
              Stage selected to campaign ({selectedIds.length})
            </Button>
          </div>
        </div>
        <p className="text-[11px] text-muted-foreground">
          Staging only updates the contact's pipeline stage and links the chosen campaign. Hold-for-approval remains on. No emails are queued or sent.
        </p>

        <div className="overflow-hidden rounded-md border">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-3 py-2 text-left w-8"></th>
                <th className="px-3 py-2 text-left">Name</th>
                <th className="px-3 py-2 text-left">Email</th>
                <th className="px-3 py-2 text-left">Title</th>
                <th className="px-3 py-2 text-left">Company</th>
                <th className="px-3 py-2 text-left">Stage</th>
                <th className="px-3 py-2 text-left">Qualification</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-3 py-4 text-center text-muted-foreground">
                    <Loader2 className="mx-auto h-4 w-4 animate-spin" />
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-3 py-4 text-center text-muted-foreground">
                    No contacts match these filters.
                  </td>
                </tr>
              ) : (
                rows.map((r) => {
                  const fullName = r.name || [r.first_name, r.last_name].filter(Boolean).join(" ") || "—";
                  return (
                    <tr key={r.contact_id} className="hover:bg-muted/30">
                      <td className="px-3 py-2">
                        <Checkbox
                          checked={!!selected[r.contact_id]}
                          disabled={!r.bcr_id}
                          onCheckedChange={(v) =>
                            setSelected((prev) => ({ ...prev, [r.contact_id]: !!v }))
                          }
                        />
                      </td>
                      <td className="px-3 py-2 font-medium">{fullName}</td>
                      <td className="px-3 py-2 font-mono text-xs">{r.email ?? "—"}</td>
                      <td className="px-3 py-2">{r.role ?? "—"}</td>
                      <td className="px-3 py-2">{r.company ?? "—"}</td>
                      <td className="px-3 py-2">
                        {r.current_stage ? (
                          <Badge variant="outline">{formatStage(r.current_stage)}</Badge>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        {r.qualification ? (
                          <Badge variant={r.qualification === "qualified" ? "default" : "secondary"}>
                            {r.qualification}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <p className="text-xs text-muted-foreground">
          Looking for the source run? <Link to="/founder/outreach/apollo" className="text-primary underline">Open Apollo Integration</Link>
        </p>
      </CardContent>
    </Card>
  );
}

function Chip({ label, onRemove }: { label: string; onRemove?: () => void }) {
  return (
    <Badge variant="secondary" className="gap-1 px-2 py-1">
      {label}
      {onRemove && (
        <button
          type="button"
          aria-label={`Remove ${label}`}
          onClick={onRemove}
          className="ml-1 rounded-sm opacity-70 hover:opacity-100"
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </Badge>
  );
}

function formatStage(s: string): string {
  return s.replace(/_/g, " ");
}