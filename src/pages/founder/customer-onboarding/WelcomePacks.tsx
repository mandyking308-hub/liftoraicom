import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { COLayout, COSection, COEmpty } from "./_shared";

export default function CustomerOnboardingWelcomePacks() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    supabase.from("onboarding_records").select("*").order("updated_at", { ascending: false }).limit(200)
      .then(r => {
        const list = (r.data || []).filter((x: any) => x.welcome_pack_prepared || x.portal_invite_prepared);
        setRows(list);
        setLoading(false);
      });
  }, []);

  return (
    <COLayout title="Welcome packs" subtitle="Welcome packs and portal invites prepared internally. Nothing is sent to a customer without founder approval.">
      <COSection title={`Drafts (${rows.length})`}>
        {loading ? <p className="text-xs text-muted-foreground">Loading…</p> :
          rows.length === 0 ? <COEmpty title="No welcome packs or portal invites drafted yet" hint="Drafts are prepared automatically when an onboarding record is created." /> :
          <ul className="text-xs space-y-2">
            {rows.map(r => (
              <li key={r.id} className="border border-border/40 rounded p-2 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono">{r.id.slice(0, 8)}</span>
                  {r.welcome_pack_prepared && (
                    r.welcome_pack_sent
                      ? <Badge variant="outline" className="text-[10px] bg-emerald-500/15 text-emerald-400 border-emerald-500/30">welcome pack sent</Badge>
                      : <Badge variant="outline" className="text-[10px] bg-yellow-500/15 text-yellow-300 border-yellow-500/30">welcome pack · awaiting approval</Badge>
                  )}
                  {r.portal_invite_prepared && (
                    r.portal_invite_sent
                      ? <Badge variant="outline" className="text-[10px] bg-emerald-500/15 text-emerald-400 border-emerald-500/30">portal invite sent</Badge>
                      : <Badge variant="outline" className="text-[10px] bg-yellow-500/15 text-yellow-300 border-yellow-500/30">portal invite · awaiting approval</Badge>
                  )}
                </div>
                {r.first_success_milestone && <p className="text-muted-foreground">First success: {r.first_success_milestone}</p>}
              </li>
            ))}
          </ul>
        }
      </COSection>
    </COLayout>
  );
}