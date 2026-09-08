export function historyEvents(body: any, campaignId: string, leadId: string, email: string): Record<string,unknown>[] {
  const messages = Array.isArray(body?.messages) ? body.messages : Array.isArray(body?.history) ? body.history : null;
  if (!messages) throw new Error("message_history_response_not_recognised");
  return messages.map((m:any) => {
    const direction=String(m.direction ?? m.type ?? "").toLowerCase();
    const inbound=["inbound","reply","replied"].includes(direction);
    if (!inbound && !["outbound","sent"].includes(direction)) throw new Error("message_direction_not_recognised");
    const content=m.body_text ?? m.plain_text ?? m.email_body ?? m.body ?? m.message;
    if (typeof content!=="string" || !content.trim()) throw new Error("message_body_missing_from_provider");
    return { event_type:inbound?"EMAIL_REPLY":"EMAIL_SENT",campaign_id:campaignId,lead_id:leadId,to_email:email,
      message_id:m.message_id ?? m.id,subject:m.subject,event_timestamp:m.received_at ?? m.sent_at ?? m.time,
      ...(inbound?{reply_body:content}:{custom_email_message:content}) };
  });
}
