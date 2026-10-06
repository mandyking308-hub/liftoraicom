import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { parseCanaryEmails } from "@/lib/gsmCanaryEmails";

export const GHAT_CONNECT_CONFIRMATION = "CONNECT GHAT MAILBOXES TO SMARTLEAD";
export const GHAT_MAX_APPLY = 10;

export const buildGhatPreviewBody = (emails: string[]): Record<string, unknown> =>
  emails.length ? { apply: false, emails } : { apply: false };

export const buildGhatApplyBody = (emails: string[]): Record<string, unknown> => {
  if (emails.length < 1 || emails.length > GHAT_MAX_APPLY) throw new Error("ghat_list_must_have_1_to_10_emails");
  return { apply: true, emails, external_action_confirmation: GHAT_CONNECT_CONFIRMATION };
};

interface Props {
  busy: boolean;
  onPreview: (body: Record<string, unknown>) => void;
  onApply: (body: Record<string, unknown>) => void;
  confirm?: (message: string) => boolean;
}

/** Founder-only GHAT -> Smartlead mailbox list. Never handles credentials. */
export default function GhatSmartleadControls({ busy, onPreview, onApply, confirm = (m) => window.confirm(m) }: Props) {
  const [raw, setRaw] = useState("");
  const emails = useMemo(() => parseCanaryEmails(raw), [raw]);
  const canApply = emails.length >= 1 && emails.length <= GHAT_MAX_APPLY;

  return (
    <div className="space-y-2">
      <label htmlFor="ghat-mailbox-list" className="text-sm font-medium">
        GHAT mailbox list (1–10 exact addresses, comma or new line)
      </label>
      <Textarea
        id="ghat-mailbox-list"
        value={raw}
        onChange={(e) => setRaw(e.target.value)}
        rows={4}
        placeholder="Leave blank to preview the whole GHAT estate"
      />
      <div className="text-xs text-muted-foreground" data-testid="ghat-list-count">
        {emails.length} unique address{emails.length === 1 ? "" : "es"}
        {emails.length > GHAT_MAX_APPLY ? ` — maximum ${GHAT_MAX_APPLY} to connect` : ""}
      </div>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="outline" disabled={busy} onClick={() => onPreview(buildGhatPreviewBody(emails))}>
          Preview connection
        </Button>
        <Button
          size="sm"
          disabled={busy || !canApply}
          onClick={() =>
            confirm(
              `Connect ${emails.length} GHAT mailbox(es) to Smartlead as sending accounts? Warm-up stays off, no campaign is created, no lead is pushed and no email is sent.`,
            ) && onApply(buildGhatApplyBody(emails))
          }
        >
          Connect mailboxes
        </Button>
      </div>
    </div>
  );
}
