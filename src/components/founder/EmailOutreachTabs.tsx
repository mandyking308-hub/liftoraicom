import RelatedToolTabs from "@/components/founder/RelatedToolTabs";

/** The three Email outreach pages. Each fact lives on one of them only. */
export default function EmailOutreachTabs() {
  return <RelatedToolTabs tabs={[
    { to: "/founder/outreach-command-centre", label: "Campaigns" },
    { to: "/founder/gsm-outbound", label: "Mailboxes" },
    { to: "/founder/conversations", label: "Replies" },
  ]} />;
}
