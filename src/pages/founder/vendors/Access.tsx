import { useEffect, useState } from "react";
import { VNDLayout, VNDSection, VNDEmpty, VND_ACCESS_TONE } from "./_shared";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";

export default function VendorsAccess() {
  const [rows, setRows] = useState<any[] | null>(null);
  useEffect(() => {
    (supabase as any).from("vendor_access_records")
      .select("id,vendor_id,user_or_agent,access_level,access_status,granted_at,expires_at,revoked_at,notes,created_at")
      .order("created_at", { ascending: false })
      .limit(200)
      .then(({ data }: any) => setRows(data ?? []));
  }, []);

  return (
    <VNDLayout title="Access records" subtitle="Who (user or agent) has access to which vendor, at what level, until when. Grants require founder approval. Revocation is recorded immediately.">
      <VNDSection title="Access requests & active grants">
        {!rows ? <p className="text-xs text-muted-foreground">Loading…</p>
          : rows.length === 0 ? <VNDEmpty title="No access records yet" hint="Track every login and API access grant here — never share credentials outside this register." />
          : (
            <div className="space-y-2">
              {rows.map((r) => (
                <div key={r.id} className="rounded border border-border/40 p-3 text-xs space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline" className={VND_ACCESS_TONE[r.access_status] || ""}>{r.access_status}</Badge>
                    <span className="font-medium">{r.user_or_agent}</span>
                    {r.access_level && <Badge variant="outline">{r.access_level}</Badge>}
                  </div>
                  {r.notes && <p className="text-muted-foreground">{r.notes}</p>}
                  <p className="text-[10px] text-muted-foreground">
                    Vendor {r.vendor_id?.slice(0,8)}
                    {r.granted_at ? ` · granted ${new Date(r.granted_at).toLocaleString()}` : ""}
                    {r.expires_at ? ` · expires ${new Date(r.expires_at).toLocaleString()}` : ""}
                    {r.revoked_at ? ` · revoked ${new Date(r.revoked_at).toLocaleString()}` : ""}
                  </p>
                </div>
              ))}
            </div>
          )}
      </VNDSection>
    </VNDLayout>
  );
}