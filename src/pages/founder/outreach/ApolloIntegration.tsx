import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";
import FounderLayout from "@/components/founder/FounderLayout";
import { Loader2, RefreshCw, Trash2, Play, KeyRound } from "lucide-react";

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

function StatusBadge({ status }: { status: string }) {
  const variant =
    status === "ok" ? "default"
    : status === "unverified" ? "secondary"
    : "destructive";
  return <Badge variant={variant}>{status}</Badge>;
}

export default function ApolloIntegration() {
  const [connections, setConnections] = useState<Connection[]>([]);
  const [segments, setSegments] = useState<Segment[]>([]);
  const [runs, setRuns] = useState<Run[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  // New connection form
  const [businessName, setBusinessName] = useState("Neon Candy");
  const [apiKeyInput, setApiKeyInput] = useState("");

  // New segment form
  const [segBusiness, setSegBusiness] = useState("Neon Candy");
  const [segName, setSegName] = useState("Month 1");
  const [segListId, setSegListId] = useState("");

  async function loadAll() {
    setLoading(true);
    const [c, s, r] = await Promise.all([
      supabase.from("apollo_connections").select("*").order("created_at"),
      supabase.from("apollo_sync_segments").select("*").order("created_at"),
      supabase.from("apollo_sync_runs").select("*").order("started_at", { ascending: false }).limit(20),
    ]);
    setConnections((c.data as Connection[]) ?? []);
    setSegments((s.data as Segment[]) ?? []);
    setRuns((r.data as Run[]) ?? []);
    setLoading(false);
  }

  useEffect(() => { loadAll(); }, []);

  async function saveAndTest() {
    if (!businessName.trim() || !apiKeyInput.trim()) {
      toast({ title: "Missing fields", description: "Business name + Apollo master API key required.", variant: "destructive" });
      return;
    }
    setBusy("save");
    const { data, error } = await supabase.functions.invoke("apollo-test-connection", {
      body: { business_name: businessName.trim(), api_key: apiKeyInput.trim(), save: true },
    });
    setBusy(null);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    if ((data as any)?.ok) {
      toast({ title: "Connection saved", description: "Search + Enrichment APIs verified." });
    } else {
      toast({
        title: "Saved with capability errors",
        description: `Search: ${(data as any)?.search?.error || "ok"} • Enrichment: ${(data as any)?.enrichment?.error || "ok"}`,
        variant: "destructive",
      });
    }
    setApiKeyInput("");
    loadAll();
  }

  async function retestConnection(business: string) {
    setBusy(`test-${business}`);
    const { data, error } = await supabase.functions.invoke("apollo-test-connection", {
      body: { business_name: business, save: false },
    });
    setBusy(null);
    if (error) { toast({ title: "Test failed", description: error.message, variant: "destructive" }); return; }
    toast({ title: (data as any)?.ok ? "All capabilities verified" : "Capability check failed", description: JSON.stringify((data as any)).slice(0, 200) });
    loadAll();
  }

  async function removeConnection(id: string) {
    if (!confirm("Remove this Apollo connection? The encrypted key will be deleted.")) return;
    const { error } = await supabase.from("apollo_connections").delete().eq("id", id);
    if (error) { toast({ title: "Delete failed", description: error.message, variant: "destructive" }); return; }
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
    if (error) { toast({ title: "Create failed", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Segment created" });
    setSegListId("");
    loadAll();
  }

  async function runSearch(segmentId: string) {
    setBusy(`run-${segmentId}`);
    const { data, error } = await supabase.functions.invoke("apollo-sync-search", { body: { segment_id: segmentId } });
    setBusy(null);
    if (error) { toast({ title: "Search failed", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Apollo search complete", description: `Found ${(data as any)?.people_found} • with email: ${(data as any)?.people_with_email_flag}. Approve enrichment in Sync Runs tab.` });
    loadAll();
  }

  async function approveEnrichment(runId: string) {
    if (!confirm("Approve enrichment? This will spend Apollo credits (1 per email revealed, max 25).")) return;
    setBusy(`enrich-${runId}`);
    const { data, error } = await supabase.functions.invoke("apollo-sync-enrich", { body: { run_id: runId } });
    setBusy(null);
    if (error) { toast({ title: "Enrichment failed", description: error.message, variant: "destructive" }); return; }
    const d = data as any;
    toast({ title: "Enrichment complete", description: `Imported ${d.imported} • emails returned ${d.emails_returned} • skipped no-email ${d.skipped_no_email} • duplicates ${d.duplicate} • suppressed ${d.suppressed}` });
    loadAll();
  }

  return (
    <FounderLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-semibold">Apollo Integration</h1>
          <p className="text-muted-foreground mt-1">
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

          {/* Connections */}
          <TabsContent value="connections" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><KeyRound className="h-4 w-4" /> Add / Replace Apollo Master Key</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
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
                  Key is encrypted at rest with pgcrypto + APOLLO_ENCRYPTION_KEY. Only the last 4 characters are ever displayed. Decrypted only inside server-side functions.
                </p>
                <Button onClick={saveAndTest} disabled={busy === "save"}>
                  {busy === "save" ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
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
                      {connections.map((c) => (
                        <TableRow key={c.id}>
                          <TableCell className="font-medium">{c.business_name}</TableCell>
                          <TableCell><code className="text-xs">••••••••{c.api_key_last4}</code></TableCell>
                          <TableCell>
                            <StatusBadge status={c.search_api_status} />
                            {c.search_api_error && <p className="text-xs text-destructive mt-1 max-w-[300px]">{c.search_api_error}</p>}
                          </TableCell>
                          <TableCell>
                            <StatusBadge status={c.enrichment_api_status} />
                            {c.enrichment_api_error && <p className="text-xs text-destructive mt-1 max-w-[300px]">{c.enrichment_api_error}</p>}
                          </TableCell>
                          <TableCell className="space-x-2">
                            <Button size="sm" variant="outline" onClick={() => retestConnection(c.business_name)} disabled={busy === `test-${c.business_name}`}>
                              <RefreshCw className="h-3 w-3 mr-1" /> Re-test
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => removeConnection(c.id)}>
                              <Trash2 className="h-3 w-3 mr-1" /> Remove
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Segments */}
          <TabsContent value="segments" className="space-y-4">
            <Card>
              <CardHeader><CardTitle>Create sync segment</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-3 gap-3">
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
                      {segments.map((s) => (
                        <TableRow key={s.id}>
                          <TableCell>{s.business_name}</TableCell>
                          <TableCell className="font-medium">{s.segment_name}</TableCell>
                          <TableCell><Badge variant="outline">{s.mode}</Badge></TableCell>
                          <TableCell><code className="text-xs">{s.saved_list_id ?? "—"}</code></TableCell>
                          <TableCell>{s.max_contacts_per_run}</TableCell>
                          <TableCell>{s.hold_for_approval ? "✓" : "—"}</TableCell>
                          <TableCell>
                            <Button size="sm" onClick={() => runSearch(s.id)} disabled={busy === `run-${s.id}`}>
                              {busy === `run-${s.id}` ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Play className="h-3 w-3 mr-1" />}
                              Run search
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Runs */}
          <TabsContent value="runs" className="space-y-4">
            <Card>
              <CardHeader><CardTitle>Recent sync runs</CardTitle></CardHeader>
              <CardContent>
                {runs.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No syncs run yet.</p>
                ) : (
                  <div className="space-y-3">
                    {runs.map((r) => (
                      <div key={r.id} className="border rounded-md p-4 space-y-2">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium">{r.business_name}</div>
                            <div className="text-xs text-muted-foreground">
                              {new Date(r.started_at).toLocaleString()} • <Badge variant="outline">{r.status}</Badge>
                            </div>
                          </div>
                          {r.status === "awaiting_enrichment_approval" && (
                            <Button size="sm" onClick={() => approveEnrichment(r.id)} disabled={busy === `enrich-${r.id}`}>
                              {busy === `enrich-${r.id}` ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
                              Approve enrichment ({r.people_with_email_flag} credits)
                            </Button>
                          )}
                        </div>
                        <div className="grid grid-cols-4 gap-3 text-sm">
                          <Stat label="Found" value={r.people_found} />
                          <Stat label="Has email flag" value={r.people_with_email_flag} />
                          <Stat label="Enriched" value={r.enrichment_attempted} />
                          <Stat label="Emails returned" value={r.emails_returned} />
                          <Stat label="Imported" value={r.contacts_imported} />
                          <Stat label="Skipped no-email" value={r.contacts_skipped_no_email} />
                          <Stat label="Duplicates" value={r.contacts_duplicate} />
                          <Stat label="Suppressed" value={r.contacts_suppressed} />
                          <Stat label="Qualified" value={r.qualified_count} />
                          <Stat label="Maybe" value={r.maybe_count} />
                          <Stat label="Not qualified" value={r.not_qualified_count} />
                          <Stat label="Needs review" value={r.needs_review_count} />
                        </div>
                        {Array.isArray(r.errors) && (r.errors as unknown[]).length > 0 && (
                          <details className="text-xs">
                            <summary className="cursor-pointer text-destructive">{(r.errors as unknown[]).length} error(s)</summary>
                            <pre className="mt-1 p-2 bg-muted rounded overflow-auto">{JSON.stringify(r.errors, null, 2)}</pre>
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
