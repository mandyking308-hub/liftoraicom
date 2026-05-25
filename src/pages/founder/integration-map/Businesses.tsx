import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { IMLayout, IMSection, StatusBadge, RiskBadge } from "./_shared";
import {
  fetchCatalog, fetchRequirements, fetchConnections, generateRequirementsForBusiness,
  type CatalogRow, type RequirementRow, type ConnectionStatusRow,
} from "@/lib/integrationMapEngine";

export default function IMBusinesses() {
  const [catalog, setCatalog] = useState<CatalogRow[]>([]);
  const [reqs, setReqs] = useState<RequirementRow[]>([]);
  const [conns, setConns] = useState<ConnectionStatusRow[]>([]);
  const [businessId, setBusinessId] = useState("");
  const [archetype, setArchetype] = useState("saas");
  const [busy, setBusy] = useState(false);

  const load = () => {
    fetchCatalog().then(setCatalog).catch(() => {});
    fetchRequirements().then(setReqs).catch(() => {});
    fetchConnections().then(setConns).catch(() => {});
  };
  useEffect(load, []);

  const grouped = useMemo(() => {
    const m: Record<string, RequirementRow[]> = {};
    for (const r of reqs) (m[r.business_id] ||= []).push(r);
    return m;
  }, [reqs]);
  const cMap = new Map(catalog.map(c => [c.id, c]));
  const connMap = new Map(conns.map(c => [`${c.business_id}:${c.integration_id}`, c]));

  async function onGenerate() {
    if (!businessId) { toast.error("business_id required"); return; }
    setBusy(true);
    try {
      const out = await generateRequirementsForBusiness({ business_id: businessId, archetype_code: archetype });
      toast.success(`Mapped ${out.length} integrations for archetype "${archetype}" (live internal). No provider activated.`);
      load();
    } catch (e: any) { toast.error(e.message ?? "Failed"); }
    finally { setBusy(false); }
  }

  return (
    <IMLayout title="By business" subtitle="Per-business integration requirements derived from archetype. Generating requirements runs live internally — no provider is activated.">
      <IMSection title="Generate requirements (live internal — no provider activation)">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          <Input placeholder="business_id (uuid)" value={businessId} onChange={e => setBusinessId(e.target.value)} />
          <Input placeholder="archetype_code (saas, marketplace, ecommerce, agency, content)" value={archetype} onChange={e => setArchetype(e.target.value)} />
          <Button onClick={onGenerate} disabled={busy}>{busy ? "Mapping…" : "Map integrations"}</Button>
        </div>
      </IMSection>

      {Object.keys(grouped).length === 0 ? (
        <IMSection title="No mapped businesses yet"><p className="text-xs text-muted-foreground">Generate requirements above to see the map per business.</p></IMSection>
      ) : Object.entries(grouped).map(([bid, list]) => (
        <IMSection key={bid} title={bid} description={`${list.length} integrations mapped`}>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="text-[10px] uppercase text-muted-foreground border-b border-border/40">
                <tr>
                  <th className="text-left p-2">Provider</th>
                  <th className="text-left p-2">Type</th>
                  <th className="text-left p-2">Requirement</th>
                  <th className="text-left p-2">Connection</th>
                  <th className="text-left p-2">Risk</th>
                  <th className="text-left p-2">Priority</th>
                  <th className="text-left p-2">Required before live</th>
                  <th className="text-left p-2">Reason</th>
                </tr>
              </thead>
              <tbody>
                {list.map(r => {
                  const c = cMap.get(r.integration_id);
                  const conn = connMap.get(`${bid}:${r.integration_id}`);
                  return (
                    <tr key={r.id} className="border-b border-border/20">
                      <td className="p-2 font-medium">{c?.provider_name ?? "—"}</td>
                      <td className="p-2 text-muted-foreground">{c?.provider_type ?? "—"}</td>
                      <td className="p-2"><StatusBadge status={r.requirement_status} /></td>
                      <td className="p-2"><StatusBadge status={conn?.provider_status ?? "not_connected"} /></td>
                      <td className="p-2">{c && <RiskBadge level={c.external_action_risk_level} />}</td>
                      <td className="p-2">{r.priority}</td>
                      <td className="p-2">{r.required_before_external_live ? "yes" : "no"}</td>
                      <td className="p-2 text-muted-foreground">{r.reason}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="text-[11px] text-muted-foreground mt-2 flex gap-3 flex-wrap">
            <Link to="/founder/access-governance" className="text-primary hover:underline">Manage credentials →</Link>
            <Link to="/founder/command-centre" className="text-primary hover:underline">Approval queue →</Link>
            <Link to="/founder/vendors" className="text-primary hover:underline">Vendors →</Link>
          </div>
        </IMSection>
      ))}
    </IMLayout>
  );
}