import { useEffect, useState } from "react";
import { PRLayout, PRSection, PREmpty, PR_DSAR_TONE, NoAutoActionsBanner } from "./_shared";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";

export default function PrivacyDSAR() {
  const [rows, setRows] = useState<any[] | null>(null);
  useEffect(() => {
    (supabase as any).from("privacy_requests").select("*").order("due_date", { ascending: true, nullsFirst: false }).limit(300)
      .then(({ data }: any) => setRows(data ?? []));
  }, []);
  const now = Date.now();

  return (
    <PRLayout title="DSAR Queue" subtitle="Access, deletion, correction, portability, objection, restriction, unsubscribe and consent-withdrawal requests. Identity must be verified before any action. Every export, deletion or response requires founder approval.">
      <NoAutoActionsBanner />
      <PRSection title="Requests">
        {!rows ? <p className="text-xs text-muted-foreground">Loading…</p>
          : rows.length === 0 ? <PREmpty title="No DSARs in the queue" hint="The Privacy Agent will draft a checklist and response whenever a request arrives." />
          : (
            <div className="space-y-2">
              {rows.map((r) => {
                const overdue = r.due_date && new Date(r.due_date).getTime() < now && !["completed", "rejected"].includes(r.request_status);
                return (
                  <div key={r.id} className="rounded border border-border/40 p-3 text-xs space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline">{r.request_type}</Badge>
                      <Badge variant="outline" className={PR_DSAR_TONE[r.request_status] || ""}>{r.request_status}</Badge>
                      {r.identity_verified
                        ? <Badge variant="outline" className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30">identity verified</Badge>
                        : <Badge variant="outline" className="bg-yellow-500/15 text-yellow-300 border-yellow-500/30">identity unverified</Badge>}
                      {r.founder_approval_required && <Badge variant="outline" className="bg-yellow-500/15 text-yellow-300 border-yellow-500/30">founder approval</Badge>}
                      {overdue && <Badge variant="outline" className="bg-red-500/15 text-red-400 border-red-500/30">overdue</Badge>}
                    </div>
                    <p className="text-muted-foreground">
                      Due: {r.due_date ? new Date(r.due_date).toLocaleDateString() : "—"}
                      {r.completed_at ? ` · Completed ${new Date(r.completed_at).toLocaleDateString()}` : ""}
                    </p>
                    {r.response_summary && <p className="text-muted-foreground"><span className="text-foreground">Draft response: </span>{r.response_summary}</p>}
                  </div>
                );
              })}
            </div>
          )}
      </PRSection>
    </PRLayout>
  );
}