import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Download } from "lucide-react";

/**
 * Import contacts that already exist in a mapped Smartlead campaign into Liftor.
 * Read-only against Smartlead. No sending, no lead push, no mailbox changes.
 */
export default function SmartleadContactImportPanel() {
  const [mappingId, setMappingId] = useState("");
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(false);
  const [res, setRes] = useState<any>(null);

  const run = async (dry_run: boolean, useOffset = offset) => {
    setLoading(true);
    const { data, error } = await supabase.functions.invoke("smartlead-campaign-lead-import", {
      body: {
        campaign_mapping_id: mappingId.trim() || undefined,
        offset: useOffset,
        limit: 100,
        dry_run,
      },
    });
    setLoading(false);
    const payload = error ? { ok: false, error: error.message } : data;
    setRes(payload);
    if (payload?.continuation?.next_offset != null) setOffset(payload.continuation.next_offset);
  };

  const c = res?.counters;
  const accessError = typeof res?.error === "string" &&
    (res.error.includes("unauthorized") || res.error.includes("forbidden"));

  return (
    <Card className="p-5 space-y-3 border-2 border-border/60">
      <div className="flex items-center gap-2 flex-wrap">
        <Download className="h-4 w-4 text-primary" />
        <h3 className="text-base font-semibold">Import existing Smartlead contacts</h3>
        <Badge variant="outline" className="text-[10px]">read-only GET</Badge>
        <Badge variant="outline" className="text-[10px]">no sending</Badge>
      </div>

      <div className="flex gap-2 items-end flex-wrap">
        <div className="flex-1 min-w-[220px]">
          <label className="text-[10px] text-muted-foreground">Campaign mapping ID (blank = the single active mapping)</label>
          <Input value={mappingId} onChange={(e) => setMappingId(e.target.value)} placeholder="optional" className="font-mono text-xs" />
        </div>
        <div className="w-28">
          <label className="text-[10px] text-muted-foreground">Offset</label>
          <Input type="number" value={offset} onChange={(e) => setOffset(Number(e.target.value) || 0)} className="font-mono text-xs" />
        </div>
        <Button size="sm" variant="outline" onClick={() => run(true)} disabled={loading}>Preview page</Button>
        <Button size="sm" onClick={() => run(false)} disabled={loading}>{loading ? "Working…" : "Import page"}</Button>
        <Button size="sm" variant="ghost" onClick={() => { setOffset(0); setRes(null); }} disabled={loading}>Reset</Button>
      </div>

      {res && (
        <div className="space-y-2">
          {res.ok === false && (
            <div className="rounded border border-destructive/50 bg-destructive/10 p-2 text-[11px]">
              <div className="font-semibold">{accessError ? "Smartlead account / API key problem" : String(res.error)}</div>
              <div className="text-muted-foreground">{res.actionable ?? "See details below."}</div>
              {res.provider_status ? <div className="font-mono">provider status: {res.provider_status}</div> : null}
              {accessError && (
                <div className="text-muted-foreground">
                  This is an access/entitlement failure, not an empty campaign. Nothing was imported.
                </div>
              )}
              {Array.isArray(res.candidates) && res.candidates.length > 0 && (
                <pre className="mt-1 text-[10px] overflow-x-auto">{JSON.stringify(res.candidates, null, 2)}</pre>
              )}
            </div>
          )}

          {res.ok && res.empty_page && (
            <div className="rounded border border-border/60 p-2 text-[11px]">
              No leads returned for this page ({res.empty_reason}). Smartlead responded successfully.
            </div>
          )}

          {c && (
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 text-[11px]">
              {(["processed", "created", "updated", "held", "skipped", "errors"] as const).map((k) => (
                <div key={k} className="rounded border border-border/60 p-2">
                  <div className="text-muted-foreground capitalize">{k}</div>
                  <div className="font-mono text-sm">{c[k]}</div>
                </div>
              ))}
            </div>
          )}

          {res.ok && res.continuation && (
            <div className="flex items-center gap-2 text-[11px]">
              <span className="text-muted-foreground">
                {res.continuation.has_more
                  ? `More leads remain — resume at offset ${res.continuation.next_offset}.`
                  : "All pages consumed for this campaign."}
              </span>
              {res.continuation.has_more && (
                <Button size="sm" variant="outline" disabled={loading}
                  onClick={() => run(res.dry_run === true, res.continuation.next_offset)}>
                  Continue
                </Button>
              )}
            </div>
          )}

          <pre className="text-[10px] bg-muted/30 rounded p-2 overflow-x-auto max-h-64">
            {JSON.stringify(res, null, 2)}
          </pre>
        </div>
      )}

      <p className="text-[10px] text-muted-foreground">
        Imports into Liftor only. Smartlead is queried with GET requests. Campaign membership is not
        consent: imported contacts land as needs-review and existing suppression / do-not-contact is
        never cleared.
      </p>
    </Card>
  );
}
