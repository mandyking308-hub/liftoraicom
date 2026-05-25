import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { VNDLayout, VNDSection, VNDStat, VNDEmpty, VND_RISK_TONE } from "./_shared";
import { Badge } from "@/components/ui/badge";
import { computeVendorSnapshot, type VendorSnapshot } from "@/lib/vendorEngine";
import { supabase } from "@/integrations/supabase/client";

export default function VendorsOverview() {
  const [snap, setSnap] = useState<VendorSnapshot | null>(null);
  const [vendors, setVendors] = useState<any[] | null>(null);
  useEffect(() => {
    computeVendorSnapshot().then(setSnap);
    (supabase as any).from("vendors")
      .select("id,vendor_name,vendor_type,risk_level,data_processor,dpa_required,active,contact_email,website")
      .order("vendor_name")
      .limit(100)
      .then(({ data }: any) => setVendors(data ?? []));
  }, []);

  if (!snap) return <VNDLayout title="Overview"><p className="text-xs text-muted-foreground">Calculating vendor estate…</p></VNDLayout>;

  return (
    <VNDLayout title="Overview" subtitle="Track suppliers, SaaS tools, API providers, monthly costs, renewal dates, contracts, access and data processing risk. New subscriptions, cancellations and access grants require founder approval.">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <VNDStat label="Vendors" value={snap.vendors_total} hint={`${snap.vendors_active} active`} />
        <VNDStat label="Active subs" value={snap.subs_active} />
        <VNDStat label="Monthly spend" value={`£${snap.monthly_spend.toFixed(0)}`} hint={`£${snap.annualised_spend.toFixed(0)} annualised`} />
        <VNDStat label="Pending approval" value={snap.subs_pending_approval} tone={snap.subs_pending_approval > 0 ? "warn" : "good"} />
      </div>

      <VNDSection title="Vendor Agent" description="Tracks subscriptions, warns about renewals, finds cost waste, flags data/security risk, prepares cancellation/upgrade recommendations. Never commits spend without approval.">
        <p className="text-sm">{snap.recommended_action}</p>
      </VNDSection>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <VNDStat label="Renewals (30d)" value={snap.renewals_30d} tone={snap.renewals_30d > 0 ? "warn" : "good"} />
        <VNDStat label="Cancel deadlines (30d)" value={snap.cancellation_deadlines_30d} tone={snap.cancellation_deadlines_30d > 0 ? "warn" : "good"} />
        <VNDStat label="Missing DPA" value={snap.vendors_missing_dpa} tone={snap.vendors_missing_dpa > 0 ? "bad" : "good"} />
        <VNDStat label="High-risk vendors" value={snap.high_risk} tone={snap.high_risk > 0 ? "bad" : "good"} />
      </div>

      <VNDSection title="Vendor list">
        {!vendors ? <p className="text-xs text-muted-foreground">Loading…</p>
          : vendors.length === 0 ? <VNDEmpty title="No vendors recorded yet" hint="Add SaaS tools, API providers, suppliers, agencies and advisers here to track cost, renewals and risk." />
          : (
            <div className="space-y-2">
              {vendors.map((v) => (
                <div key={v.id} className="rounded border border-border/40 p-3 text-xs space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{v.vendor_name}</span>
                    <Badge variant="outline">{v.vendor_type}</Badge>
                    {v.risk_level && <Badge variant="outline" className={VND_RISK_TONE[v.risk_level] || ""}>{v.risk_level} risk</Badge>}
                    {!v.active && <Badge variant="outline" className="bg-muted text-muted-foreground">inactive</Badge>}
                    {v.data_processor && <Badge variant="outline" className="bg-purple-500/15 text-purple-400 border-purple-500/30">data processor</Badge>}
                    {v.dpa_required && <Badge variant="outline" className="bg-yellow-500/15 text-yellow-300 border-yellow-500/30">DPA required</Badge>}
                  </div>
                  {(v.website || v.contact_email) && (
                    <p className="text-muted-foreground">{v.website}{v.contact_email ? ` · ${v.contact_email}` : ""}</p>
                  )}
                </div>
              ))}
            </div>
          )}
      </VNDSection>

      <VNDSection title="Jump in">
        <div className="flex flex-wrap gap-2 text-xs">
          {[
            ["SaaS", "/founder/vendors/saas"],
            ["Contracts", "/founder/vendors/contracts"],
            ["Costs", "/founder/vendors/costs"],
            ["Renewals", "/founder/vendors/renewals"],
            ["Access", "/founder/vendors/access"],
            ["Risk", "/founder/vendors/risk"],
          ].map(([l, to]) => (
            <Link key={to} to={to} className="px-2 py-1 rounded border border-border/50 hover:border-primary/60 hover:bg-primary/5">{l}</Link>
          ))}
        </div>
      </VNDSection>
    </VNDLayout>
  );
}