import { supabase } from "@/integrations/supabase/client";

export type ProductType = "physical"|"digital"|"bundle"|"preorder"|"custom";
export type InventoryStatus = "in_stock"|"low_stock"|"out_of_stock"|"preorder"|"unknown";
export type OrderStatus = "draft"|"paid"|"fulfilment_pending"|"fulfilled"|"shipped"|"delivered"|"returned"|"cancelled"|"refunded";
export type ItemFulfilmentStatus = "pending"|"allocated"|"packed"|"shipped"|"delivered"|"returned"|"cancelled";
export type ShipmentStatus = "draft"|"label_required"|"approval_required"|"shipped"|"in_transit"|"delivered"|"failed"|"returned";
export type ReturnStatus = "requested"|"reviewing"|"approval_required"|"approved"|"rejected"|"received"|"refunded"|"closed";
export type SupplierType = "manufacturer"|"wholesaler"|"dropshipper"|"print_on_demand"|"fulfilment"|"other";

export interface EcommerceProduct {
  id: string; business_id: string|null; product_id: string|null;
  sku: string; product_name: string; product_type: ProductType;
  supplier_id: string|null; stock_tracking_enabled: boolean; active: boolean;
  created_at: string; updated_at: string; audit_metadata: any;
}
export interface InventoryRecord {
  id: string; business_id: string|null; ecommerce_product_id: string;
  location_name: string; stock_on_hand: number; stock_reserved: number;
  stock_available: number; reorder_point: number; reorder_quantity: number;
  inventory_status: InventoryStatus; updated_at: string; audit_metadata: any;
}
export interface EcommerceOrder {
  id: string; business_id: string|null; customer_id: string|null; contact_id: string|null;
  qtc_payment_id: string|null; order_number: string; order_status: OrderStatus;
  total_amount: number; currency: string; shipping_required: boolean;
  created_at: string; updated_at: string; audit_metadata: any;
}
export interface EcommerceOrderItem {
  id: string; business_id: string|null; order_id: string; ecommerce_product_id: string;
  quantity: number; unit_price: number; currency: string; fulfilment_status: ItemFulfilmentStatus;
  created_at: string; updated_at: string;
}
export interface FulfilmentShipment {
  id: string; business_id: string|null; order_id: string;
  carrier: string|null; tracking_number: string|null; shipment_status: ShipmentStatus;
  shipped_at: string|null; delivered_at: string|null; created_at: string; updated_at: string; audit_metadata: any;
}
export interface ReturnRequest {
  id: string; business_id: string|null; order_id: string; customer_id: string|null;
  return_reason: string|null; return_status: ReturnStatus; refund_required: boolean;
  created_at: string; updated_at: string; audit_metadata: any;
}
export interface EcommerceSupplier {
  id: string; business_id: string|null; supplier_name: string; supplier_type: SupplierType;
  contact_email: string|null; lead_time_days: number; risk_level: string; active: boolean;
  created_at: string; updated_at: string;
}

