import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2, LifeBuoy, ShieldCheck, Plus, AlertTriangle, ExternalLink, BookOpen } from "lucide-react";

const NEON_CANDY_ID = "b47c4b11-9a96-4af9-9aec-2f5218de9182";

const ARTICLE_TYPES = [
  "FAQ","help_article","troubleshooting","policy","onboarding","pricing_answer",
  "refund_answer","delivery_answer","technical_support","escalation_script",
];

type Business = { id: string; name: string };
type Article = { id: string; article_type: string; title: string; status: string; approved: boolean; agent_visible: boolean; created_at: string };
type Review = { id: string; support_category: string | null; urgency: string; customer_question: string | null; escalation_required: boolean; founder_review_required: boolean; status: string; send_allowed: boolean; created_at: string };

export default function SupportKnowledgeAgentPanel() {
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [businessId, setBusinessId] = useState(NEON_CANDY_ID);
  const [articles, setArticles] = useState<Article[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [source, setSource] = useState("");
  const [selectedTypes, setSelectedTypes] = useState<string[]>(["FAQ","help_article","troubleshooting","escalation_script"]);

  const [question, setQuestion] = useState("");

  useEffect(() => {
    supabase.from("businesses").select("id,name").order("name").then(({ data }) => setBusinesses((data ?? []) as Business[]));
  }, []);

  const reload = async (bid: string) => {
    const [a, r] = await Promise.all([
      (supabase as any).from("support_knowledge_articles").select("*").eq("business_id", bid).order("created_at", { ascending: false }).limit(50),
      (supabase as any).from("support_interaction_reviews").select("*").eq("business_id", bid).order("created_at", { ascending: false }).limit(50),
    ]);
    setArticles((a.data ?? []) as Article[]);
    setReviews((r.data ?? []) as Review[]);
  };
  useEffect(() => { reload(businessId); }, [businessId]);

  const generateKnowledge = async () => {
    setLoading(true); setError(null);
    try {
      const { data, error } = await supabase.functions.invoke("support-knowledge-generate", {
        body: { business_id: businessId, source, article_types: selectedTypes, dry_run: false, confirmation: "CREATE SUPPORT KNOWLEDGE" },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      setSource("");
      await reload(businessId);
    } catch (e: any) { setError(e?.message ?? String(e)); } finally { setLoading(false); }
  };

  const triage = async () => {
    setLoading(true); setError(null);
    try {
      const { data, error } = await supabase.functions.invoke("support-agent-triage", {
        body: { business_id: businessId, customer_question: question, dry_run: false, confirmation: "CREATE SUPPORT REVIEW" },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      setQuestion("");
      await reload(businessId);
    } catch (e: any) { setError(e?.message ?? String(e)); } finally { setLoading(false); }
  };

  const toggleType = (t: string) => setSelectedTypes((cur) => cur.includes(t) ? cur.filter((x) => x !== t) : [...cur, t]);

  const counts = {
    faqs: articles.filter((a) => a.article_type === "FAQ").length,
    approved: articles.filter((a) => a.approved).length,
    drafts: reviews.filter((r) => r.status === "draft").length,
    escalations: reviews.filter((r) => r.escalation_required).length,
    needsReview: reviews.filter((r) => r.founder_review_required && r.status !== "resolved").length,
  };

  return (
    <Card className="bg-card border-border/50">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center justify-between gap-2">
          <span className="flex items-center gap-2"><LifeBuoy size={14} className="text-primary" /> Support / Customer Service Knowledge Agent</span>
          <Badge variant="secondary" className="bg-yellow-500/10 text-yellow-300 border-yellow-500/30 text-[10px]">
            <ShieldCheck size={10} className="mr-1" /> No external send · No live chat
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-end gap-2">
          <div className="min-w-[220px]">
            <Label className="text-xs text-muted-foreground">Business</Label>
            <select className="w-full bg-background border border-border/50 rounded px-2 py-1.5 text-sm" value={businessId} onChange={(e) => setBusinessId(e.target.value)}>
              {businesses.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
          <Link to="/founder/knowledge" className="text-[11px] text-primary hover:underline flex items-center gap-1"><ExternalLink size={11} /> Knowledge Brain</Link>
          <Link to="/founder/conversations" className="text-[11px] text-primary hover:underline flex items-center gap-1"><ExternalLink size={11} /> Conversations</Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center text-xs">
          {[
            { l: "Articles", v: articles.length },
            { l: "FAQs", v: counts.faqs },
            { l: "Approved", v: counts.approved },
            { l: "Open reviews", v: counts.needsReview },
            { l: "Escalations", v: counts.escalations },
          ].map((t) => (
            <div key={t.l} className="p-2 rounded border border-border/40 bg-secondary/30">
              <div className="text-lg font-semibold">{t.v}</div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-wide">{t.l}</div>
            </div>
          ))}
        </div>

        <div className="grid lg:grid-cols-2 gap-3">
          <div className="p-3 rounded border border-border/40 bg-secondary/20 space-y-2">
            <div className="text-xs font-semibold flex items-center gap-1"><BookOpen size={12} /> Generate support knowledge pack</div>
            <Textarea placeholder="Paste source material / manual / policy snippets (optional — uses business knowledge if blank)" value={source} onChange={(e) => setSource(e.target.value)} className="min-h-[64px] text-xs" />
            <div className="flex flex-wrap gap-1">
              {ARTICLE_TYPES.map((t) => (
                <button key={t} type="button" onClick={() => toggleType(t)}
                  className={`text-[10px] px-2 py-0.5 rounded border ${selectedTypes.includes(t) ? "border-primary/60 bg-primary/15 text-foreground" : "border-border/40 bg-background/40 text-muted-foreground"}`}>
                  {t.replace(/_/g, " ")}
                </button>
              ))}
            </div>
            <Button size="sm" disabled={loading || selectedTypes.length === 0} onClick={generateKnowledge}>
              {loading ? <Loader2 size={12} className="animate-spin mr-1" /> : <Plus size={12} className="mr-1" />}
              Create knowledge (no send)
            </Button>
          </div>
          <div className="p-3 rounded border border-border/40 bg-secondary/20 space-y-2">
            <div className="text-xs font-semibold flex items-center gap-1"><AlertTriangle size={12} /> Triage a customer question</div>
            <Textarea placeholder="Paste a customer question / DM / email" value={question} onChange={(e) => setQuestion(e.target.value)} className="min-h-[64px] text-xs" />
            <Button size="sm" disabled={loading || !question.trim()} onClick={triage}>
              {loading ? <Loader2 size={12} className="animate-spin mr-1" /> : <Plus size={12} className="mr-1" />}
              Create review draft (no reply)
            </Button>
          </div>
        </div>

        {error && <div className="text-xs text-destructive">{error}</div>}

        <div className="grid lg:grid-cols-2 gap-3">
          <div>
            <div className="text-xs font-semibold mb-1">Knowledge articles</div>
            <div className="space-y-1 max-h-72 overflow-auto">
              {articles.length === 0 && <div className="text-[11px] text-muted-foreground">No articles yet.</div>}
              {articles.map((a) => (
                <div key={a.id} className="text-xs flex items-center justify-between gap-2 p-2 rounded border border-border/30 bg-background/40">
                  <div className="truncate">
                    <span className="text-muted-foreground">[{a.article_type}]</span> {a.title}
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Badge variant="secondary" className="text-[9px]">{a.status}</Badge>
                    {a.approved
                      ? <Badge variant="secondary" className="text-[9px] bg-green-500/15 text-green-400">approved</Badge>
                      : <Badge variant="secondary" className="text-[9px] bg-yellow-500/15 text-yellow-300">needs approval</Badge>}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div>
            <div className="text-xs font-semibold mb-1">Support review drafts</div>
            <div className="space-y-1 max-h-72 overflow-auto">
              {reviews.length === 0 && <div className="text-[11px] text-muted-foreground">No reviews yet.</div>}
              {reviews.map((r) => (
                <div key={r.id} className="text-xs flex items-center justify-between gap-2 p-2 rounded border border-border/30 bg-background/40">
                  <div className="truncate">
                    <span className="text-muted-foreground">[{r.support_category ?? "general"} · {r.urgency}]</span> {r.customer_question}
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Badge variant="secondary" className="text-[9px]">{r.status}</Badge>
                    {r.escalation_required && <Badge variant="secondary" className="text-[9px] bg-destructive/20 text-destructive">escalate</Badge>}
                    <Badge variant="secondary" className="text-[9px] bg-yellow-500/15 text-yellow-300">send locked</Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}