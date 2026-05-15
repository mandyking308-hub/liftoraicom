import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Compass, RefreshCcw, Route } from "lucide-react";

type Policy = {
  id: string;
  business_id: string | null;
  policy_key: string;
  communication_type: string;
  recommended_channel: string;
  provider_type: string | null;
  native_allowed: boolean;
  smartlead_allowed: boolean;
  requires_founder_approval: boolean;
  auto_send_allowed: boolean;
  scale_allowed: boolean;
  notes: string | null;
};

const lanePill = (p: Policy) => {
  if (p.recommended_channel === "smartlead")
    return { cls: "border-primary/40 bg-primary/10 text-primary", label: "Smartlead Scale" };
  if (p.recommended_channel === "native_manual")
    return { cls: "border-amber-500/40 bg-amber-500/10 text-amber-300", label: "Native (manual)" };
  if (p.recommended_channel === "liftor_conversation")
    return { cls: "border-emerald-500/40 bg-emerald-500/10 text-emerald-300", label: "Liftor Conversation" };
  return { cls: "border-amber-500/40 bg-amber-500/10 text-amber-300", label: "Native IONOS" };
};

const Yes = ({ v, good = true }: { v: boolean; good?: boolean }) => (
  <Badge
    variant="outline"
    className={`text-[10px] ${
      v
        ? good
          ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
          : "border-amber-500/40 bg-amber-500/10 text-amber-300"
        : good
          ? "border-border/60 bg-muted/30 text-muted-foreground"
          : "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
    }`}
  >
    {v ? "yes" : "no"}
  </Badge>
);

const TEST_TYPES = [
  "cold_outreach",
  "reply_after_interest",
  "proposal_send",
  "invoice_chaser",
  "supplier_message",
  "existing_customer_email",
];

export default function OutboundChannelPolicyPanel() {
  const [policies, setPolicies] = useState<Policy[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [previews, setPreviews] = useState<Record<string, any>>({});
  const [previewing, setPreviewing] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { data } = await (supabase as any)
      .from("outbound_channel_policies")
      .select("*")
      .is("business_id", null)
      .order("communication_type");
    setPolicies((data ?? []) as Policy[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const runPreview = async (type: string) => {
    setPreviewing(type);
    const { data, error } = await supabase.functions.invoke(
      "outbound-channel-route-preview",
      { body: { communication_type: type } },
    );
    setPreviews((p) => ({ ...p, [type]: error ? { ok: false, error: error.message } : data }));
    setPreviewing(null);
  };

  const sorted = useMemo(() => policies ?? [], [policies]);

  return (
    <Card
      id="outbound-channel-policy-panel"
      className="p-5 space-y-4 border-2 border-border/60 scroll-mt-24"
    >
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <Compass className="h-4 w-4 text-primary" />
          <h3 className="text-base font-semibold">Outbound Channel Policy</h3>
          <Badge variant="outline" className="text-[10px]">read-only</Badge>
        </div>
        <Button size="sm" variant="outline" onClick={load} disabled={loading}>
          <RefreshCcw className={`h-3 w-3 mr-1 ${loading ? "animate-spin" : ""}`} />
          {loading ? "Loading…" : "Refresh"}
        </Button>
      </div>

      <p className="text-[11px] text-muted-foreground">
        Outbound routing is split: <span className="text-primary">Smartlead</span> handles
        cold scale outreach; <span className="text-amber-300">Liftor native / IONOS</span>{" "}
        handles controlled customer, proposal, finance and supplier emails. All defaults
        require founder approval; auto-send is off everywhere.
      </p>

      <div className="overflow-x-auto rounded-md border border-border/60">
        <table className="w-full text-[11px]">
          <thead className="bg-muted/40 text-muted-foreground">
            <tr>
              <th className="text-left p-2">Communication type</th>
              <th className="text-left p-2">Recommended lane</th>
              <th className="text-left p-2">Provider</th>
              <th className="text-center p-2">Founder approval</th>
              <th className="text-center p-2">Auto-send</th>
              <th className="text-center p-2">Scale</th>
              <th className="text-left p-2">Notes</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((p) => {
              const lane = lanePill(p);
              return (
                <tr key={p.id} className="border-t border-border/40 align-top">
                  <td className="p-2 font-mono">{p.communication_type}</td>
                  <td className="p-2">
                    <Badge variant="outline" className={`text-[10px] ${lane.cls}`}>{lane.label}</Badge>
                  </td>
                  <td className="p-2 font-mono text-foreground/80">{p.provider_type ?? "—"}</td>
                  <td className="p-2 text-center"><Yes v={p.requires_founder_approval} good /></td>
                  <td className="p-2 text-center"><Yes v={p.auto_send_allowed} good={false} /></td>
                  <td className="p-2 text-center"><Yes v={p.scale_allowed} good={false} /></td>
                  <td className="p-2 text-muted-foreground max-w-xs">{p.notes ?? "—"}</td>
                </tr>
              );
            })}
            {sorted.length === 0 && !loading && (
              <tr><td colSpan={7} className="p-3 text-center text-muted-foreground">No policies defined.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Route className="h-3.5 w-3.5 text-primary" />
          <h4 className="text-sm font-semibold">Router preview</h4>
          <Badge variant="outline" className="text-[10px]">no send</Badge>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {TEST_TYPES.map((t) => (
            <Button
              key={t}
              size="sm"
              variant="outline"
              disabled={previewing === t}
              onClick={() => runPreview(t)}
            >
              {previewing === t ? "Previewing…" : t}
            </Button>
          ))}
        </div>
        {Object.entries(previews).length > 0 && (
          <div className="grid sm:grid-cols-2 gap-2 mt-2">
            {Object.entries(previews).map(([k, r]) => (
              <div key={k} className="rounded border border-border/60 p-2 text-[11px] space-y-1">
                <div className="font-mono">{k}</div>
                {r?.ok === false ? (
                  <div className="text-rose-300">Error: {r.error ?? "unknown"}</div>
                ) : (
                  <>
                    <div>
                      Lane:{" "}
                      <span className="font-mono text-foreground">
                        {r.recommended_channel ?? "—"}
                      </span>{" "}
                      / provider:{" "}
                      <span className="font-mono text-foreground">{r.provider_type ?? "—"}</span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      <Badge variant="outline" className="text-[10px]">smartlead_allowed: {String(r.smartlead_allowed)}</Badge>
                      <Badge variant="outline" className="text-[10px]">native_allowed: {String(r.native_allowed)}</Badge>
                      <Badge variant="outline" className="text-[10px]">founder_approval: {String(r.requires_founder_approval)}</Badge>
                      <Badge variant="outline" className="text-[10px]">auto_send: {String(r.auto_send_allowed)}</Badge>
                    </div>
                    {r.blockers?.length > 0 && (
                      <div className="text-amber-200">
                        blockers: <span className="font-mono">{r.blockers.join(", ")}</span>
                      </div>
                    )}
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <p className="text-[10px] text-muted-foreground">
        Read-only preview. No emails sent. No Smartlead writes. No Apollo calls. No DB mutations.
      </p>
    </Card>
  );
}
