import FounderLayout from "@/components/founder/FounderLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageSquare, Send, Bot, Activity, Building2, Workflow, Zap, Lightbulb, TrendingUp } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState, useRef, useEffect, useCallback } from "react";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";

type Msg = { role: "user" | "assistant"; content: string };

const COPILOT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/founder-copilot`;

const quickQuestions = [
  "Which workflows are performing best?",
  "What are the highest revenue clients?",
  "Which templates are most used?",
  "What automation demand trends do you see?",
  "What industries should we target next?",
  "Summarise platform health right now.",
];

const FounderCoPilot = () => {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Platform stats
  const { data: systems } = useQuery({
    queryKey: ["copilot-systems"],
    queryFn: async () => {
      const { data } = await supabase.from("monitored_systems").select("id, status");
      return data || [];
    },
  });
  const { data: agents } = useQuery({
    queryKey: ["copilot-agents"],
    queryFn: async () => {
      const { data } = await supabase.from("ai_agents").select("id, status");
      return data || [];
    },
  });
  const { data: workflows } = useQuery({
    queryKey: ["copilot-workflows"],
    queryFn: async () => {
      const { data } = await supabase.from("automation_workflows").select("id, status");
      return data || [];
    },
  });
  const { data: orgs } = useQuery({
    queryKey: ["copilot-orgs"],
    queryFn: async () => {
      const { data } = await supabase.from("organisations").select("id");
      return data || [];
    },
  });
  const { data: latestInsights } = useQuery({
    queryKey: ["copilot-insights"],
    queryFn: async () => {
      const { data } = await supabase.from("brain_insights").select("title, priority, insight_type").order("created_at", { ascending: false }).limit(3);
      return data || [];
    },
  });
  const { data: latestRecs } = useQuery({
    queryKey: ["copilot-recs"],
    queryFn: async () => {
      const { data } = await supabase.from("decision_recommendations").select("title, priority, category, status").eq("status", "pending").order("created_at", { ascending: false }).limit(3);
      return data || [];
    },
  });

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || isLoading) return;
    const userMsg: Msg = { role: "user", content: text.trim() };
    const allMessages = [...messages, userMsg];
    setMessages(allMessages);
    setInput("");
    setIsLoading(true);

    let assistantSoFar = "";
    const upsertAssistant = (chunk: string) => {
      assistantSoFar += chunk;
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last?.role === "assistant") {
          return prev.map((m, i) => (i === prev.length - 1 ? { ...m, content: assistantSoFar } : m));
        }
        return [...prev, { role: "assistant", content: assistantSoFar }];
      });
    };

    try {
      const resp = await fetch(COPILOT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ messages: allMessages }),
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: "Unknown error" }));
        toast.error(err.error || "Failed to get response");
        setIsLoading(false);
        return;
      }

      if (!resp.body) throw new Error("No response body");

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = "";
      let streamDone = false;

      while (!streamDone) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") { streamDone = true; break; }
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) upsertAssistant(content);
          } catch {
            textBuffer = line + "\n" + textBuffer;
            break;
          }
        }
      }

      // Final flush
      if (textBuffer.trim()) {
        for (let raw of textBuffer.split("\n")) {
          if (!raw) continue;
          if (raw.endsWith("\r")) raw = raw.slice(0, -1);
          if (raw.startsWith(":") || raw.trim() === "") continue;
          if (!raw.startsWith("data: ")) continue;
          const jsonStr = raw.slice(6).trim();
          if (jsonStr === "[DONE]") continue;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) upsertAssistant(content);
          } catch { /* ignore */ }
        }
      }
    } catch (e) {
      console.error(e);
      toast.error("Failed to communicate with Co-Pilot");
    }
    setIsLoading(false);
  }, [messages, isLoading]);

  const activeSystemCount = systems?.filter((s) => s.status === "operational").length || 0;
  const activeAgentCount = agents?.filter((a) => a.status === "active").length || 0;
  const activeWorkflowCount = workflows?.filter((w) => w.status === "active").length || 0;

  return (
    <FounderLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <MessageSquare className="text-primary" size={32} />
            Founder AI Co-Pilot
          </h1>
          <p className="text-muted-foreground mt-1">Conversational intelligence powered by the Liftor AI Brain</p>
        </div>

        {/* Platform Status Strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card>
            <CardContent className="py-3 px-4 flex items-center gap-3">
              <Building2 size={18} className="text-primary" />
              <div>
                <p className="text-xs text-muted-foreground">Organisations</p>
                <p className="font-bold">{orgs?.length || 0}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-3 px-4 flex items-center gap-3">
              <Activity size={18} className="text-primary" />
              <div>
                <p className="text-xs text-muted-foreground">Active Systems</p>
                <p className="font-bold">{activeSystemCount}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-3 px-4 flex items-center gap-3">
              <Workflow size={18} className="text-primary" />
              <div>
                <p className="text-xs text-muted-foreground">Automations</p>
                <p className="font-bold">{activeWorkflowCount}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-3 px-4 flex items-center gap-3">
              <Bot size={18} className="text-primary" />
              <div>
                <p className="text-xs text-muted-foreground">AI Agents</p>
                <p className="font-bold">{activeAgentCount}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Chat Panel */}
          <div className="lg:col-span-2 flex flex-col">
            <Card className="flex-1 flex flex-col min-h-[500px]">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Bot size={18} className="text-primary" /> Conversation
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col p-0">
                <ScrollArea ref={scrollRef} className="flex-1 px-4 pb-2" style={{ maxHeight: "400px" }}>
                  {messages.length === 0 && (
                    <div className="text-center py-12">
                      <Bot size={40} className="mx-auto mb-3 text-muted-foreground" />
                      <p className="text-muted-foreground text-sm">Ask me anything about your platform.</p>
                      <div className="flex flex-wrap gap-2 justify-center mt-4">
                        {quickQuestions.slice(0, 3).map((q) => (
                          <Button key={q} variant="outline" size="sm" onClick={() => sendMessage(q)} className="text-xs">
                            {q}
                          </Button>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="space-y-4 py-2">
                    {messages.map((msg, i) => (
                      <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                        <div className={`max-w-[85%] rounded-lg px-4 py-2.5 ${
                          msg.role === "user"
                            ? "bg-primary text-primary-foreground"
                            : "bg-secondary text-secondary-foreground"
                        }`}>
                          {msg.role === "assistant" ? (
                            <div className="prose prose-sm dark:prose-invert max-w-none text-sm">
                              <ReactMarkdown>{msg.content}</ReactMarkdown>
                            </div>
                          ) : (
                            <p className="text-sm">{msg.content}</p>
                          )}
                        </div>
                      </div>
                    ))}
                    {isLoading && messages[messages.length - 1]?.role === "user" && (
                      <div className="flex justify-start">
                        <div className="bg-secondary rounded-lg px-4 py-2.5">
                          <div className="flex gap-1">
                            <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                            <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                            <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </ScrollArea>
                <div className="p-4 border-t border-border">
                  <form
                    onSubmit={(e) => { e.preventDefault(); sendMessage(input); }}
                    className="flex gap-2"
                  >
                    <Input
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      placeholder="Ask the Co-Pilot..."
                      disabled={isLoading}
                      className="flex-1"
                    />
                    <Button type="submit" disabled={isLoading || !input.trim()} size="icon">
                      <Send size={18} />
                    </Button>
                  </form>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Side Panels */}
          <div className="space-y-4">
            {/* Quick Questions */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Zap size={16} /> Quick Questions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1.5">
                {quickQuestions.map((q) => (
                  <Button
                    key={q}
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start text-xs h-auto py-2 text-left"
                    onClick={() => sendMessage(q)}
                    disabled={isLoading}
                  >
                    {q}
                  </Button>
                ))}
              </CardContent>
            </Card>

            {/* Latest Intelligence */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Lightbulb size={16} /> Latest Intelligence
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {latestInsights?.length === 0 && <p className="text-xs text-muted-foreground">No insights yet</p>}
                {latestInsights?.map((ins, i) => (
                  <div key={i} className="p-2 rounded bg-secondary/50">
                    <p className="text-xs font-medium">{ins.title}</p>
                    <div className="flex gap-1 mt-1">
                      <Badge variant="outline" className="text-[10px] px-1 py-0">{ins.insight_type}</Badge>
                      <Badge variant="secondary" className="text-[10px] px-1 py-0">{ins.priority}</Badge>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Pending Recommendations */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <TrendingUp size={16} /> Pending Recommendations
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {latestRecs?.length === 0 && <p className="text-xs text-muted-foreground">No pending recommendations</p>}
                {latestRecs?.map((rec, i) => (
                  <div key={i} className="p-2 rounded bg-secondary/50">
                    <p className="text-xs font-medium">{rec.title}</p>
                    <div className="flex gap-1 mt-1">
                      <Badge variant="outline" className="text-[10px] px-1 py-0">{rec.category}</Badge>
                      <Badge variant="secondary" className="text-[10px] px-1 py-0">{rec.priority}</Badge>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </FounderLayout>
  );
};

export default FounderCoPilot;
