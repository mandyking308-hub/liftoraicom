import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CSLayout, CSEmptyState, CSSection } from "./_shared";

export type CSColumn = { key: string; label: string; render?: (v: any, row: any) => any; badge?: boolean };

export default function CSListPage({
  title, subtitle, table, columns, orderBy = "created_at", orderAsc = false, emptyTitle, emptyHint,
}: {
  title: string; subtitle?: string; table: string; columns: CSColumn[];
  orderBy?: string; orderAsc?: boolean; emptyTitle: string; emptyHint?: string;
}) {
  const { data, isLoading } = useQuery({
    queryKey: ["cs-list", table],
    queryFn: async () => {
      const sb: any = supabase;
      const { data, error } = await sb.from(table).select("*").order(orderBy, { ascending: orderAsc }).limit(100);
      if (error) return [];
      return data ?? [];
    },
  });

  return (
    <CSLayout title={title} subtitle={subtitle}>
      <CSSection title={`${data?.length ?? 0} record${(data?.length ?? 0) === 1 ? "" : "s"}`}>
        {isLoading ? (
          <p className="text-xs text-muted-foreground">Loading…</p>
        ) : (data?.length ?? 0) === 0 ? (
          <CSEmptyState title={emptyTitle} hint={emptyHint} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-muted-foreground border-b border-border/50">
                  {columns.map(c => <th key={c.key} className="py-2 px-2 font-medium">{c.label}</th>)}
                </tr>
              </thead>
              <tbody>
                {data!.map((row: any) => (
                  <tr key={row.id} className="border-b border-border/30 hover:bg-background/40">
                    {columns.map(c => {
                      const v = row[c.key];
                      const rendered = c.render ? c.render(v, row) : (v ?? "—");
                      return <td key={c.key} className="py-2 px-2">
                        {c.badge ? <Badge variant="outline" className="text-[10px]">{String(rendered)}</Badge> : rendered}
                      </td>;
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CSSection>
    </CSLayout>
  );
}