import { supabase } from "@/integrations/supabase/client";

export type FxRate = { id: string; currency: string; base_currency: string; rate: number; as_of: string; source: string | null; notes: string | null; created_at: string };
export type FxWarning = { id: string; currency: string; business_id: string | null; missing_rate: boolean; last_seen_at: string | null; notes: string | null; resolved_at: string | null };

export async function fetchFxRates(): Promise<FxRate[]> {
  const { data, error } = await supabase.from("fx_rate_snapshots").select("*").order("as_of", { ascending: false });
  if (error) throw error; return (data ?? []) as FxRate[];
}

export async function upsertFxRate(input: Partial<FxRate>) {
  const payload = { currency: input.currency ?? "USD", base_currency: input.base_currency ?? "GBP", rate: input.rate ?? 1, source: input.source ?? "manual", ...input } as any;
  const { data, error } = await supabase.from("fx_rate_snapshots").insert(payload).select().single();
  if (error) throw error; return data as FxRate;
}

export async function fetchFxWarnings(): Promise<FxWarning[]> {
  const { data, error } = await supabase.from("portfolio_fx_warnings").select("*").is("resolved_at", null);
  if (error) throw error; return (data ?? []) as FxWarning[];
}

export function latestRateFor(rates: FxRate[], currency: string): FxRate | null {
  return rates.find(r => r.currency === currency) ?? null;
}

export type FxRow = { currency: string; native_total: number; gbp_estimate: number | null; has_rate: boolean };

export async function consolidateRevenue(rates: FxRate[]): Promise<FxRow[]> {
  const { data, error } = await supabase.from("qtc_invoices").select("currency, total_amount").not("currency","is",null);
  if (error) return [];
  const byCcy = new Map<string, number>();
  (data ?? []).forEach((r: any) => byCcy.set(r.currency, (byCcy.get(r.currency) ?? 0) + Number(r.total_amount ?? 0)));
  return Array.from(byCcy.entries()).map(([currency, native_total]) => {
    const rate = latestRateFor(rates, currency);
    const has_rate = !!rate || currency === "GBP";
    const gbp_estimate = currency === "GBP" ? native_total : rate ? native_total / Number(rate.rate) : null;
    return { currency, native_total, gbp_estimate, has_rate };
  });
}
