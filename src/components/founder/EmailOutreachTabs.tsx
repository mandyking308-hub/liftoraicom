import RelatedToolTabs from "@/components/founder/RelatedToolTabs";

/** The three Email outreach pages, with a live-refresh indicator. Each fact lives on one page only. */
export default function EmailOutreachTabs({ updatedAt }: { updatedAt?: Date | null }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <RelatedToolTabs tabs={[
        { to: "/founder/outreach-command-centre", label: "Campaigns" },
        { to: "/founder/gsm-outbound", label: "Mailboxes" },
        { to: "/founder/conversations", label: "Replies" },
      ]} />
      <span className="flex items-center gap-1.5 text-xs text-muted-foreground" aria-live="polite">
        <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
        Live · refreshes every 30 seconds{updatedAt ? ` · updated ${updatedAt.toLocaleTimeString("en-GB")}` : ""}
      </span>
    </div>
  );
}
