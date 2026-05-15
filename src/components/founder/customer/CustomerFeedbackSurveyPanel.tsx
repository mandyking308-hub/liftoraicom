import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, ShieldAlert } from "lucide-react";

export default function CustomerFeedbackSurveyPanel({ businessId }: { businessId?: string | null }) {
  const { data } = useQuery({
    queryKey: ['customer-feedback-panel', businessId ?? null],
    queryFn: async () => {
      const tplQ = supabase.from('customer_survey_templates').select('id, template_name, survey_type, active').eq('active', true).limit(50);
      let reqQ = supabase.from('customer_survey_requests').select('id, request_status, send_allowed, created_at, business_id').limit(200).order('created_at', { ascending: false });
      let resQ = supabase.from('customer_survey_responses').select('id, csat_score, nps_score, effort_score, follow_up_required, upsell_interest, competitor_mentions, requested_improvements, business_id').limit(500);
      if (businessId) { reqQ = reqQ.eq('business_id', businessId); resQ = resQ.eq('business_id', businessId); }
      const [tpl, reqs, res] = await Promise.all([tplQ, reqQ, resQ]);
      return { templates: tpl.data ?? [], requests: reqs.data ?? [], responses: res.data ?? [] };
    },
    staleTime: 30_000,
  });

  const requests = data?.requests ?? [];
  const responses = data?.responses ?? [];
  const drafts = requests.filter((r:any) => r.request_status === 'draft').length;
  const pending = requests.filter((r:any) => r.request_status === 'pending_approval').length;
  const completed = requests.filter((r:any) => r.request_status === 'completed').length;
  const avg = (arr: number[]) => arr.length ? (arr.reduce((a,b)=>a+b,0)/arr.length).toFixed(1) : '—';
  const csat = avg(responses.map((r:any) => r.csat_score).filter((n:any)=>typeof n==='number'));
  const nps = avg(responses.map((r:any) => r.nps_score).filter((n:any)=>typeof n==='number'));
  const followUps = responses.filter((r:any)=>r.follow_up_required).length;
  const upsell = responses.reduce((n:number,r:any)=>n+((r.upsell_interest?.length)??0),0);
  const competitors = responses.reduce((n:number,r:any)=>n+((r.competitor_mentions?.length)??0),0);
  const improvements = responses.reduce((n:number,r:any)=>n+((r.requested_improvements?.length)??0),0);

  const Tile = ({ label, value, tone='default' }: any) => (
    <div className="rounded-lg border border-border/50 bg-secondary/30 p-3">
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-[11px] text-muted-foreground">{label}</div>
    </div>
  );

  return (
    <Card className="bg-card border-border/50" id="sec-customer-feedback">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center justify-between gap-2">
          <span className="flex items-center gap-2"><MessageSquare size={14} className="text-primary" /> Customer Feedback & Surveys</span>
          <Badge variant="outline" className="border-yellow-500/40 text-yellow-300 text-[10px]"><ShieldAlert size={10} className="mr-1" /> No auto-send · Founder approval required</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
          <Tile label="Templates" value={data?.templates?.length ?? 0} />
          <Tile label="Drafts" value={drafts} />
          <Tile label="Pending approval" value={pending} />
          <Tile label="Completed" value={completed} />
          <Tile label="CSAT avg" value={csat} />
          <Tile label="NPS avg" value={nps} />
          <Tile label="Follow-ups needed" value={followUps} />
          <Tile label="Upsell signals" value={upsell} />
          <Tile label="Competitor mentions" value={competitors} />
          <Tile label="Improvement requests" value={improvements} />
        </div>
        <p className="text-[11px] text-muted-foreground">
          Voice of Customer learning layer. Survey requests are created with <code>send_allowed=false</code> and require founder approval before any external send is enabled.
        </p>
      </CardContent>
    </Card>
  );
}