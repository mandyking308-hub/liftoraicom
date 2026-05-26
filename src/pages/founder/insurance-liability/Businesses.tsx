import { useEffect, useState } from "react";
import { InsLayout, InsSection, PolicyTypeBadge, PolicyStatusBadge, shortId } from "./_shared";
import {
  fetchPolicies, fetchGaps, recommendedFor, POLICY_TYPE_META,
  type InsurancePolicy, type InsuranceGap, type PolicyType,
} from "@/lib/insuranceLiabilityEngine";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";

type BizRow = { id: string | null; name: string; archetype: string | null };

export default function InsuranceBusinesses() {
  const [policies, setPolicies] = useState<InsurancePolicy[]>([]);
  const [gaps, setGaps] = useState<InsuranceGap[]>([]);
  const [businesses, setBusinesses] = useState<BizRow[]>([]);

  useEffect(() => {
    fetchPolicies().then(setPolicies).catch(() => {});
    fetchGaps().then(setGaps).catch(() => {});
    (async () => {
      const sb: any = supabase as any;
      try {
        const { data } = await sb.from("businesses").select("id,name,archetype");
        setBusinesses((data ?? []).map((b: any) => ({ id: b.id, name: b.name ?? "—", archetype: b.archetype ?? null })));
      } catch {
        const ids = Array.from(new Set([
          ...policies.map(p => p.business_id),
          ...gaps.map(g => g.business_id),
        ].filter(Boolean) as string[]));
        setBusinesses(ids.map(id => ({ id, name: `Business ${id.slice(0, 6)}`, archetype: null })));
      }
    })();
  }, []);

  const rows = businesses.length > 0 ? businesses : [{ id: null, name: "Unassigned", archetype: null }];

  return (
    <InsLayout title="Insurance matrix by business"
      subtitle="For each business: required cover by archetype, what is in place, what is missing, gaps logged.">
      <InsSection title="Cover matrix" description="Recommended policy types vs current status. Approval required before any external action.">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="text-[10px] uppercase text-muted-foreground border-b border-border/40">
              <tr>
                <th className="text-left p-2">Business</th>
                <th className="text-left p-2">Archetype</th>
                {(Object.keys(POLICY_TYPE_META) as PolicyType[]).map(t => (
                  <th key={t} className="text-left p-2"><PolicyTypeBadge t={t} /></th>
                ))}
                <th className="text-right p-2">Gaps</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(b => {
                const recs = new Set(recommendedFor(b.archetype));
                const bizGaps = gaps.filter(g => g.business_id === b.id && g.status !== "resolved").length;
                return (
                  <tr key={b.id ?? "none"} className="border-b border-border/20 hover:bg-secondary/30">
                    <td className="p-2 font-medium">{b.name}<div className="text-[10px] text-muted-foreground">{shortId(b.id)}</div></td>
                    <td className="p-2 text-muted-foreground">{b.archetype ?? "—"}</td>
                    {(Object.keys(POLICY_TYPE_META) as PolicyType[]).map(t => {
                      const p = policies.find(p => p.business_id === b.id && p.policy_type === t);
                      const required = recs.has(t);
                      if (!p && !required) return <td key={t} className="p-2 text-muted-foreground">—</td>;
                      if (!p && required) return <td key={t} className="p-2"><Badge variant="outline" className="text-[10px] bg-red-500/15 text-red-400 border-red-500/30">Required · missing</Badge></td>;
                      return <td key={t} className="p-2"><PolicyStatusBadge s={p!.policy_status} />{required && <div className="text-[9px] text-muted-foreground mt-0.5">required</div>}</td>;
                    })}
                    <td className="p-2 text-right">{bizGaps > 0 ? <span className="text-yellow-300">{bizGaps}</span> : "0"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </InsSection>
    </InsLayout>
  );
}