import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { FunctionsHttpError } from "@supabase/supabase-js";
import { toast } from "sonner";

type Camp = { business_id: string; campaign_id: string; name: string; business: string };

async function launch(body: Record<string, unknown>) {
  const { data, error } = await supabase.functions.invoke("smartlead-campaign-launch", { body });
  if (error) {
    let detail = error.message;
    if (error instanceof FunctionsHttpError) { try { detail = (await error.context.json())?.error ?? detail; } catch { /* keep */ } }
    throw new Error(detail);
  }
  if (data?.ok === false) throw new Error(data.error ?? "failed");
  return data;
}

export default function AddToCampaignDialog({ open, onOpenChange, contactIds, defaultCampaign, onDone }: {
  open: boolean; onOpenChange: (o: boolean) => void; contactIds: string[]; defaultCampaign?: string | null; onDone: () => void;
}) {
  const [camps, setCamps] = useState<Camp[]>([]);
  const [pick, setPick] = useState<string>("");
  const [preview, setPreview] = useState<Record<string, any> | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<Record<string, any> | null>(null);

  useEffect(() => {
    if (!open) return;
    setPreview(null); setDone(null);
    (async () => {
      const { data } = await supabase.from("outbound_provider_campaign_mappings")
        .select("business_id, provider_campaign_id, provider_campaign_name, businesses(name)")
        .eq("provider_type", "smartlead").eq("mapping_status", "mapped").eq("is_active", true);
      const { data: snaps } = await supabase.from("smartlead_campaign_snapshots").select("provider_campaign_id, campaign_status");
      const paused = new Set((snaps ?? []).filter((s: any) => ["PAUSED", "STOPPED", "COMPLETED"].includes(String(s.campaign_status ?? "").toUpperCase())).map((s: any) => String(s.provider_campaign_id)));
      const list = (data ?? []).filter((m: any) => !paused.has(String(m.provider_campaign_id))).map((m: any) => ({
        business_id: m.business_id, campaign_id: String(m.provider_campaign_id), name: m.provider_campaign_name ?? `Campaign ${m.provider_campaign_id}`, business: m.businesses?.name ?? "",
      }));
      setCamps(list);
      setPick(defaultCampaign && list.some((c) => c.campaign_id === defaultCampaign) ? defaultCampaign : list[list.length - 1]?.campaign_id ?? "");
    })();
  }, [open, defaultCampaign]);

  const camp = camps.find((c) => c.campaign_id === pick);

  useEffect(() => {
    if (!open || !camp || !contactIds.length) return;
    setPreview(null);
    launch({ action: "preview_people", business_id: camp.business_id, campaign_id: camp.campaign_id, contact_ids: contactIds })
      .then(setPreview).catch(() => setPreview({ pending: true }));
  }, [open, camp?.campaign_id, contactIds]);

  async function add() {
    if (!camp) return;
    setBusy(true);
    try {
      const r = await launch({ action: "add_people", business_id: camp.business_id, campaign_id: camp.campaign_id, contact_ids: contactIds });
      setDone(r); onDone();
    } catch (e) { toast.error(`Could not add people: ${(e as Error).message}`); }
    finally { setBusy(false); }
  }

  const blocked = preview && !preview.pending ? Object.values(preview.blockers ?? {}).reduce((a: number, b) => a + Number(b), 0) : 0;

  return (
    <Dialog open={open} onOpenChange={(o) => !busy && onOpenChange(o)}>
      <DialogContent className="theme-light max-w-lg bg-background text-foreground">
        <DialogHeader><DialogTitle>Add {contactIds.length.toLocaleString("en-GB")} people to a campaign</DialogTitle></DialogHeader>
        {done ? (
          <p><strong>{Number(done.pushed ?? 0).toLocaleString("en-GB")}</strong> people added to {camp?.name}. They join where the campaign is now; it is not restarted.{Number(done.remaining) > 0 ? ` ${done.remaining} more are waiting — press Add again.` : ""}</p>
        ) : (
          <div className="space-y-4">
            <Select value={pick} onValueChange={setPick}>
              <SelectTrigger><SelectValue placeholder="Choose a running campaign" /></SelectTrigger>
              <SelectContent>{camps.map((c) => <SelectItem key={c.campaign_id} value={c.campaign_id}>{c.business} — {c.name}</SelectItem>)}</SelectContent>
            </Select>
            {!camps.length && <p className="text-sm text-muted-foreground">No running campaign yet. Start one on Email outreach, then come back.</p>}
            {camp && !preview && <p className="text-sm text-muted-foreground">Checking…</p>}
            {preview && !preview.pending && (
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="rounded-md bg-[hsl(var(--tone-green)/0.12)] p-3"><div className="text-xl font-bold text-[hsl(var(--tone-green))]">{Number(preview.ready_to_add ?? 0).toLocaleString("en-GB")}</div><div className="text-xs text-muted-foreground">Will be added</div></div>
                <div className="rounded-md bg-[hsl(var(--tone-blue)/0.12)] p-3"><div className="text-xl font-bold text-[hsl(var(--tone-blue))]">{Number(preview.already_in_campaign ?? 0).toLocaleString("en-GB")}</div><div className="text-xs text-muted-foreground">Already in it</div></div>
                <div className="rounded-md bg-[hsl(var(--tone-amber)/0.12)] p-3"><div className="text-xl font-bold text-[hsl(var(--tone-amber))]">{(blocked as number).toLocaleString("en-GB")}</div><div className="text-xs text-muted-foreground">Left out by checks</div></div>
              </div>
            )}
            {preview?.pending && <p className="text-sm text-muted-foreground">The final count is worked out when you press Add. People new to this business are checked then.</p>}
          </div>
        )}
        <DialogFooter>
          {done ? <Button onClick={() => onOpenChange(false)}>Close</Button>
            : <Button disabled={!camp || busy || !contactIds.length} onClick={add}>{busy ? "Adding…" : "Add to campaign"}</Button>}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
