import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { CGLayout, CGSection } from "./_shared";
import { fetchProfiles, upsertProfile, type ContextProfile } from "@/lib/contextGuardEngine";

export default function CGSettings() {
  const [profiles, setProfiles] = useState<ContextProfile[]>([]);
  const [f, setF] = useState<Partial<ContextProfile>>({});
  const [busy, setBusy] = useState(false);
  const load = () => { fetchProfiles().then(setProfiles).catch(() => {}); };
  useEffect(load, []);

  async function onSave() {
    if (!f.business_id) { toast.error("business_id required"); return; }
    setBusy(true);
    try {
      await upsertProfile({
        business_id: f.business_id!,
        brand_voice_summary: f.brand_voice_summary ?? null,
        legal_entity_id: f.legal_entity_id ?? null,
        primary_domain: f.primary_domain ?? null,
        support_email: f.support_email ?? null,
        sales_email: f.sales_email ?? null,
        default_currency: f.default_currency ?? null,
        default_market: f.default_market ?? null,
        compliance_profile_id: f.compliance_profile_id ?? null,
        approved_context_source_id: f.approved_context_source_id ?? null,
      });
      toast.success("Context profile saved (live internal).");
      setF({});
      load();
    } catch (e: any) { toast.error(e.message ?? "Failed"); }
    finally { setBusy(false); }
  }

  return (
    <CGLayout title="Settings" subtitle="Per-business context profiles consumed by AI Gateway, Brain/Copilot, CRM, Customer Sales, Outreach, Social, Quote-to-Cash and Manuals. Internal configuration only.">
      <CGSection title="Create / update business context profile">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          <Input placeholder="business_id (uuid)" value={f.business_id ?? ""} onChange={e => setF({ ...f, business_id: e.target.value })} />
          <Input placeholder="primary_domain" value={f.primary_domain ?? ""} onChange={e => setF({ ...f, primary_domain: e.target.value })} />
          <Input placeholder="default_currency (GBP, USD, AED)" value={f.default_currency ?? ""} onChange={e => setF({ ...f, default_currency: e.target.value })} />
          <Input placeholder="default_market (UK, US, AE)" value={f.default_market ?? ""} onChange={e => setF({ ...f, default_market: e.target.value })} />
          <Input placeholder="support_email" value={f.support_email ?? ""} onChange={e => setF({ ...f, support_email: e.target.value })} />
          <Input placeholder="sales_email" value={f.sales_email ?? ""} onChange={e => setF({ ...f, sales_email: e.target.value })} />
          <Input placeholder="legal_entity_id (uuid)" value={f.legal_entity_id ?? ""} onChange={e => setF({ ...f, legal_entity_id: e.target.value })} />
          <Input placeholder="compliance_profile_id (uuid)" value={f.compliance_profile_id ?? ""} onChange={e => setF({ ...f, compliance_profile_id: e.target.value })} />
          <Input placeholder="brand_voice_summary" value={f.brand_voice_summary ?? ""} onChange={e => setF({ ...f, brand_voice_summary: e.target.value })} />
          <div className="md:col-span-3">
            <Button onClick={onSave} disabled={busy}>{busy ? "Saving…" : "Save profile"}</Button>
          </div>
        </div>
      </CGSection>

      <CGSection title="Existing profiles" description={`${profiles.length} business${profiles.length === 1 ? "" : "es"}`}>
        {profiles.length === 0 ? (
          <p className="text-xs text-muted-foreground">No profiles yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="text-[10px] uppercase text-muted-foreground border-b border-border/40">
                <tr>
                  <th className="text-left p-2">Business</th>
                  <th className="text-left p-2">Domain</th>
                  <th className="text-left p-2">Market</th>
                  <th className="text-left p-2">Currency</th>
                  <th className="text-left p-2">Legal entity</th>
                  <th className="text-left p-2">Compliance</th>
                </tr>
              </thead>
              <tbody>
                {profiles.map(p => (
                  <tr key={p.id} className="border-b border-border/20">
                    <td className="p-2 font-mono text-[10px]">{p.business_id}</td>
                    <td className="p-2">{p.primary_domain ?? "—"}</td>
                    <td className="p-2">{p.default_market ?? "—"}</td>
                    <td className="p-2">{p.default_currency ?? "—"}</td>
                    <td className="p-2 font-mono text-[10px]">{p.legal_entity_id?.slice(0,8) ?? "—"}</td>
                    <td className="p-2 font-mono text-[10px]">{p.compliance_profile_id?.slice(0,8) ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CGSection>

      <CGSection title="What this module never does">
        <ul className="text-xs text-muted-foreground list-disc pl-5 space-y-1">
          <li>Take external action automatically.</li>
          <li>Allow cross-business context in outbound sends, voice or social posts.</li>
          <li>Replace founder review for blocked or approval-required items.</li>
        </ul>
      </CGSection>
    </CGLayout>
  );
}