import { Link } from "react-router-dom";
import { ChevronRight, ArrowLeft, Command } from "lucide-react";

type Props = {
  page: string;
  description?: string;
  showHubLink?: boolean;
};

/**
 * Reusable breadcrumb + back-to-Command-Centre header for every
 * /founder/ai-cost/* page. Keeps founder oriented inside the
 * AI Cost Governor section without hunting through the sidebar.
 */
export default function AICostBreadcrumb({ page, description, showHubLink = true }: Props) {
  return (
    <div className="mb-4 space-y-2">
      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <Link to="/founder/command-centre" className="inline-flex items-center gap-1 hover:text-primary">
          <Command className="h-3 w-3" /> Command Centre
        </Link>
        <ChevronRight className="h-3 w-3" />
        {showHubLink ? (
          <Link to="/founder/ai-cost" className="hover:text-primary">
            AI Cost Governor
          </Link>
        ) : (
          <span>AI Cost Governor</span>
        )}
        <ChevronRight className="h-3 w-3" />
        <span className="text-foreground font-medium">{page}</span>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Link
          to="/founder/command-centre"
          className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-md border border-border/60 hover:border-primary/60 hover:text-primary"
        >
          <ArrowLeft className="h-3 w-3" /> Back to Command Centre
        </Link>
        {showHubLink && (
          <Link
            to="/founder/ai-cost"
            className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-md border border-border/60 hover:border-primary/60 hover:text-primary"
          >
            AI Cost Governor hub
          </Link>
        )}
        <span className="ml-auto inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
          Live Operating Mode
        </span>
      </div>
      {description && (
        <p className="text-xs text-muted-foreground">{description}</p>
      )}
    </div>
  );
}

/** Wrapper used in App.tsx to inject the breadcrumb above any AI Cost Governor page. */
export function AICostShell({
  page,
  description,
  children,
}: {
  page: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <div className="max-w-7xl mx-auto px-4 pt-4">
        <AICostBreadcrumb page={page} description={description} />
      </div>
      {children}
    </div>
  );
}