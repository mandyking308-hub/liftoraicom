import { PGlite } from "@electric-sql/pglite";
import { beforeAll,afterAll,beforeEach,describe,it,expect } from "vitest";
import { readFileSync } from "node:fs";
import { normaliseSmartleadEvent } from "../functions/_shared/smartleadEvents";
import { transferLeads, TRANSFER_SETTINGS } from "../functions/_shared/smartleadTransfer";

const B="10000000-0000-0000-0000-000000000001", B2="10000000-0000-0000-0000-000000000002";
const C="20000000-0000-0000-0000-000000000001", C2="20000000-0000-0000-0000-000000000002";
const M="30000000-0000-0000-0000-000000000001", M2="30000000-0000-0000-0000-000000000002";
const P="40000000-0000-0000-0000-000000000001", P2="40000000-0000-0000-0000-000000000002";
let db:PGlite;
const migration=readFileSync("supabase/migrations/20260908124846_smartlead_outreach_wiring.sql","utf8");
beforeAll(async()=>{db=new PGlite();await db.exec(readFileSync("supabase/tests/smartlead-fixture.sql","utf8"));await db.exec(migration);});
afterAll(async()=>{await db.close();});
beforeEach(async()=>{
 await db.exec(`TRUNCATE public.businesses,public.contacts,public.outreach_campaigns,public.outbound_provider_campaign_mappings,
 public.outbound_provider_lead_mappings,public.business_contact_relationships,public.email_queue,
 public.external_action_gates,public.business_operating_profiles,public.outbound_provider_events,
 public.communication_records,public.communication_threads,public.communication_thread_messages CASCADE;`);
 await db.query("INSERT INTO businesses(id,name) VALUES($1,'Business One'),($2,'Business Two')",[B,B2]);
 await db.query("INSERT INTO outreach_campaigns VALUES($1,'Business One'),($2,'Business Two')",[P,P2]);
 await db.query("INSERT INTO outbound_provider_campaign_mappings(id,business_id,liftor_campaign_id,provider_type,provider_campaign_id,is_active,mapping_status) VALUES($1,$2,$3,'smartlead','123',true,'mapped'),($4,$5,$6,'smartlead','456',true,'mapped')",[M,B,P,M2,B2,P2]);
 await db.query("INSERT INTO contacts(id,email,name,assigned_business,active_campaign_id,sendable_status,email_verified_status,lawful_basis,unsubscribe_token,compliance_status) VALUES($1,'a_b%tag@example.com','Existing Person','Business One',$2,'sendable','verified','recorded','token','outreach_allowed')",[C,P]);
});
const rpc=async(name:string,args:unknown[])=>{const r=await db.query<any>(`SELECT public.${name}(${args.map((_,i)=>`$${i+1}`).join(',')}) AS result`,args);return r.rows[0].result;};
const mapRow=(over:Record<string,unknown>={})=>({business_id:B,liftor_contact_id:C,liftor_campaign_id:P,campaign_mapping_id:M,provider_campaign_id:"123",provider_lead_id:"789",contact_email:"a_b%tag@example.com",metadata:{provider_flags:{}},provider_response:{},...over});

