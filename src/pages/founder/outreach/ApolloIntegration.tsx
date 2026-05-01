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
import { AlertTriangle, CheckCircle2, KeyRound, Loader2, Play, RefreshCw, ShieldAlert, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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
  business_name: string;
  status: string;
  people_found: number;
  people_with_email_flag: number;
  enrichment_attempted: number;
  emails_returned: number;
  contacts_imported: number;
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

  async function approveEnrichment(runId: string) {
    if (!confirm("Approve enrichment? This will spend Apollo credits (1 per email revealed, max 25).")) return;
    setBusy(`enrich-${runId}`);
    const { data, error } = await supabase.functions.invoke("apollo-sync-enrich", { body: { run_id: runId } });
    setBusy(null);
    if (error) {
      const message = error.message || "Enrichment failed";
      const isPoorFit = message.includes("segment_fit_poor") || message.toLowerCase().includes("does not match");
      if (isPoorFit && confirm("Apollo blocked enrichment because the search results do not match the segment taxonomy. Force enrichment anyway and spend credits?")) {
        setBusy(`enrich-${runId}`);
        const retry = await supabase.functions.invoke("apollo-sync-enrich", { body: { run_id: runId, force: true } });
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
                        const canRun = !!connection && connection.search_api_status === "ok" && connection.enrichment_api_status === "ok";
                        const blockReason = connection ? formatCapabilityError(connection) : "Add and verify an Apollo connection before syncing.";

                        return (
                          <TableRow key={segment.id}>
                            <TableCell>{segment.business_name}</TableCell>
                            <TableCell className="font-medium">{segment.segment_name}</TableCell>
                            <TableCell><Badge variant="outline">{segment.mode}</Badge></TableCell>
                            <TableCell>
                              {segment.mode === "saved_list" ? (
                                <code className="text-xs">{segment.saved_list_id ?? "⚠ none — segment will return generic results"}</code>
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
                              <div className="space-y-2">
                                <div className="flex flex-wrap gap-2">
                                  <Button size="sm" onClick={() => runSearch(segment.id)} disabled={!canRun || busy === `run-${segment.id}`}>
                                    {busy === `run-${segment.id}` ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <Play className="mr-1 h-3 w-3" />}
                                    Run search
                                  </Button>
                                  <EditSegmentDialog segment={segment} onSave={(u) => saveSegmentEdits(segment, u)} />
                                </div>
                                {!canRun && (
                                  <div className="flex items-start gap-2 text-xs text-muted-foreground">
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
            <Card>
              <CardHeader><CardTitle>Recent sync runs</CardTitle></CardHeader>
              <CardContent>
                {runs.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No syncs run yet.</p>
                ) : (
                  <div className="space-y-3">
                    {runs.map((run) => (
                      <div key={run.id} className="space-y-2 rounded-md border p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium">{run.business_name}</div>
                            <div className="text-xs text-muted-foreground">
                              {new Date(run.started_at).toLocaleString()} • <Badge variant="outline">{run.status}</Badge>
                            </div>
                          </div>
                          {run.status === "awaiting_enrichment_approval" && (
                            <Button size="sm" onClick={() => approveEnrichment(run.id)} disabled={busy === `enrich-${run.id}`}>
                              {busy === `enrich-${run.id}` ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : null}
                              Approve enrichment ({run.people_with_email_flag} credits)
                            </Button>
                          )}
                        </div>
                        <div className="grid grid-cols-2 gap-3 text-sm md:grid-cols-4">
                          <Stat label="Found" value={run.people_found} />
                          <Stat label="Has email flag" value={run.people_with_email_flag} />
                          <Stat label="Enriched" value={run.enrichment_attempted} />
                          <Stat label="Emails returned" value={run.emails_returned} />
                          <Stat label="Imported" value={run.contacts_imported} />
                          <Stat label="Skipped no-email" value={run.contacts_skipped_no_email} />
                          <Stat label="Duplicates" value={run.contacts_duplicate} />
                          <Stat label="Suppressed" value={run.contacts_suppressed} />
                          <Stat label="Qualified" value={run.qualified_count} />
                          <Stat label="Maybe" value={run.maybe_count} />
                          <Stat label="Not qualified" value={run.not_qualified_count} />
                          <Stat label="Needs review" value={run.needs_review_count} />
                        </div>
                        {Array.isArray(run.errors) && run.errors.length > 0 && (
                          <details className="text-xs">
                            <summary className="cursor-pointer text-destructive">{run.errors.length} error(s)</summary>
                            <pre className="mt-1 overflow-auto rounded bg-muted p-2">{JSON.stringify(run.errors, null, 2)}</pre>
                          </details>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </FounderLayout>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border p-2">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-lg font-semibold">{value}</div>
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
