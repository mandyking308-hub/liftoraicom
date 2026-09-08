/** Read every mailbox page. A failed/malformed/repeated page is not an empty
 * account and must never be presented as zero connected mailboxes. */
export async function collectSmartleadAccounts(get: (offset:number)=>Promise<{status:number;body:any}>) {
 const accounts:any[]=[];const seen=new Set<string>();
 for(let page=0;page<50;page++) {
  const r=await get(page*100);
  if(r.status<200||r.status>=300)return {ok:false,status:r.status,accounts:null,error:"email_accounts_read_failed"};
  const rows=Array.isArray(r.body)?r.body:Array.isArray(r.body?.data)?r.body.data:Array.isArray(r.body?.results)?r.body.results:null;
  if(!rows)return {ok:false,status:r.status,accounts:null,error:"email_accounts_response_not_recognised"};
  for(const row of rows) {
    const key=String(row.id??row.email_account_id??row.from_email??row.email??"");
    if(!key||seen.has(key))return {ok:false,status:r.status,accounts:null,error:"email_accounts_pagination_repeated_or_missing_identity"};
    seen.add(key);accounts.push(row);
  }
  if(rows.length<100)return {ok:true,status:r.status,accounts,error:null};
 }
 return {ok:false,status:200,accounts:null,error:"email_accounts_pagination_limit_reached"};
}