it("migration prevents case-insensitive identity duplicates",async()=>{
 await expect(db.query("INSERT INTO contacts(email) VALUES(' A_B%TAG@EXAMPLE.COM ')")).rejects.toThrow();
});
it("literal matching does not interpret underscore and percent as wildcards",async()=>{
 await db.query("INSERT INTO contacts(email) VALUES('axbZZtag@example.com')");
 const r=await db.query<any>("SELECT id FROM smartlead_find_contacts_by_emails($1)",[["A_B%TAG@example.com"]]);
 expect(r.rows.map(x=>x.id)).toEqual([C]);
});
it("re-import preserves current suppression, stronger verification and populated profile",async()=>{
 await db.query("UPDATE contacts SET is_globally_suppressed=true WHERE id=$1",[C]);
 await rpc("smartlead_merge_contact",[C,{name:"Overwrite",email_verified_status:"unknown",sendable_status:"sendable",is_globally_suppressed:false}]);
 const r=(await db.query<any>("SELECT * FROM contacts WHERE id=$1",[C])).rows[0];
 expect(r.name).toBe("Existing Person");expect(r.email_verified_status).toBe("verified");expect(r.is_globally_suppressed).toBe(true);
});
it("relationship conflicts retain opt-out and existing campaign progress",async()=>{
 await db.query("INSERT INTO business_contact_relationships(contact_id,business_id,business_name,do_not_contact,current_stage) VALUES($1,$2,'Business One',true,'do_not_contact')",[C,B]);
 await rpc("smartlead_merge_relationship",[{contact_id:C,business_id:B,business_name:"Business One",do_not_contact:false,campaign_eligible:true}]);
 const r=(await db.query<any>("SELECT * FROM business_contact_relationships")).rows[0];
 expect(r.do_not_contact).toBe(true);expect(r.current_stage).toBe("do_not_contact");expect(r.campaign_eligible).toBe(false);
});
it("contact/provenance retries create one mapping and reconcile a reserved upload",async()=>{
 await db.query("INSERT INTO outbound_provider_lead_mappings(business_id,liftor_contact_id,liftor_campaign_id,campaign_mapping_id,provider_campaign_id,contact_email,push_status) VALUES($1,$2,$3,$4,'123','a_b%tag@example.com','pushing')",[B,C,P,M]);
 await rpc("smartlead_merge_lead_mapping",[mapRow()]);await rpc("smartlead_merge_lead_mapping",[mapRow()]);
 const r=await db.query<any>("SELECT * FROM outbound_provider_lead_mappings");
 expect(r.rows).toHaveLength(1);expect(r.rows[0].push_status).toBe("pushed");expect(r.rows[0].provider_lead_id).toBe("789");
});
it("provenance collision never transfers ownership to another business",async()=>{
 await rpc("smartlead_merge_lead_mapping",[mapRow()]);
 await expect(rpc("smartlead_merge_lead_mapping",[mapRow({business_id:B2})])).rejects.toThrow("ownership_conflict");
});
it("preview and claims exclude opt-outs, other businesses, existing leads and invalid verification",async()=>{
 expect((await db.query("SELECT id FROM smartlead_transfer_candidates($1)",[M])).rows).toHaveLength(1);
 await db.query("UPDATE contacts SET assigned_business='Business Two' WHERE id=$1",[C]);
 expect((await db.query("SELECT id FROM smartlead_transfer_candidates($1)",[M])).rows).toHaveLength(0);
 await db.query("UPDATE contacts SET assigned_business='Business One',email_verified_status='unknown' WHERE id=$1",[C]);
 expect((await db.query("SELECT id FROM smartlead_transfer_candidates($1)",[M])).rows).toHaveLength(0);
});
it("claims are persistent, gated and never claimed again after a timeout",async()=>{
 await expect(rpc("smartlead_claim_transfer",[M,[C],crypto.randomUUID()])).rejects.toThrow("gate_disabled");
 await db.exec("INSERT INTO external_action_gates VALUES('smartlead_lead_push_gate',true)");
 await db.query("INSERT INTO business_operating_profiles VALUES($1,true)",[B]);
 const first=await rpc("smartlead_claim_transfer",[M,[C],crypto.randomUUID()]);
 expect(first).toHaveLength(1);
 expect(await rpc("smartlead_claim_transfer",[M,[C],crypto.randomUUID()])).toHaveLength(0);
});
async function event(payload:Record<string,unknown>) {
 const n=await normaliseSmartleadEvent(payload);
 const r=await db.query<any>("INSERT INTO outbound_provider_events(provider_type,provider_event_type,provider_campaign_id,provider_lead_id,normalized_payload,dedupe_key) VALUES('smartlead',$1,$2,$3,$4,$5) RETURNING id",[n.event_type,n.provider_campaign_id,n.provider_lead_id,n,n.dedupe_key]);
 return r.rows[0].id;
}
it("reply is applied once into business-scoped communications without legacy AI invocation",async()=>{
 await rpc("smartlead_merge_lead_mapping",[mapRow()]);
 const id=await event({event_type:"EMAIL_REPLY",campaign_id:123,to_email:"a_b%tag@example.com",time_replied:"2026-09-08T11:00:00Z",reply_body:"<p>Please arrange a call.</p>"});
 const a=await rpc("smartlead_apply_provider_event",[id]);expect(a.applied).toBe(true);expect(a.business_id).toBe(B);
 const b=await rpc("smartlead_apply_provider_event",[id]);expect(b.duplicate).toBe(true);
 expect((await db.query("SELECT * FROM communication_records")).rows).toHaveLength(1);
 expect((await db.query("SELECT * FROM communication_thread_messages")).rows).toHaveLength(1);
 const c=(await db.query<any>("SELECT * FROM contacts WHERE id=$1",[C])).rows[0];expect(c.conversation_active).toBe(true);expect(c.status).toBe("ENGAGED");
});
it("same contact's two businesses get distinct threads",async()=>{
 await rpc("smartlead_merge_lead_mapping",[mapRow()]);
 await rpc("smartlead_merge_lead_mapping",[mapRow({business_id:B2,campaign_mapping_id:M2,liftor_campaign_id:P2,provider_campaign_id:"456"})]);
 for(const campaign_id of [123,456])await rpc("smartlead_apply_provider_event",[await event({event_type:"EMAIL_REPLY",campaign_id,to_email:"a_b%tag@example.com",message_id:"reply"+campaign_id,reply_body:"Interested"})]);
 expect((await db.query("SELECT * FROM smartlead_contact_threads")).rows).toHaveLength(2);
});
it("unsubscribes cancel queued messages and remain suppressed after re-import",async()=>{
 await rpc("smartlead_merge_lead_mapping",[mapRow()]);
 await db.query("INSERT INTO email_queue(contact_id,campaign_id,status) VALUES($1,$2,'pending'),($1,$3,'delayed')",[C,P,P2]);
 await rpc("smartlead_apply_provider_event",[await event({event_type:"LEAD_UNSUBSCRIBED",campaign_id:123,lead_email:"a_b%tag@example.com"})]);
 await rpc("smartlead_merge_contact",[C,{name:"Another Name",sendable_status:"sendable"}]);
 const c=(await db.query<any>("SELECT * FROM contacts WHERE id=$1",[C])).rows[0];expect(c.is_globally_suppressed).toBe(true);expect(c.sendable_status).toBe("suppressed");
 expect((await db.query<any>("SELECT * FROM email_queue")).rows.every(r=>r.status==="cancelled")).toBe(true);
});
it("unmapped events make no operational writes and can be retried after import",async()=>{
 const id=await event({event_type:"EMAIL_REPLY",campaign_id:123,to_email:"a_b%tag@example.com",message_id:"reply1",reply_body:"Hello"});
 await expect(rpc("smartlead_apply_provider_event",[id])).rejects.toThrow("mapping_missing");
 expect((await db.query("SELECT * FROM communication_records")).rows).toHaveLength(0);
 await rpc("smartlead_merge_lead_mapping",[mapRow()]);expect((await rpc("smartlead_apply_provider_event",[id])).applied).toBe(true);
});
it("RPCs are unavailable to public/authenticated clients and setup obeys RLS",async()=>{
 await db.exec("SET ROLE authenticated");
 try {await expect(rpc("smartlead_apply_provider_event",[crypto.randomUUID()])).rejects.toThrow("permission denied");}
 finally {await db.exec("RESET ROLE");}
 expect((await db.query<any>("SELECT relrowsecurity FROM pg_class WHERE relname='smartlead_business_setup'")).rows[0].relrowsecurity).toBe(true);
});

