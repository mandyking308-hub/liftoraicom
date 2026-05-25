import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { BCLayout, BCSection, RiskBadge } from "./_shared";
import {
  fetchProfiles, suggestProfile, seedStandardRules, seedStandardTriggers,
  type ComplianceProfile,
} from "@/lib/businessComplianceEngine";
import { supabase } from "@/integrations/supabase/client";

export default function BCBusinesses() {
  const [profiles, setProfiles] = useState<ComplianceProfile[]>([]);
  const [businessId, setBusinessId] = useState("");
  const [archetype, setArchetype] = useState("saas");
  const [busy, setBusy] = useState(false);
  const load = () => fetchProfiles().then(setProfiles).catch(() => {});
  useEffect(load, []);

  async function onSuggest() {
    if (!businessId) { toast.error("business_id required"); return; }
    setBusy(true);
    try {
      const p = await suggestProfile(businessId, archetype);
      toast.success(`Profile suggested (${p.compliance_risk_level}). Founder confirmation required.`);
      load();
    } catch (e: any) { toast.error(e.message ?? "Failed"); }
    finally { setBusy(false); }
  }

  async function onSeedRules(bid: string) {
    setBusy(true);
    try {
      const r = await seedStandardRules(bid);
      toast.success(`Seeded ${r.length} standard rules (live internal).`);
    } catch (e: any) { toast.error(e.message ?? "Failed"); }
    finally { setBusy(false); }
  }
  async function onSeedTriggers(bid: string) {
    setBusy(true);
    try {
      const r = await seedStandardTriggers(bid);
      toast.success(`Seeded ${r.length} approval triggers.`);
    } catch (e: any) { toast.error(e.message ?? "Failed"); }
    finally { setBusy(false); }
  }
  async function onConfirm(bid: string) {
    const { error } = await (supabase as any).from("business_compliance_profiles").update({ founder_confirmed: true }).eq("business_id", bid);
    if (error) toast.error(error.message); else { toast.success("Profile confirmed by founder."); load(); }
  }

  return (
    <BCLayout title="By business" subtitle="Suggest a compliance profile from archetype, then confirm and seed the standard rulebook + triggers. All internal — no external action.">
      <BCSection title="Suggest profile (live internal)">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          <Input placeholder="business_id (uuid)" value={businessId} onChange={e => setBusinessId(e.target.value)} />
          <Input placeholder="archetype_code (saas, marketplace, ecommerce, health, finance, legal, kids, content, course, agency)" value={archetype} onChange={e => setArchetype(e.target.value)} />
          <Button onClick={onSuggest} disabled={busy}>{busy ? "Working…" : "Suggest profile"}</Button>
        </div>
      </BCSection>

      {profiles.length === 0 ? (
        <BCSection title="No profiles yet"><p className="text-xs text-muted-foreground">Suggest one above.</p></BCSection>
      ) : (
        <BCSection title="Profiles" description={`${profiles.length} business${profiles.length === 1 ? "" : "es"}`}>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="text-[10px] uppercase text-muted-foreground border-b border-border/40">
                <tr>
                  <th className="text-left p-2">Business</th>
                  <th className="text-left p-2">Risk</th>
                  <th className="text-left p-2">Sensitive data</th>
                  <th className="text-left p-2">Confirmed</th>
                  <th className="text-left p-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {profiles.map(p => {
                  const tags: string[] = [];
                  if (p.handles_children_data) tags.push("children");
                  if (p.handles_health_data) tags.push("health");
                  if (p.handles_financial_data) tags.push("financial");
                  if (p.handles_legal_sensitive_data) tags.push("legal");
                  if (p.marketplace_liability) tags.push("marketplace");
                  if (p.regulated_activity_possible) tags.push("regulated");
                  return (
                    <tr key={p.id} className="border-b border-border/20">
                      <td className="p-2 font-mono text-[11px]">{p.business_id}</td>
                      <td className="p-2"><RiskBadge level={p.compliance_risk_level} /></td>
                      <td className="p-2 text-muted-foreground">{tags.join(", ") || "—"}</td>
                      <td className="p-2">{p.founder_confirmed ? <span className="text-emerald-400">yes</span> : <span className="text-yellow-300">no</span>}</td>
                      <td className="p-2 space-x-2">
                        {!p.founder_confirmed && <Button size="sm" variant="outline" onClick={() => onConfirm(p.business_id)}>Confirm</Button>}
                        <Button size="sm" variant="outline" onClick={() => onSeedRules(p.business_id)} disabled={busy}>Seed rules</Button>
                        <Button size="sm" variant="outline" onClick={() => onSeedTriggers(p.business_id)} disabled={busy}>Seed triggers</Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </BCSection>
      )}
    </BCLayout>
  );
}