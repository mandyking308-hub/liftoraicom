import RelatedToolTabs from "@/components/founder/RelatedToolTabs";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";

/** The three Email outreach pages, with an on-demand Update button. Each fact lives on one page only. */
export default function EmailOutreachTabs({ live }: { live?: { at: Date | null; refresh: () => void; busy: boolean } }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <RelatedToolTabs tabs={[
        { to: "/founder/outreach-command-centre", label: "Campaigns" },
        { to: "/founder/gsm-outbound", label: "Mailboxes" },
        { to: "/founder/conversations", label: "Replies" },
      ]} />
      {live && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span aria-live="polite">{live.at ? `Figures as of ${live.at.toLocaleTimeString("en-GB")}` : "Loading…"}</span>
          <Button size="sm" variant="outline" onClick={live.refresh} disabled={live.busy}>
            <RefreshCw className={`mr-1 h-3 w-3 ${live.busy ? "animate-spin" : ""}`} />Update
          </Button>
        </div>
      )}
    </div>
  );
}
