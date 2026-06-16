import { useEffect, useState } from "react";
import FounderLayout from "@/components/founder/FounderLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { Handshake, ClipboardCheck, Users, Gauge, ShieldCheck } from "lucide-react";

/**
 * Founder-Led Exit Sales Engine
 * Owner-led sale preparation for Mandy. No external outreach, no advisers activated.
 * External lawyers / tax advisers remain required for completion only.
 */
export default function FounderLedExitSalesEngine() {
  const [reviews, setReviews] = useState<any[]>([]);
  const [buyers, setBuyers] = useState<any[]>([]);
  const [scores, setScores] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const [r, b, s] = await Promise.all([
          (supabase as any).from("founder_led_sale_reviews").select("*").order("review_due_date", { ascending: true }).limit(50),
          (supabase as any).from("founder_led_buyer_targets").select("*").order("updated_at", { ascending: false }).limit(50),
          (supabase as any).from("founder_led_sale_readiness_scores").select("*").order("snapshot_at", { ascending: false }).limit(50),
        ]);
        setReviews(r?.data ?? []);
        setBuyers(b?.data ?? []);
        setScores(s?.data ?? []);
      } catch { /* founder/admin gated */ }
    })();
  }, []);

  return (
    <FounderLayout>
      <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <Handshake className="text-primary" size={20} />
            <h1 className="text-2xl font-semibold">Founder-Led Exit</h1>
            <Badge variant="outline" className="text-[10px]">Direct buyer sales process</Badge>
          </div>
          <p className="text-sm text-muted-foreground max-w-3xl">
            Owner-led sale preparation. Buyer targeting controlled by founder. External lawyers and tax advisers
            support completion only — Liftor does not hand the process to an M&amp;A firm.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mt-2">
            <Card className="tech-card"><CardContent className="p-3 text-xs flex items-center gap-2"><ShieldCheck size={14} className="text-primary"/> Founder approval required before any buyer contact</CardContent></Card>
            <Card className="tech-card"><CardContent className="p-3 text-xs flex items-center gap-2"><ClipboardCheck size={14} className="text-primary"/> ~12 months operating triggers sale-readiness review</CardContent></Card>
            <Card className="tech-card"><CardContent className="p-3 text-xs flex items-center gap-2"><Gauge size={14} className="text-primary"/> No automation of legal, tax, or sale decisions</CardContent></Card>
          </div>
        </div>

        <Tabs defaultValue="reviews" className="w-full">
          <TabsList>
            <TabsTrigger value="reviews">Sale reviews</TabsTrigger>
            <TabsTrigger value="buyers">Buyer targets</TabsTrigger>
            <TabsTrigger value="scores">Readiness scores</TabsTrigger>
            <TabsTrigger value="stages">Process stages</TabsTrigger>
          </TabsList>

          <TabsContent value="reviews">
            <Card className="tech-card">
              <CardHeader><CardTitle className="text-sm">12-month sale-readiness reviews</CardTitle></CardHeader>
              <CardContent className="text-xs">
                {reviews.length === 0 ? (
                  <p className="text-muted-foreground">No sale reviews yet. A review surfaces here once a business has operated for ~12 months.</p>
                ) : (
                  <table className="w-full text-left">
                    <thead className="text-muted-foreground"><tr><th className="py-1">Business</th><th>Due</th><th>Status</th><th>Decision</th><th>Next action</th></tr></thead>
                    <tbody>
                      {reviews.map((r) => (
                        <tr key={r.id} className="border-t border-border/40">
                          <td className="py-1">{r.business_name}</td>
                          <td>{r.review_due_date ?? "—"}</td>
                          <td><Badge variant="outline" className="text-[10px]">{r.sale_review_status}</Badge></td>
                          <td>{r.founder_decision ?? "—"}</td>
                          <td>{r.next_action ?? "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="buyers">
            <Card className="tech-card">
              <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Users size={14}/> Founder-controlled buyer targets</CardTitle></CardHeader>
              <CardContent className="text-xs">
                <p className="text-muted-foreground mb-3">Outreach is blocked until founder approval is recorded. Nothing in this list contacts anyone automatically.</p>
                {buyers.length === 0 ? (
                  <p className="text-muted-foreground">No buyer targets recorded yet.</p>
                ) : (
                  <table className="w-full text-left">
                    <thead className="text-muted-foreground"><tr><th className="py-1">Buyer</th><th>Sector</th><th>Relationship</th><th>Outreach</th><th>Approved</th></tr></thead>
                    <tbody>
                      {buyers.map((b) => (
                        <tr key={b.id} className="border-t border-border/40">
                          <td className="py-1">{b.buyer_name}</td>
                          <td>{b.sector ?? "—"}</td>
                          <td>{b.relationship_status ?? "—"}</td>
                          <td><Badge variant="outline" className="text-[10px]">{b.outreach_status}</Badge></td>
                          <td>{b.founder_approved_to_contact ? "Yes" : "No"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="scores">
            <Card className="tech-card">
              <CardHeader><CardTitle className="text-sm">Founder-facing readiness scores</CardTitle></CardHeader>
              <CardContent className="text-xs">
                {scores.length === 0 ? (
                  <p className="text-muted-foreground">No readiness scores recorded yet.</p>
                ) : (
                  <table className="w-full text-left">
                    <thead className="text-muted-foreground"><tr><th className="py-1">Business</th><th>Snapshot</th><th>Recommendation</th></tr></thead>
                    <tbody>
                      {scores.map((s) => (
                        <tr key={s.id} className="border-t border-border/40">
                          <td className="py-1">{s.business_name}</td>
                          <td>{new Date(s.snapshot_at).toLocaleDateString()}</td>
                          <td><Badge variant="outline" className="text-[10px]">{s.overall_recommendation ?? "—"}</Badge></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="stages">
            <Card className="tech-card">
              <CardHeader><CardTitle className="text-sm">Founder-led sale process stages</CardTitle></CardHeader>
              <CardContent className="text-xs">
                <ol className="grid grid-cols-1 md:grid-cols-2 gap-1 list-decimal pl-5">
                  <li>Build for value</li>
                  <li>Operate and evidence</li>
                  <li>12-month review</li>
                  <li>Buyer target list</li>
                  <li>Sale readiness score</li>
                  <li>Founder decision</li>
                  <li>Prepare data room</li>
                  <li>Founder-approved buyer contact</li>
                  <li>Buyer conversation</li>
                  <li>Diligence</li>
                  <li>Offer</li>
                  <li>Lawyer / tax adviser completion</li>
                  <li>Sold / retained / parked</li>
                </ol>
                <p className="text-muted-foreground mt-3">
                  External advisers support completion only. Buyer targeting and approval remain with the founder.
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </FounderLayout>
  );
}