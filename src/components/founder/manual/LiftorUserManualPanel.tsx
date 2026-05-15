import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Search, Download } from "lucide-react";
import { LIFTOR_SIMPLE_GUIDE, LIFTOR_FULL_GUIDE, LIFTOR_USER_MANUAL_VERSION, NEW_BUSINESS_OPERATING_FLOW, type ManualSection } from "@/lib/liftorUserManualContent";
import { Link } from "react-router-dom";

const filterSections = (sections: ManualSection[], q: string) => {
  if (!q) return sections;
  const needle = q.toLowerCase();
  return sections.filter(s => s.title.toLowerCase().includes(needle) || s.body.toLowerCase().includes(needle));
};

const downloadMarkdown = (title: string, sections: ManualSection[]) => {
  const md = `# ${title}\n\n_Version: ${LIFTOR_USER_MANUAL_VERSION}_\n\n` +
    sections.map(s => `## ${s.number}. ${s.title}\n\n${s.body}`).join("\n\n");
  const blob = new Blob([md], { type: "text/markdown" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `${title.replace(/\s+/g, "-").toLowerCase()}.md`;
  a.click();
};

export const LiftorUserManualPanel = () => {
  const [q, setQ] = useState("");
  const simple = useMemo(() => filterSections(LIFTOR_SIMPLE_GUIDE, q), [q]);
  const full = useMemo(() => filterSections(LIFTOR_FULL_GUIDE, q), [q]);

  return (
    <Card className="tech-card">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary" />
            Liftor User Manual
          </CardTitle>
          <p className="text-xs text-muted-foreground mt-1">
            Plain-English operating guide · Version {LIFTOR_USER_MANUAL_VERSION} · Separate from technical Founder Manual
          </p>
        </div>
        <div className="flex gap-2">
          <Link to="/founder/manual/full"><Button size="sm" variant="outline">Open Technical Manual</Button></Link>
          <Link to="/founder/knowledge"><Button size="sm" variant="outline">Business Knowledge</Button></Link>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2">
          <Search className="h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search the manual…" value={q} onChange={(e) => setQ(e.target.value)} />
          <Badge variant="outline">Simple {simple.length}</Badge>
          <Badge variant="outline">Full {full.length}</Badge>
        </div>

        <Tabs defaultValue="simple">
          <TabsList>
            <TabsTrigger value="simple">Simple Liftor Guide</TabsTrigger>
            <TabsTrigger value="full">Full Operating Manual</TabsTrigger>
            <TabsTrigger value="flow">New business flow</TabsTrigger>
          </TabsList>

          <TabsContent value="simple">
            <div className="flex justify-end mb-2">
              <Button size="sm" variant="ghost" onClick={() => downloadMarkdown("Liftor Simple Guide", LIFTOR_SIMPLE_GUIDE)}>
                <Download className="h-4 w-4 mr-2" /> Download
              </Button>
            </div>
            <ScrollArea className="h-[420px] pr-3">
              <div className="space-y-4">
                {simple.map(s => (
                  <div key={s.key} id={s.key} className="border-l-2 border-primary/40 pl-3">
                    <h4 className="text-sm font-semibold">{s.number}. {s.title}</h4>
                    <p className="text-sm text-muted-foreground mt-1">{s.body}</p>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="full">
            <div className="flex justify-end mb-2">
              <Button size="sm" variant="ghost" onClick={() => downloadMarkdown("Liftor Full Operating Manual", LIFTOR_FULL_GUIDE)}>
                <Download className="h-4 w-4 mr-2" /> Download
              </Button>
            </div>
            <ScrollArea className="h-[420px] pr-3">
              <div className="space-y-4">
                {full.map(s => (
                  <div key={s.key} id={s.key} className="border-l-2 border-primary/40 pl-3">
                    <h4 className="text-sm font-semibold">{s.number}. {s.title}</h4>
                    <p className="text-sm text-muted-foreground mt-1">{s.body}</p>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="flow">
            <ol className="text-sm text-muted-foreground list-decimal pl-5 space-y-1">
              {NEW_BUSINESS_OPERATING_FLOW.map((step, i) => <li key={i}>{step}</li>)}
            </ol>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default LiftorUserManualPanel;