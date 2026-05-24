import { Badge } from "@/components/ui/badge";
import { ShieldAlert, ShieldCheck, Lock, AlertTriangle } from "lucide-react";
import { summariseSecurityFlags } from "@/services/aiSecurityGuard";

interface Props {
  audit_metadata: unknown;
  compact?: boolean;
}

/**
 * Renders the security indicators surfaced for any AI ledger / approval row:
 *  - Sensitive data redacted
 *  - Prompt injection risk detected
 *  - External content treated as untrusted
 *  - Human approval required
 */
export default function AISecurityBadges({ audit_metadata, compact }: Props) {
  const s = summariseSecurityFlags(audit_metadata);
  const items: { label: string; cls: string; icon: React.ReactNode; title: string }[] = [];
  if (s.redacted) items.push({
    label: "Sensitive data redacted",
    cls: "bg-amber-500/15 text-amber-400 border-amber-500/30",
    icon: <Lock className="h-3 w-3 mr-1" />,
    title: "Secrets, PII or regulated content was replaced before storage.",
  });
  if (s.injection) items.push({
    label: "Prompt injection risk detected",
    cls: "bg-red-500/15 text-red-400 border-red-500/30",
    icon: <ShieldAlert className="h-3 w-3 mr-1" />,
    title: "External content tried to override Liftor rules. Action gated.",
  });
  if (s.untrusted) items.push({
    label: "External content treated as untrusted",
    cls: "bg-sky-500/15 text-sky-400 border-sky-500/30",
    icon: <AlertTriangle className="h-3 w-3 mr-1" />,
    title: "Email/web/document content is data, not instructions.",
  });
  if (s.review_required) items.push({
    label: "Human approval required",
    cls: "bg-orange-500/15 text-orange-400 border-orange-500/30",
    icon: <ShieldCheck className="h-3 w-3 mr-1" />,
    title: "No external action will proceed until founder approves.",
  });
  if (items.length === 0) return null;
  return (
    <div className={`flex flex-wrap gap-1.5 ${compact ? "" : "mt-2"}`}>
      {items.map((i) => (
        <Badge key={i.label} variant="outline" className={`${i.cls} text-[10px] py-0.5`} title={i.title}>
          {i.icon}{i.label}
        </Badge>
      ))}
      {s.categories.length > 0 && (
        <Badge variant="outline" className="text-[10px] py-0.5" title="Detected categories">
          {s.categories.join(", ")}
        </Badge>
      )}
    </div>
  );
}