describe("provider transfer outcomes",()=>{
 const io=(over:Record<string,any>={})=>({readCampaign:async()=>({status:200,body:{status:"DRAFT"}}),claim:async()=>[{mapping_id:"lm",contact:{id:C,email:"a@b.com"}}],addLeads:async()=>({status:200,body:{success:true,added_count:1,skipped_count:0}}),record:async()=>{},...over});
 it("never posts into a running campaign",async()=>{
  let posted=false;await expect(transferLeads(io({readCampaign:async()=>({status:200,body:{status:"ACTIVE"}}),addLeads:async()=>{posted=true;}}),B,P)).rejects.toThrow("draft_or_paused");expect(posted).toBe(false);
 });
 it("retains claims after ambiguous results and never disables provider block lists",async()=>{
  let status="";const r=await transferLeads(io({addLeads:async(body:any)=>{expect(body.settings).toEqual(TRANSFER_SETTINGS);return {status:0,body:null};},record:async(_:any,s:string)=>{status=s;}}),B,P);
  expect(status).toBe("pushing");expect(r.reconciliation_required).toBe(true);expect(r.leads_pushed).toBe(0);
 });
 it("does not claim success when the provider accepted but the database write failed",async()=>{
  const r=await transferLeads(io({record:async()=>{throw new Error("db down");}}),B,P);expect(r.ok).toBe(false);expect(r.reconciliation_required).toBe(true);
 });
 it("does not assign skipped records to successful contact IDs",async()=>{
  const r=await transferLeads(io({addLeads:async()=>({status:200,body:{success:true,added_count:0,skipped_count:1}})}),B,P);expect(r.reconciliation_required).toBe(true);expect(r.leads_pushed).toBe(0);
 });
});

