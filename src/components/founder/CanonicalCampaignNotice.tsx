import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";

// Setup reads the business's existing approved campaign record instead of
// keeping a second copy of email text. Shows subjects and links to the full emails.
export function useCanonicalCampaign(businessId: string | null | undefined) {
  const [row, setRow] = useState<{ id: string; campaign_name: string; email_sequence: any } | null>(null);
  useEffect(() => {
    if (!businessId) return;
    (async () => {
      const { data } = await (supabase.from("outreach_campaign_drafts" as any) as any)
        .select("id,campaign_name,campaign_key,status,email_sequence")
        .eq("business_id", businessId)
        .not("status", "in", "(archived,inactive,superseded)")
        .order("updated_at", { ascending: false })
        .limit(20);
      const r = ((data as any[]) ?? []).find((d) => d.campaign_key && !String(d.campaign_key).startsWith("setup_tunnel_"));
      setRow(r ?? null);
    })();
  }, [businessId]);
  return row;
}

export default function CanonicalCampaignNotice({ campaign, oldText }: { campaign: { campaign_name: string; email_sequence: any }; oldText: string }) {
  const steps: { step: number; subject: string }[] = campaign.email_sequence?.steps ?? [];
  return (
    <div className="space-y-2 rounded-md border border-border p-3 text-sm" data-testid="setup-canonical-campaign">
      <div className="flex flex-wrap items-center gap-2 font-medium">Current campaign: {campaign.campaign_name} <Badge variant="destructive">DRAFT, NOT SENT</Badge></div>
      <ol className="list-decimal pl-5">{steps.map((s) => <li key={s.step}>{s.subject}</li>)}</ol>
      <Link to="/founder/marketing" className="text-primary hover:underline">Open the full approved emails</Link>
      {oldText && (
        <details className="text-muted-foreground">
          <summary className="cursor-pointer">Old setup email text — superseded/not used</summary>
          <p className="mt-1 text-xs">Kept for the record only. Setup will not import it while the approved campaign exists.</p>
        </details>
      )}
    </div>
  );
}
