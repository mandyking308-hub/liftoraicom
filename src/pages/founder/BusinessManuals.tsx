import { useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import FounderLayout from "@/components/founder/FounderLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BUSINESS_MANUALS, BusinessManualKind } from "@/lib/businessManuals/registry";
import { EDUCATION_BUSINESSES, EducationBusinessSlug } from "@/lib/education/educationBusinesses";
import { BookOpen, Github } from "lucide-react";

const KINDS: { key: BusinessManualKind; label: string }[] = [
  { key: "technical-manual", label: "Technical Manual" },
  { key: "user-guide", label: "User Guide" },
  { key: "customer-facing-manual", label: "Customer-Facing" },
];

export default function BusinessManualsPage() {
  const [slug, setSlug] = useState<EducationBusinessSlug>("billy-and-the-wild-forest");
  const [kind, setKind] = useState<BusinessManualKind>("technical-manual");

  const manual = useMemo(
    () => BUSINESS_MANUALS.find((m) => m.business_slug === slug && m.kind === kind)!,
    [slug, kind],
  );

  return (
    <FounderLayout>
      <div className="max-w-6xl mx-auto p-4 space-y-4">
        <Card className="tech-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-primary" />
              Business Manuals
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Twelve manuals across four education businesses. Rendered directly from the canonical
              GitHub markdown — the app and the repository cannot drift apart.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {EDUCATION_BUSINESSES.map((b) => (
                <Button
                  key={b.slug}
                  size="sm"
                  variant={b.slug === slug ? "default" : "outline"}
                  onClick={() => setSlug(b.slug)}
                >
                  {b.name}
                </Button>
              ))}
            </div>

            <Tabs value={kind} onValueChange={(v) => setKind(v as BusinessManualKind)}>
              <TabsList>
                {KINDS.map((k) => (
                  <TabsTrigger key={k.key} value={k.key}>
                    {k.label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>

            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Github className="h-3 w-3" />
              <code>{manual.github_path}</code>
              <Badge variant="outline">single source of truth</Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="tech-card">
          <CardContent className="pt-6">
            <article className="prose prose-invert max-w-none prose-headings:scroll-mt-20">
              <ReactMarkdown>{manual.content}</ReactMarkdown>
            </article>
          </CardContent>
        </Card>
      </div>
    </FounderLayout>
  );
}
