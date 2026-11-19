import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download } from "lucide-react";
import { founderAreas } from "@/lib/founderAreas";
import { AREA_GUIDES, GETTING_STARTED, LIFTOR_PAGE_GUIDE_VERSION, activeSections, olderSections, buildPageGuideMarkdown } from "@/lib/liftorPageGuide";

const download = () => {
  const blob = new Blob([buildPageGuideMarkdown()], { type: "text/markdown" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "liftor-user-guide-every-page.md";
  a.click();
};

export const LiftorPageGuide = ({ q = "" }: { q?: string }) => {
  const needle = q.toLowerCase();
  const areas = founderAreas.filter((a) => !needle || JSON.stringify([a, AREA_GUIDES[a.key]]).toLowerCase().includes(needle));
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <Badge variant="outline">Version {LIFTOR_PAGE_GUIDE_VERSION}</Badge>
        <Button size="sm" variant="ghost" onClick={download}><Download className="h-4 w-4 mr-2" />Download</Button>
      </div>
      {!needle && (
        <section className="space-y-2">
          <h3 className="font-semibold">Getting started</h3>
          {GETTING_STARTED.map((g) => <p key={g.title} className="text-sm"><strong>{g.title}.</strong> <span className="text-muted-foreground">{g.body}</span></p>)}
        </section>
      )}
      {areas.map((a) => {
        const g = AREA_GUIDES[a.key];
        const old = olderSections(a);
        return (
          <section key={a.key} className="space-y-2 border-t border-border pt-4">
            <h3 className="font-semibold">{a.n}. {a.title}</h3>
            {g && <>
              <p className="text-sm"><strong>What it's for:</strong> {g.purpose}</p>
              <ol className="list-decimal pl-5 text-sm text-muted-foreground space-y-1">{g.howTo.map((h) => <li key={h}>{h}</li>)}</ol>
              <p className="text-sm"><strong>Safety:</strong> <span className="text-muted-foreground">{g.safety}</span></p>
            </>}
            <ul className="text-sm space-y-1">
              {activeSections(a).map((s) => <li key={s.route}><Link className="text-primary hover:underline" to={s.route}>{s.label}</Link> <span className="text-muted-foreground">— {s.desc}</span></li>)}
            </ul>
            {old.length > 0 && (
              <details className="text-xs text-muted-foreground">
                <summary className="cursor-pointer">Older versions ({old.length}) — still open, nothing deleted</summary>
                <ul className="mt-1 space-y-0.5 pl-4">{old.map((s) => <li key={s.route}><Link className="hover:underline" to={s.route}>{s.label}</Link> — {s.desc}</li>)}</ul>
              </details>
            )}
          </section>
        );
      })}
    </div>
  );
};
