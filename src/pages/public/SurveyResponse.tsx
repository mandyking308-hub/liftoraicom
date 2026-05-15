import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

type Question = { id: string; type: 'scale' | 'text'; label: string; min?: number; max?: number };

export default function SurveyResponse() {
  const { token } = useParams<{ token: string }>();
  const [request, setRequest] = useState<any | null>(null);
  const [template, setTemplate] = useState<any | null>(null);
  const [business, setBusiness] = useState<any | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [comment, setComment] = useState("");
  const [status, setStatus] = useState<'loading'|'ready'|'submitted'|'error'|'expired'>('loading');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      if (!token) return setStatus('error');
      const { data: req } = await supabase
        .from('customer_survey_requests')
        .select('id, business_id, template_id, expires_at, completed_at, request_status, survey_token')
        .eq('survey_token', token)
        .maybeSingle();
      if (!req) { setStatus('error'); return; }
      if (req.expires_at && new Date(req.expires_at) < new Date()) { setStatus('expired'); return; }
      if (req.completed_at) { setStatus('submitted'); return; }
      setRequest(req);
      if (req.template_id) {
        const { data: tmpl } = await supabase.from('customer_survey_templates')
          .select('template_name, questions, survey_type').eq('id', req.template_id).maybeSingle();
        setTemplate(tmpl);
      }
      if (req.business_id) {
        const { data: biz } = await supabase.from('businesses').select('name').eq('id', req.business_id).maybeSingle();
        setBusiness(biz);
      }
      setStatus('ready');
    })();
  }, [token]);

  const questions: Question[] = useMemo(() => (template?.questions ?? []) as Question[], [template]);

  const submit = async () => {
    if (!request) return;
    const schema = z.object({
      comment: z.string().trim().max(2000).optional(),
    });
    const parsed = schema.safeParse({ comment });
    if (!parsed.success) { setError('Invalid input'); return; }
    const numScores = questions.filter(q=>q.type==='scale').map(q=>Number(answers[q.id])).filter(n=>!isNaN(n));
    const csat = numScores[0] ?? null;
    const nps = questions.find(q=>q.id==='nps') ? Number(answers['nps']) || null : null;
    const effort = questions.find(q=>q.id==='effort') ? Number(answers['effort']) || null : null;

    const { error: err } = await supabase.from('customer_survey_responses').insert({
      survey_request_id: request.id,
      business_id: request.business_id,
      survey_type: template?.survey_type ?? null,
      response_payload: { answers, comment: parsed.data.comment ?? null },
      csat_score: csat,
      nps_score: nps,
      effort_score: effort,
      raw_text_feedback: parsed.data.comment ?? null,
    });
    if (err) { setError(err.message); return; }
    await supabase.from('customer_survey_requests').update({ completed_at: new Date().toISOString(), request_status: 'completed' }).eq('id', request.id);
    setStatus('submitted');
  };

  return (
    <div className="min-h-screen bg-background p-6 flex items-center justify-center">
      <Card className="w-full max-w-xl">
        <CardHeader>
          <CardTitle>{business?.name ? `${business.name} — ` : ''}{template?.template_name ?? 'Customer feedback'}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {status === 'loading' && <p className="text-sm text-muted-foreground">Loading…</p>}
          {status === 'error' && <p className="text-sm text-destructive">Survey not found.</p>}
          {status === 'expired' && <p className="text-sm text-destructive">This survey has expired.</p>}
          {status === 'submitted' && <p className="text-sm">Thank you — your feedback has been recorded.</p>}
          {status === 'ready' && (
            <>
              {questions.map(q => (
                <div key={q.id} className="space-y-1">
                  <Label className="text-sm">{q.label}</Label>
                  {q.type === 'scale' ? (
                    <Input type="number" min={q.min ?? 1} max={q.max ?? 5}
                      value={answers[q.id] ?? ''}
                      onChange={(e)=>setAnswers(a=>({ ...a, [q.id]: e.target.value }))} />
                  ) : (
                    <Textarea maxLength={2000}
                      value={answers[q.id] ?? ''}
                      onChange={(e)=>setAnswers(a=>({ ...a, [q.id]: e.target.value }))} />
                  )}
                </div>
              ))}
              <div className="space-y-1">
                <Label className="text-sm">Anything else?</Label>
                <Textarea value={comment} maxLength={2000} onChange={(e)=>setComment(e.target.value)} />
              </div>
              {error && <p className="text-xs text-destructive">{error}</p>}
              <Button onClick={submit} className="w-full">Submit feedback</Button>
              <p className="text-[11px] text-muted-foreground">Your response is private and used only to improve service.</p>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}