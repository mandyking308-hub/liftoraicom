import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { AALayout, AASection, shortId } from "./_shared";
import { fetchModels, type AttributionModel } from "@/lib/attributionEngine";

export default function AASettings() {
  const [models, setModels] = useState<AttributionModel[]>([]);
  useEffect(() => { fetchModels().then(setModels).catch(() => {}); }, []);
  return (
    <AALayout title="Attribution settings" subtitle="Configured attribution models per business. Tracking script changes and exports require approval.">
      <AASection title="Approval-gated actions" description="Reminder: the following are NOT performed by the agent.">
        <ul className="text-xs space-y-1 text-muted-foreground">
          <li>• Installing or changing tracking pixels / scripts</li>
          <li>• Contacting customers from this data</li>
          <li>• Exporting attribution data outside Liftor</li>
        </ul>
      </AASection>
      <AASection title={`Attribution models (${models.length})`} description="Default behaviour when no active model exists is last-touch.">
        {models.length === 0 ? (
          <p className="text-xs text-muted-foreground">No models configured. Last-touch will be applied.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="text-muted-foreground border-b border-border/50">
                <tr>
                  <th className="text-left py-2 pr-3">Name</th>
                  <th className="text-left pr-3">Type</th>
                  <th className="text-left pr-3">Business</th>
                  <th className="text-left">Active</th>
                </tr>
              </thead>
              <tbody>
                {models.map(m => (
                  <tr key={m.id} className="border-b border-border/30 last:border-0">
                    <td className="py-2 pr-3">{m.model_name}</td>
                    <td className="pr-3 text-muted-foreground">{m.model_type}</td>
                    <td className="pr-3 font-mono">{shortId(m.business_id)}</td>
                    <td>
                      <Badge variant="outline" className={`text-[10px] ${m.active ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" : "bg-muted text-muted-foreground border-border/50"}`}>{m.active ? "Active" : "Inactive"}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </AASection>
    </AALayout>
  );
}