import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

// CUSTOMER-FACING ONLY. Never select internal_notes, risks, metadata, owner_agent_key,
// founder_review_required, required_company_actions (unless customer-visible tasks).
const CUSTOMER_FIELDS = [
  'id', 'onboarding_status', 'onboarding_type', 'customer_goal', 'success_definition',
  'welcome_summary', 'customer_facing_instructions', 'key_contacts',
  'required_customer_actions', 'timeline', 'milestones', 'check_in_schedule',
  'support_route', 'customer_share_allowed', 'approved_at',
].join(',');

export default function CustomerOnboardingView() {
  const { token } = useParams<{ token: string }>();
  const [plan, setPlan] = useState<any | null>(null);
  const [tasks, setTasks] = useState<any[]>([]);
  const [state, setState] = useState<'loading' | 'ok' | 'unavailable'>('loading');

  useEffect(() => {
    (async () => {
      if (!token) { setState('unavailable'); return; }
      const { data, error } = await supabase
        .from('customer_onboarding_plans')
        .select(CUSTOMER_FIELDS)
        .eq('onboarding_token', token)
        .eq('customer_share_allowed', true)
        .not('approved_at', 'is', null)
        .maybeSingle();
      if (error || !data) { setState('unavailable'); return; }
      const planData = data as any;
      setPlan(planData);
      const { data: t } = await supabase
        .from('customer_onboarding_tasks')
        .select('id,task_title,task_description,due_at,task_status,task_owner,priority_level')
        .eq('onboarding_plan_id', planData.id)
        .eq('customer_visible', true)
        .order('due_at', { ascending: true });
      setTasks(t ?? []);
      setState('ok');
    })();
  }, [token]);

  if (state === 'loading') return <div className="min-h-screen bg-background grid place-items-center text-sm text-muted-foreground">Loading…</div>;
  if (state === 'unavailable' || !plan) {
    return (
      <div className="min-h-screen bg-background grid place-items-center p-6">
        <Card className="max-w-md w-full"><CardContent className="p-6 text-center">
          <h1 className="text-lg font-semibold mb-2">Onboarding unavailable</h1>
          <p className="text-sm text-muted-foreground">This link is invalid or your onboarding plan has not yet been approved for sharing.</p>
        </CardContent></Card>
      </div>
    );
  }

  const Section = ({ title, children }: any) => (
    <Card><CardHeader className="pb-2"><CardTitle className="text-sm">{title}</CardTitle></CardHeader>
      <CardContent className="text-sm space-y-2">{children}</CardContent></Card>
  );
  const list = (arr: any) => Array.isArray(arr) && arr.length
    ? <ul className="list-disc pl-5 space-y-1">{arr.map((x: any, i: number) => <li key={i}>{typeof x === 'string' ? x : (x?.title ?? x?.name ?? x?.phase ?? x?.type ?? JSON.stringify(x))}{x?.due_in_days != null && <span className="text-muted-foreground"> · day {x.due_in_days}</span>}{x?.day != null && <span className="text-muted-foreground"> · day {x.day}</span>}</li>)}</ul>
    : <p className="text-muted-foreground text-xs">None.</p>;

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-3xl mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold">Your Onboarding Plan</h1>
          <Badge variant="outline">{plan.onboarding_type ?? 'standard'}</Badge>
        </div>
        <Section title="Welcome">
          <p>{plan.welcome_summary}</p>
          <p className="text-muted-foreground">{plan.customer_facing_instructions}</p>
        </Section>
        <div className="grid sm:grid-cols-2 gap-3">
          <Section title="Your goal">{plan.customer_goal}</Section>
          <Section title="Success definition">{plan.success_definition}</Section>
        </div>
        <Section title="Timeline">{list(plan.timeline)}</Section>
        <Section title="Milestones">{list(plan.milestones)}</Section>
        <Section title="Check-in schedule">{list(plan.check_in_schedule)}</Section>
        <Section title="What we need from you">{list(plan.required_customer_actions)}</Section>
        <Section title="Your tasks">
          {tasks.length ? (
            <ul className="space-y-1">{tasks.map((t) => (
              <li key={t.id} className="flex items-center justify-between gap-2">
                <span>{t.task_title}</span>
                <Badge variant="outline" className="text-[10px]">{t.task_status}</Badge>
              </li>
            ))}</ul>
          ) : <p className="text-muted-foreground text-xs">No tasks assigned to you yet.</p>}
        </Section>
        <Section title="Support route"><p>{plan.support_route}</p></Section>
        <div className="flex justify-center pt-2">
          <Button>Continue the conversation</Button>
        </div>
        <p className="text-[11px] text-muted-foreground text-center">
          This onboarding plan was prepared and approved for you. Internal notes are not shown.
        </p>
      </div>
    </div>
  );
}