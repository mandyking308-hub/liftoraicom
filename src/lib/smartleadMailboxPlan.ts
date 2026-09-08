export interface MailboxPlan {
  business_id:string; website:string; sender_name:string; reply_owner_email:string;
  proposed_domains:string[]; mailbox_target:number; daily_per_mailbox:number;
}
export function mailboxCapacity(plans:MailboxPlan[]) {
  const mailboxes=plans.reduce((n,p)=>n+(Number.isFinite(p.mailbox_target)?p.mailbox_target:0),0);
  const daily=plans.reduce((n,p)=>n+(Number.isFinite(p.mailbox_target*p.daily_per_mailbox)?p.mailbox_target*p.daily_per_mailbox:0),0);
  return {mailboxes,daily,monthly:daily*22};
}
export function validateMailboxPlan(plans:MailboxPlan[]):string|null {
  if(!plans.length)return "Choose at least one business.";
  if(new Set(plans.map(p=>p.business_id)).size!==plans.length)return "Each business needs one mailbox plan.";
  const domains=new Set<string>();
  for(const p of plans) {
    if(!p.sender_name.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(p.reply_owner_email.trim())) return "Add a sender name and valid reply owner email for each business.";
    try {if(!["https:","http:"].includes(new URL(p.website).protocol))throw new Error();}catch{return "Add a valid business website beginning with https://.";}
    if(!Number.isInteger(p.mailbox_target)||p.mailbox_target<1||p.mailbox_target>200||!Number.isInteger(p.daily_per_mailbox)||p.daily_per_mailbox<1||p.daily_per_mailbox>50)return "Use whole-number mailbox targets and daily limits within the displayed range.";
    for(const raw of p.proposed_domains) {
      const domain=raw.trim().toLowerCase();
      if(!domain)continue;
      if(!/^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}$/.test(domain))return "Use domain names without https:// or paths.";
      if(domains.has(domain))return "Assign each sending domain to only one business.";
      domains.add(domain);
    }
  }
  if(mailboxCapacity(plans).mailboxes>200||domains.size>40)return "This plan exceeds Winnr Enterprise’s included 200 mailboxes or 40 domain slots.";
  return null;
}