it("normalises actual Smartlead fields and deduplicates FIRST_EMAIL_SENT/EMAIL_SENT",async()=>{
 const p={campaign_id:123,to_email:" A@EXAMPLE.COM ",from_email:"sender@brand.com",message_id:"message1",time_sent:"2026-09-08T11:00:00Z",custom_email_message:"<p>Hello</p>"};
 const a=await normaliseSmartleadEvent({...p,event_type:"FIRST_EMAIL_SENT"});const b=await normaliseSmartleadEvent({...p,event_type:"EMAIL_SENT"});
 expect(a.email).toBe("a@example.com");expect(a.dedupe_key).toBe(b.dedupe_key);
});

import { collectSmartleadAccounts } from "../functions/_shared/smartleadAccounts";
import { historyEvents } from "../functions/_shared/smartleadHistory";
it("counts all 200 mailboxes and does not hide a failure after page one",async()=>{
 const get=async(offset:number)=>({status:200,body:offset>=200?[]:Array.from({length:100},(_,i)=>({id:offset+i}))});
 expect((await collectSmartleadAccounts(get)).accounts).toHaveLength(200);
 const failed=await collectSmartleadAccounts(async offset=>offset===0?get(offset):({status:403,body:null}));
 expect(failed.ok).toBe(false);expect(failed.accounts).toBeNull();
});
it("rejects a provider ignoring mailbox pagination",async()=>{
 const r=await collectSmartleadAccounts(async()=>({status:200,body:Array.from({length:100},(_,id)=>({id}))}));
 expect(r.ok).toBe(false);expect(r.error).toContain("repeated");
});
it("message history rejects missing bodies and unrecognised response envelopes",()=>{
 expect(()=>historyEvents({messages:[{id:1,direction:"inbound"}]},"123","789","a@example.com")).toThrow("body_missing");
 expect(()=>historyEvents({error:"Forbidden"},"123","789","a@example.com")).toThrow("not_recognised");
 const r=historyEvents({messages:[{id:"one",direction:"inbound",body_text:"Please call me",received_at:"2026-09-08T13:00:00Z"}]},"123","789","a@example.com");
 expect(r[0].event_type).toBe("EMAIL_REPLY");expect(r[0].reply_body).toBe("Please call me");
});


it("accepts the documented DRAFTED provider status without starting a campaign", async()=>{
 let uploaded=false;
 const r=await transferLeads({readCampaign:async()=>({status:200,body:{success:true,data:{status:"DRAFTED"}}}),
 claim:async()=>[{mapping_id:"lm",contact:{id:C,email:"a@b.com"}}],
 addLeads:async()=>{uploaded=true;return {status:200,body:{success:true,added_count:1,skipped_count:0}};},record:async()=>{}},B,P);
 expect(uploaded).toBe(true);expect(r.leads_pushed).toBe(1);
});
