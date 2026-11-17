import { Link, useLocation } from "react-router-dom";

/** Row of links to tools that were combined into this page (see founderAreas). */
export default function RelatedToolTabs({ tabs }: { tabs: { to: string; label: string }[] }) {
  const { pathname } = useLocation();
  return (
    <nav aria-label="Related tools" className="flex flex-wrap gap-2">
      {tabs.map((t) => (
        <Link
          key={t.to}
          to={t.to}
          className={`rounded-md border px-3 py-1 text-xs transition-colors ${pathname === t.to ? "border-primary text-primary" : "border-border text-muted-foreground hover:text-foreground"}`}
        >
          {t.label}
        </Link>
      ))}
    </nav>
  );
}
