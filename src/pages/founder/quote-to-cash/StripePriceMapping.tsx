import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { QTCLayout, QTCSection, QTCEmpty } from "./_shared";

type Row = {
  id: string;
  name: string;
  stripe_product_id: string | null;
  stripe_price_id: string | null;
  stripe_price_recurrence: string | null;
};

const RECURRENCE = ["monthly", "annual", "one_off", "unknown"];

export default function StripePriceMapping() {
  const [offers, setOffers] = useState<Row[]>([]);
  const [products, setProducts] = useState<Row[]>([]);
  const load = async () => {
    const [{ data: o }, { data: p }] = await Promise.all([
      supabase.from("customer_sales_offers").select("id, offer_name, stripe_product_id, stripe_price_id, stripe_price_recurrence").order("offer_name"),
      supabase.from("customer_sales_products").select("id, product_name, stripe_product_id, stripe_price_id, stripe_price_recurrence").order("product_name"),
    ]);
    setOffers((o || []).map((r: any) => ({ ...r, name: r.offer_name })));
    setProducts((p || []).map((r: any) => ({ ...r, name: r.product_name })));
  };
  useEffect(() => { load(); }, []);

  return (
    <QTCLayout
      title="Stripe price mapping"
      subtitle="Attach Stripe product/price IDs to each offer and product. Use Stripe TEST mode IDs (price_test_…). Live mode is locked."
    >
      <PriceTable title="Offers" table="customer_sales_offers" rows={offers} onSaved={load} />
      <PriceTable title="Products" table="customer_sales_products" rows={products} onSaved={load} />
    </QTCLayout>
  );
}

function PriceTable({ title, table, rows, onSaved }: { title: string; table: string; rows: Row[]; onSaved: () => void }) {
  return (
    <QTCSection title={`${title} (${rows.length})`}>
      {rows.length === 0 ? <QTCEmpty title={`No ${title.toLowerCase()} yet`} /> : (
        <div className="space-y-2">
          {rows.map(r => <Editor key={r.id} table={table} row={r} onSaved={onSaved} />)}
        </div>
      )}
    </QTCSection>
  );
}

function Editor({ table, row, onSaved }: { table: string; row: Row; onSaved: () => void }) {
  const [product, setProduct] = useState(row.stripe_product_id ?? "");
  const [price, setPrice] = useState(row.stripe_price_id ?? "");
  const [rec, setRec] = useState(row.stripe_price_recurrence ?? "unknown");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    const { error } = await (supabase.from(table as any) as any)
      .update({ stripe_product_id: product || null, stripe_price_id: price || null, stripe_price_recurrence: rec })
      .eq("id", row.id);
    setSaving(false);
    if (error) toast.error(error.message);
    else { toast.success("Saved"); onSaved(); }
  };

  return (
    <div className="p-3 rounded border border-border/50 text-xs space-y-2">
      <div className="flex items-center justify-between gap-2">
        <p className="font-medium">{row.name || row.id.slice(0,8)}</p>
        <div className="flex gap-1">
          {row.stripe_price_id
            ? <Badge variant="outline" className="text-[10px] bg-blue-500/15 text-blue-400 border-blue-500/30">{rec}</Badge>
            : <Badge variant="outline" className="text-[10px] bg-muted text-muted-foreground">no price</Badge>}
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
        <Input placeholder="prod_…" value={product} onChange={e => setProduct(e.target.value)} className="text-xs h-8" />
        <Input placeholder="price_…" value={price} onChange={e => setPrice(e.target.value)} className="text-xs h-8" />
        <Select value={rec} onValueChange={setRec}>
          <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>{RECURRENCE.map(x => <SelectItem key={x} value={x}>{x}</SelectItem>)}</SelectContent>
        </Select>
        <Button size="sm" disabled={saving} onClick={save}>Save</Button>
      </div>
    </div>
  );
}
