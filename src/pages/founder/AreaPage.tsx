import { Link, useParams, Navigate } from "react-router-dom";
import FounderLayout from "@/components/founder/FounderLayout";
import { areaByKey } from "@/lib/founderAreas";
import { ArrowLeft, ArrowRight } from "lucide-react";

export default function AreaPage() {
  const { areaKey = "" } = useParams();
  const area = areaByKey(areaKey);
  if (!area) return <Navigate to="/founder" replace />;
  const main = area.sections.filter((s) => !s.legacy);
  const older = area.sections.filter((s) => s.legacy);
  return (
    <FounderLayout>
      <div className="space-y-6">
        <Link to="/founder" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary"><ArrowLeft size={12} /> Liftor HQ</Link>
        <header>
          <div className="text-xs text-muted-foreground">Area {area.n}</div>
          <h1 className="text-2xl font-bold text-foreground">{area.title}</h1>
          <p className="text-sm text-muted-foreground">{area.summary}</p>
        </header>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {main.map((s) => (
            <Link key={s.route} to={s.route} className="tech-card group rounded-xl border border-border bg-card p-4 hover:border-primary transition-colors">
              <div className="flex items-center justify-between"><h2 className="font-semibold text-foreground">{s.label}</h2><ArrowRight size={14} className="text-primary" /></div>
              <p className="text-xs text-muted-foreground mt-1">{s.desc}</p>
            </Link>
          ))}
        </div>
        {older.length > 0 && (
          <section>
            <h2 className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Older versions (kept, still work)</h2>
            <ul className="space-y-1">
              {older.map((s) => <li key={s.route}><Link to={s.route} className="text-sm text-muted-foreground hover:text-primary">{s.label}</Link> <span className="text-xs text-muted-foreground/70">— {s.desc}</span></li>)}
            </ul>
          </section>
        )}
      </div>
    </FounderLayout>
  );
}