export const INV_STATUS_META: Record<InventoryStatus, { label: string; cls: string }> = {
  in_stock:     { label: "In stock",     cls: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" },
  low_stock:    { label: "Low stock",    cls: "bg-yellow-500/15 text-yellow-300 border-yellow-500/30" },
  out_of_stock: { label: "Out of stock", cls: "bg-red-500/15 text-red-300 border-red-500/30" },
  preorder:     { label: "Preorder",     cls: "bg-blue-500/15 text-blue-300 border-blue-500/30" },
  unknown:      { label: "Unknown",      cls: "bg-muted text-muted-foreground border-border/50" },
};

export const ORDER_STATUS_META: Record<OrderStatus, { label: string; cls: string }> = {
  draft:              { label: "Draft",              cls: "bg-muted text-muted-foreground border-border/50" },
  paid:               { label: "Paid",               cls: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" },
  fulfilment_pending: { label: "Fulfilment pending", cls: "bg-yellow-500/15 text-yellow-300 border-yellow-500/30" },
  fulfilled:          { label: "Fulfilled",          cls: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" },
  shipped:            { label: "Shipped",            cls: "bg-blue-500/15 text-blue-300 border-blue-500/30" },
  delivered:          { label: "Delivered",          cls: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" },
  returned:           { label: "Returned",           cls: "bg-orange-500/15 text-orange-300 border-orange-500/30" },
  cancelled:          { label: "Cancelled",          cls: "bg-muted text-muted-foreground border-border/50" },
  refunded:           { label: "Refunded",           cls: "bg-red-500/15 text-red-300 border-red-500/30" },
};

export const SHIPMENT_STATUS_META: Record<ShipmentStatus, { label: string; cls: string }> = {
  draft:             { label: "Draft",             cls: "bg-muted text-muted-foreground border-border/50" },
  label_required:    { label: "Label required",    cls: "bg-yellow-500/15 text-yellow-300 border-yellow-500/30" },
  approval_required: { label: "Approval required", cls: "bg-orange-500/15 text-orange-300 border-orange-500/30" },
  shipped:           { label: "Shipped",           cls: "bg-blue-500/15 text-blue-300 border-blue-500/30" },
  in_transit:        { label: "In transit",        cls: "bg-blue-500/15 text-blue-300 border-blue-500/30" },
  delivered:         { label: "Delivered",         cls: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" },
  failed:            { label: "Failed",            cls: "bg-red-500/15 text-red-300 border-red-500/30" },
  returned:          { label: "Returned",          cls: "bg-orange-500/15 text-orange-300 border-orange-500/30" },
};

export const RETURN_STATUS_META: Record<ReturnStatus, { label: string; cls: string }> = {
  requested:         { label: "Requested",         cls: "bg-yellow-500/15 text-yellow-300 border-yellow-500/30" },
  reviewing:         { label: "Reviewing",         cls: "bg-blue-500/15 text-blue-300 border-blue-500/30" },
  approval_required: { label: "Approval required", cls: "bg-orange-500/15 text-orange-300 border-orange-500/30" },
  approved:          { label: "Approved",          cls: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" },
  rejected:          { label: "Rejected",          cls: "bg-muted text-muted-foreground border-border/50" },
  received:          { label: "Received",          cls: "bg-blue-500/15 text-blue-300 border-blue-500/30" },
  refunded:          { label: "Refunded",          cls: "bg-red-500/15 text-red-300 border-red-500/30" },
  closed:            { label: "Closed",            cls: "bg-muted text-muted-foreground border-border/50" },
};

export async function fetchProducts(): Promise<EcommerceProduct[]> {
  const { data } = await (supabase as any).from("ecommerce_products").select("*").order("created_at", { ascending: false });
  return (data ?? []) as EcommerceProduct[];
}
export async function fetchInventory(): Promise<InventoryRecord[]> {
  const { data } = await (supabase as any).from("inventory_records").select("*").order("updated_at", { ascending: false });
  return (data ?? []) as InventoryRecord[];
}
export async function fetchOrders(): Promise<EcommerceOrder[]> {
  const { data } = await (supabase as any).from("ecommerce_orders").select("*").order("created_at", { ascending: false });
  return (data ?? []) as EcommerceOrder[];
}
export async function fetchOrderItems(): Promise<EcommerceOrderItem[]> {
  const { data } = await (supabase as any).from("ecommerce_order_items").select("*").order("created_at", { ascending: false });
  return (data ?? []) as EcommerceOrderItem[];
}
export async function fetchShipments(): Promise<FulfilmentShipment[]> {
  const { data } = await (supabase as any).from("fulfilment_shipments").select("*").order("created_at", { ascending: false });
  return (data ?? []) as FulfilmentShipment[];
}
export async function fetchReturns(): Promise<ReturnRequest[]> {
  const { data } = await (supabase as any).from("return_requests").select("*").order("created_at", { ascending: false });
  return (data ?? []) as ReturnRequest[];
}
export async function fetchSuppliers(): Promise<EcommerceSupplier[]> {
  const { data } = await (supabase as any).from("ecommerce_suppliers").select("*").order("created_at", { ascending: false });
  return (data ?? []) as EcommerceSupplier[];
}

export interface EcommerceSummary {
  product_count: number;
  active_skus: number;
  inventory_rows: number;
  low_stock: number;
  out_of_stock: number;
  orders_total: number;
  orders_pending: number;
  shipments_awaiting_approval: number;
  returns_open: number;
  returns_awaiting_approval: number;
  suppliers: number;
  reorder_recommendations: number;
  test_records: number;
  top_alert: { kind: string; summary: string; severity: "low"|"medium"|"high"|"critical" } | null;
}

export function summarize(
  products: EcommerceProduct[],
  inventory: InventoryRecord[],
  orders: EcommerceOrder[],
  shipments: FulfilmentShipment[],
  returns: ReturnRequest[],
  suppliers: EcommerceSupplier[],
): EcommerceSummary {
  const low = inventory.filter(i => i.inventory_status === "low_stock").length;
  const out = inventory.filter(i => i.inventory_status === "out_of_stock").length;
  const reorderRecs = inventory.filter(i => i.stock_available <= i.reorder_point && i.reorder_point > 0).length;
  const ordersPending = orders.filter(o => ["paid","fulfilment_pending","draft"].includes(o.order_status)).length;
  const shipApproval = shipments.filter(s => ["approval_required","label_required","draft"].includes(s.shipment_status)).length;
  const returnsOpen = returns.filter(r => !["closed","rejected","refunded"].includes(r.return_status)).length;
  const returnsApproval = returns.filter(r => r.return_status === "approval_required").length;
  const isTest = (m: any) => m && (m.live_internal_test === true || m.is_test_data === true);
  const test = products.filter(p => isTest(p.audit_metadata)).length
    + inventory.filter(i => isTest(i.audit_metadata)).length
    + orders.filter(o => isTest(o.audit_metadata)).length;

  let top: EcommerceSummary["top_alert"] = null;
  if (out > 0) top = { kind: "out_of_stock", summary: `${out} SKU(s) out of stock`, severity: "high" };
  else if (shipApproval > 0) top = { kind: "ship_approval", summary: `${shipApproval} shipment(s) await founder approval`, severity: "high" };
  else if (returnsApproval > 0) top = { kind: "return_approval", summary: `${returnsApproval} return(s) await refund approval`, severity: "high" };
  else if (low > 0) top = { kind: "low_stock", summary: `${low} SKU(s) low on stock`, severity: "medium" };
  else if (reorderRecs > 0) top = { kind: "reorder", summary: `${reorderRecs} reorder recommendation(s)`, severity: "medium" };

  return {
    product_count: products.length,
    active_skus: products.filter(p => p.active).length,
    inventory_rows: inventory.length,
    low_stock: low,
    out_of_stock: out,
    orders_total: orders.length,
    orders_pending: ordersPending,
    shipments_awaiting_approval: shipApproval,
    returns_open: returnsOpen,
    returns_awaiting_approval: returnsApproval,
    suppliers: suppliers.length,
    reorder_recommendations: reorderRecs,
    test_records: test,
    top_alert: top,
  };
}

export function computeInventoryStatus(stock_available: number, reorder_point: number, tracking: boolean): InventoryStatus {
  if (!tracking) return "unknown";
  if (stock_available <= 0) return "out_of_stock";
  if (reorder_point > 0 && stock_available <= reorder_point) return "low_stock";
  return "in_stock";
}

export function formatMoney(n: number, currency = "USD") {
  try { return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(n); }
  catch { return `${currency} ${n.toFixed(2)}`; }
}