import { useEffect, useState } from "react";
import FounderLayout from "@/components/founder/FounderLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { Globe2, Users, Building2, Target, ShieldAlert, ClipboardCheck, Flame } from "lucide-react";

/**
 * Founder-Led Buyer & Market Domination Engine.
 * Founder/admin only. No outreach. No external publishing.
 * Buyer intelligence starts on business attachment via DB trigger.
 */
export default function FounderLedBuyerMarketEngine() {
  const [profiles, setProfiles] = useState<any[]>([]);
  const [buyers, setBuyers] = useState<any[]>([]);
  const [competitors, setCompetitors] = useState<any[]>([]);
  const [segments, setSegments] = useState<any[]>([]);
  const [warmActions, setWarmActions] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const [p, b, c, s, w] = await Promise.all([
          (supabase as any).from("business_exit_intelligence_profiles").select("*").order("twelve_month_review_date", { ascending: true }).limit(100),
          (supabase as any).from("founder_led_buyer_targets").select("*").order("updated_at", { ascending: false }).limit(100),
          (supabase as any).from("competitor_intelligence_map").select("*").order("updated_at", { ascending: false }).limit(100),
          (supabase as any).from("customer_prospect_segment_map").select("*").order("updated_at", { ascending: false }).limit(100),
          (supabase as any).from("founder_led_buyer_warm_up_actions").select("*").order("due_date", { ascending: true }).limit(100),
        ]);
        setProfiles(p?.data ?? []);
        setBuyers(b?.data ?? []);
        setCompetitors(c?.data ?? []);
        setSegments(s?.data ?? []);
        setWarmActions(w?.data ?? []);
      } catch { /* founder/admin gated */ }
    })();
  }, []);

  return (
    <FounderLayout>
      <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
        <div>
          <div className="flex items-center gap-2">
            <Target className="text-primary" size={20} />
            <h1 className="text-2xl font-semibold">Founder-Led Buyer & Market Engine</h1>
            <Badge variant="outline" className="text-[10px]">Direct buyer sales process</Badge>
          </div>
          <p className="text-sm text-muted-foreground max-w-3xl mt-1">
            From day one, Liftor quietly tracks who might buy each business, who competes with it, and which lawful
            segments to target. Owner-led. No outreach without founder approval. M&amp;A advisers are optional;
            lawyers / tax advisers are used only for specialist completion.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mt-3">
            <Card className="tech-card"><CardContent className="p-3 text-xs flex items-center gap-2"><ShieldAlert size={14} className="text-primary"/> Public/lawful sources only — no scraping of private/logged-in data</CardContent></Card>
            <Card className="tech-card"><CardContent className="p-3 text-xs flex items-center gap-2"><ClipboardCheck size={14} className="text-primary"/> 12-month review triggers founder-led sale readiness</CardContent></Card>
            <Card className="tech-card"><CardContent className="p-3 text-xs flex items-center gap-2"><Globe2 size={14} className="text-primary"/> Worldwide tagging — jurisdiction compliance status required</CardContent></Card>
          </div>
        </div>

        <Tabs defaultValue="profiles" className="w-full">
          <TabsList>
            <TabsTrigger value="profiles">Exit profiles</TabsTrigger>
            <TabsTrigger value="buyers">Buyer universe</TabsTrigger>
            <TabsTrigger value="competitors">Competitor map</TabsTrigger>
            <TabsTrigger value="segments">Customer segments</TabsTrigger>
            <TabsTrigger value="warmup">Warm-up workflow</TabsTrigger>
          </TabsList>

          <TabsContent value="profiles">
            <Card className="tech-card">
              <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Building2 size={14}/> Business exit intelligence profiles</CardTitle></CardHeader>
              <CardContent className="text-xs">
                <p className="text-muted-foreground mb-3">Auto-created when a business is attached. Default: internal only, not for sale, no outreach approved, data room closed.</p>
                {profiles.length === 0 ? (
                  <p className="text-muted-foreground">No profiles yet. They appear automatically when businesses are attached.</p>
                ) : (
                  <table className="w-full text-left">
                    <thead className="text-muted-foreground"><tr><th className="py-1">Business</th><th>Sector</th><th>12-month review</th><th>Status</th><th>For sale</th><th>Outreach</th><th>Data room</th></tr></thead>
                    <tbody>
                      {profiles.map((p) => (
                        <tr key={p.id} className="border-t border-border/40">
                          <td className="py-1">{p.business_name}</td>
                          <td>{p.sector ?? "—"}</td>
                          <td>{p.twelve_month_review_date ?? "—"}</td>
                          <td><Badge variant="outline" className="text-[10px]">{p.sale_review_status}</Badge></td>
                          <td>{p.for_sale ? "Yes" : "No"}</td>
                          <td>{p.outreach_approved ? "Approved" : "No"}</td>
                          <td>{p.data_room_open ? "Open" : "Closed"}</td>
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
              <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Users size={14}/> Worldwide buyer universe</CardTitle></CardHeader>
              <CardContent className="text-xs">
                <p className="text-muted-foreground mb-3">Outreach is blocked at the database level until founder approval is recorded. Tag by region and jurisdiction compliance.</p>
                {buyers.length === 0 ? (
                  <p className="text-muted-foreground">No buyer targets recorded yet.</p>
                ) : (
                  <table className="w-full text-left">
                    <thead className="text-muted-foreground"><tr><th className="py-1">Buyer</th><th>Type</th><th>Region</th><th>Fit</th><th>Outreach</th><th>Jurisdiction</th><th>Approved</th></tr></thead>
                    <tbody>
                      {buyers.map((b) => (
                        <tr key={b.id} className="border-t border-border/40">
                          <td className="py-1">{b.buyer_name}</td>
                          <td>{b.buyer_type ?? "—"}</td>
                          <td>{b.country_region ?? "—"}</td>
                          <td>{b.fit_score ?? "—"}</td>
                          <td><Badge variant="outline" className="text-[10px]">{b.outreach_status}</Badge></td>
                          <td><Badge variant="outline" className="text-[10px]">{b.jurisdiction_compliance_status}</Badge></td>
                          <td>{b.founder_approved_to_contact ? "Yes" : "No"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="competitors">
            <Card className="tech-card">
              <CardHeader><CardTitle className="text-sm">Competitor intelligence map (public/lawful only)</CardTitle></CardHeader>
              <CardContent className="text-xs">
                <p className="text-muted-foreground mb-3">Do not copy protected assets, code, branding, confidential material or private customer lists. Track problem thesis, market signals and public positioning only.</p>
                {competitors.length === 0 ? (
                  <p className="text-muted-foreground">No competitors recorded yet.</p>
                ) : (
                  <table className="w-full text-left">
                    <thead className="text-muted-foreground"><tr><th className="py-1">Competitor</th><th>Segment</th><th>Buyer relevance</th><th>Risk</th></tr></thead>
                    <tbody>
                      {competitors.map((c) => (
                        <tr key={c.id} className="border-t border-border/40">
                          <td className="py-1">{c.competitor_name}</td>
                          <td>{c.customer_segment ?? "—"}</td>
                          <td><Badge variant="outline" className="text-[10px]">{c.buyer_relevance ?? "—"}</Badge></td>
                          <td><Badge variant="outline" className="text-[10px]">{c.risk_level ?? "—"}</Badge></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="segments">
            <Card className="tech-card">
              <CardHeader><CardTitle className="text-sm">Lawful customer / prospect segments</CardTitle></CardHeader>
              <CardContent className="text-xs">
                <p className="text-muted-foreground mb-3">Public/lawful sources only. No stolen, private, scraped-login, leaked or confidential customer lists. Compliance status must be set before any founder-approved outreach.</p>
                {segments.length === 0 ? (
                  <p className="text-muted-foreground">No segments recorded yet.</p>
                ) : (
                  <table className="w-full text-left">
                    <thead className="text-muted-foreground"><tr><th className="py-1">Segment</th><th>Geography</th><th>Suitability</th><th>Compliance</th><th>Approval</th></tr></thead>
                    <tbody>
                      {segments.map((s) => (
                        <tr key={s.id} className="border-t border-border/40">
                          <td className="py-1">{s.segment_name}</td>
                          <td>{s.geography ?? "—"}</td>
                          <td><Badge variant="outline" className="text-[10px]">{s.outreach_suitability ?? "—"}</Badge></td>
                          <td><Badge variant="outline" className="text-[10px]">{s.compliance_status}</Badge></td>
                          <td><Badge variant="outline" className="text-[10px]">{s.approval_status}</Badge></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="warmup">
            <Card className="tech-card">
              <CardHeader><CardTitle className="text-sm">Buyer warm-up workflow (founder-led)</CardTitle></CardHeader>
              <CardContent className="text-xs">
                <ol className="grid grid-cols-1 md:grid-cols-2 gap-1 list-[upper-alpha] pl-5">
                  <li>Identify buyer</li>
                  <li>Gather public evidence</li>
                  <li>Score fit</li>
                  <li>Identify warm path</li>
                  <li>Draft soft relationship email</li>
                  <li>Founder approves</li>
                  <li>Contact made</li>
                  <li>Response logged</li>
                  <li>Relationship warmed</li>
                  <li>Sale conversation ready</li>
                  <li>Diligence / data room decision</li>
                  <li>Offer / park / hold</li>
                </ol>
                <p className="text-muted-foreground mt-3">No automatic sending. Drafts only. Nothing leaves Liftor without explicit founder approval through existing gated sending controls.</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </FounderLayout>
  );
}