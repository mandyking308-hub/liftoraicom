import { useEffect, useMemo, useState } from "react";
import { IPLayout, IPSection, AssetTypeBadge, RightsStatusBadge, shortId } from "./_shared";
import { Input } from "@/components/ui/input";
import {
  fetchAssets, type DigitalAsset, ASSET_TYPE_META,
} from "@/lib/ipAssetsEngine";

export default function IPCatalogue() {
  const [rows, setRows] = useState<DigitalAsset[]>([]);
  const [q, setQ] = useState("");
  useEffect(() => { fetchAssets().then(setRows).catch(() => {}); }, []);

  const filtered = useMemo(() => {
    const s = q.toLowerCase().trim();
    if (!s) return rows;
    return rows.filter(r =>
      r.asset_name.toLowerCase().includes(s) ||
      (r.creator_summary ?? "").toLowerCase().includes(s) ||
      r.asset_type.includes(s));
  }, [rows, q]);

  return (
    <IPLayout title="Asset Catalogue"
      subtitle="Single inventory of every digital asset across all businesses. Each asset must carry an explicit rights status.">
      <IPSection title={`Assets — ${filtered.length}/${rows.length}`}
        actions={<Input placeholder="Search…" value={q} onChange={e => setQ(e.target.value)} className="h-8 w-48 text-xs" />}>
        <div className="flex flex-wrap gap-1 mb-3">
          {Object.keys(ASSET_TYPE_META).map(t => {
            const c = rows.filter(r => r.asset_type === t).length;
            return c > 0 ? (
              <div key={t} className="flex items-center gap-1 text-xs border border-border/50 rounded px-2 py-0.5">
                <AssetTypeBadge type={t as any} />
                <span className="text-muted-foreground">{c}</span>
              </div>
            ) : null;
          })}
        </div>
        {filtered.length === 0 ? (
          <p className="text-xs text-muted-foreground">No assets catalogued.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="text-[10px] uppercase text-muted-foreground">
                <tr className="border-b border-border/50">
                  <th className="text-left p-2">Asset</th>
                  <th className="text-left p-2">Type</th>
                  <th className="text-left p-2">Business</th>
                  <th className="text-left p-2">Owner</th>
                  <th className="text-left p-2">Creator</th>
                  <th className="text-left p-2">Commercial</th>
                  <th className="text-left p-2">Rights</th>
                  <th className="text-left p-2">Active</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(a => (
                  <tr key={a.id} className="border-b border-border/30">
                    <td className="p-2">
                      <div className="font-medium">{a.asset_name}</div>
                      {a.storage_location_summary && <div className="text-[10px] text-muted-foreground truncate max-w-[260px]">{a.storage_location_summary}</div>}
                    </td>
                    <td className="p-2"><AssetTypeBadge type={a.asset_type} /></td>
                    <td className="p-2 font-mono text-muted-foreground">{shortId(a.business_id)}</td>
                    <td className="p-2 font-mono text-muted-foreground">{shortId(a.owner_entity_id)}</td>
                    <td className="p-2 text-muted-foreground truncate max-w-[180px]">{a.creator_summary ?? "—"}</td>
                    <td className="p-2">{a.commercial_use_allowed == null ? "—" : a.commercial_use_allowed ? "yes" : "no"}</td>
                    <td className="p-2"><RightsStatusBadge status={a.rights_status} /></td>
                    <td className="p-2">{a.active ? "yes" : "no"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </IPSection>
    </IPLayout>
  );
}
