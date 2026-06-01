import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

// CUSTOMER-FACING ONLY. The token-validated RPC returns only the safe
// customer-facing fields; sensitive fields (internal_summary, renewal_risk_flags,
// upsell_opportunities, etc.) are never exposed.
export default function CustomerReportView() {
  const { token } = useParams<{ token: string }>();
  const [report, setReport] = useState<any | null>(null);
  const [state, setState] = useState<'loading'|'ok'|'unavailable'>('loading');

  useEffect(() => {
    (async () => {
      if (!token) { setState('unavailable'); return; }
      const { data, error } = await (supabase as any).rpc(
        'get_customer_quarterly_report_by_token',
        { p_token: token }
      );
      if (error || !data) { setState('unavailable'); return; }
      setReport(data); setState('ok');
    })();
  }, [token]);

  if (state === 'loading') return <div className="min-h-screen bg-background grid place-items-center text-sm text-muted-foreground">Loading…</div>;
  if (state === 'unavailable' || !report) {
    return (
      <div className="min-h-screen bg-background grid place-items-center p-6">
        <Card className="max-w-md w-full"><CardContent className="p-6 text-center">
          <h1 className="text-lg font-semibold mb-2">Report unavailable</h1>
          <p className="text-sm text-muted-foreground">This link is invalid or the report has not yet been approved for sharing.</p>
        </CardContent></Card>
      </div>
    );
  }

  const Section = ({ title, children }: any) => (
    <Card><CardHeader className="pb-2"><CardTitle className="text-sm">{title}</CardTitle></CardHeader>
      <CardContent className="text-sm space-y-1">{children}</CardContent></Card>
  );
  const list = (arr: any) => Array.isArray(arr) && arr.length
    ? <ul className="list-disc pl-5 space-y-1">{arr.map((x: any, i: number) => <li key={i}>{typeof x === 'string' ? x : (x?.title ?? JSON.stringify(x))}</li>)}</ul>
    : <p className="text-muted-foreground text-xs">None.</p>;

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-3xl mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold">Quarterly Report · {report.report_quarter} {report.report_year}</h1>
          <Badge variant="outline">{report.reporting_period_start} → {report.reporting_period_end}</Badge>
        </div>
        <Section title="Summary"><p>{report.customer_facing_summary}</p></Section>
        <div className="grid sm:grid-cols-2 gap-3">
          <Section title="Usage">{report.usage_summary}</Section>
          <Section title="Engagement">{report.engagement_summary}</Section>
          <Section title="Value delivered">{report.value_summary}</Section>
          <Section title="Support">{report.support_summary}</Section>
          <Section title="Feedback">{report.feedback_summary}</Section>
          <Section title="Satisfaction">{report.satisfaction_summary}</Section>
        </div>
        <Section title="Completed actions">{list(report.completed_actions)}</Section>
        <Section title="Recommendations">{list(report.recommendations)}</Section>
        <Section title="Next quarter plan">{list(report.next_quarter_plan)}</Section>
        <div className="flex justify-center pt-2">
          <Button>Continue the conversation</Button>
        </div>
        <p className="text-[11px] text-muted-foreground text-center">
          Liftor AI · Operated by Global Solutions Management LLC. This report is confidential and intended for the named customer only.
        </p>
      </div>
    </div>
  );
}