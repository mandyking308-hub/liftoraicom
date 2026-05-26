import { useEffect, useState } from "react";
import { IPLayout, IPSection, RightsStatusBadge, shortId } from "./_shared";
import {
  fetchAssets, fetchRights, RIGHTS_STATUS_META,
  type DigitalAsset, type RightsRecord,
} from "@/lib/ipAssetsEngine";

export default function IPRights() {
  const [assets, setAssets] = useState<DigitalAsset[]>([]);
  const [rights, setRights] = useState<RightsRecord[]>([]);
  useEffect(() => {
    fetchAssets().then(setAssets).catch(() => {});
    fetchRights().then(setRights).catch(() => {});
  }, []);

  const now = Date.now();

  return (
    <IPLayout title="Rights Status Board"
      subtitle="Per-asset rights position with attached evidence records. Expired and unknown statuses block external use.">
      <div className="flex flex-wrap gap-2">
        {Object.keys(RIGHTS_STATUS_META).map(s => {
          const c = assets.filter(a => a.rights_status === s).length;
          return (
            <div key={s} className="border border-border/50 rounded px-2 py-1 text-xs flex items-center gap-2">
              <RightsStatusBadge status={s as any} /><span className="text-muted-foreground">{c}</span>
            </div>
          );
        })}
      </div>

      <IPSection title="Rights records" description={`${rights.length} evidence records linked to assets.`}>
        {rights.length === 0 ? (
          <p className="text-xs text-muted-foreground">No rights evidence records yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="text-[10px] uppercase text-muted-foreground">
                <tr className="border-b border-border/50">
                  <th className="text-left p-2">Asset</th>
                  <th className="text-left p-2">Type</th>
                  <th className="text-left p-2">Summary</th>
                  <th className="text-left p-2">Start</th>
                  <th className="text-left p-2">End</th>
                  <th className="text-left p-2">Restrictions</th>
                  <th className="text-left p-2">Evidence</th>
                </tr>
              </thead>
              <tbody>
                {rights.map(r => {
                  const a = assets.find(x => x.id === r.asset_id);
                  const expired = r.end_date && new Date(r.end_date).getTime() < now;
                  const soon = r.end_date && !expired && new Date(r.end_date).getTime() - now < 30 * 86400_000;
                  return (
                    <tr key={r.id} className="border-b border-border/30">
                      <td className="p-2">{a?.asset_name ?? <span className="font-mono text-muted-foreground">{shortId(r.asset_id)}</span>}</td>
                      <td className="p-2 text-muted-foreground">{r.rights_type}</td>
                      <td className="p-2 max-w-[260px] truncate">{r.rights_summary ?? "—"}</td>
                      <td className="p-2 text-muted-foreground">{r.start_date ?? "—"}</td>
                      <td className={`p-2 ${expired ? "text-destructive" : soon ? "text-yellow-300" : "text-muted-foreground"}`}>{r.end_date ?? "—"}</td>
                      <td className="p-2 text-muted-foreground max-w-[220px] truncate">{r.restrictions ?? "—"}</td>
                      <td className="p-2 text-muted-foreground max-w-[180px] truncate">{r.evidence_source ?? "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </IPSection>
    </IPLayout>
  );
}
