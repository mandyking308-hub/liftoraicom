import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";

async function call(path: string, init: RequestInit) {
  const { data: sess } = await supabase.auth.getSession();
  const token = sess.session?.access_token ?? "";
  const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${path}`;
  const res = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, ...(init.headers || {}) },
  });
  return res.json();
}

export function SocialCalendarHealthPanel({ businessId }: { businessId: string }) {
  const [data, setData] = useState<any>(null);
  const refresh = () => businessId && call(`social-calendar-healthcheck?business_id=${businessId}`, { method: "GET" }).then(setData);
  useEffect(() => { refresh(); }, [businessId]);
  return (
    <Card><CardHeader className="flex flex-row items-center justify-between"><CardTitle className="text-base">Calendar Health</CardTitle>
      <Button size="sm" variant="outline" onClick={refresh}>Refresh</Button></CardHeader>
      <CardContent className="text-xs">
        {!data ? <p className="text-muted-foreground">No data.</p> :
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(data).filter(([k])=>!["ok","no_external_action"].includes(k)).map(([k,v])=>(
              <div key={k} className="flex justify-between"><span className="text-muted-foreground">{k}</span><span className="font-mono">{String(v)}</span></div>
            ))}
          </div>}
      </CardContent></Card>
  );
}

export function SocialCalendarGeneratorPanel({ businessId }: { businessId: string }) {
  const [type, setType] = useState("thirty_day");
  const [startDate, setStart] = useState(new Date().toISOString().slice(0,10));
  const [packId, setPackId] = useState("");
  const [phrase, setPhrase] = useState("");
  const [preview, setPreview] = useState<any>(null);
  const [saved, setSaved] = useState<any>(null);

  return (
    <Card><CardHeader><CardTitle className="text-base">Calendar Generator</CardTitle></CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div className="grid md:grid-cols-3 gap-2">
          <div><label className="text-xs text-muted-foreground">Type</label>
            <select className="w-full border rounded h-9 px-2 bg-background" value={type} onChange={e=>setType(e.target.value)}>
              <option value="seven_day">7 day</option><option value="fourteen_day">14 day</option>
              <option value="thirty_day">30 day</option><option value="ninety_day">90 day</option>
              <option value="campaign">campaign</option><option value="revenue_goal">revenue_goal</option>
              <option value="evergreen">evergreen</option><option value="launch">launch</option>
              <option value="retention">retention</option><option value="custom">custom</option>
            </select></div>
          <div><label className="text-xs text-muted-foreground">Start date</label>
            <Input type="date" value={startDate} onChange={e=>setStart(e.target.value)} /></div>
          <div><label className="text-xs text-muted-foreground">Content pack id (optional)</label>
            <Input value={packId} onChange={e=>setPackId(e.target.value)} placeholder="uuid" /></div>
        </div>
        <div className="flex gap-2">
          <Button size="sm" disabled={!businessId} onClick={async()=>{
            const r = await call("social-calendar-preview", { method:"POST", body: JSON.stringify({ business_id: businessId, calendar_type: type, start_date: startDate, content_pack_id: packId || undefined }) });
            setPreview(r);
          }}>Preview</Button>
          <Input className="max-w-[260px]" placeholder='confirmation: CREATE SOCIAL CALENDAR' value={phrase} onChange={e=>setPhrase(e.target.value)} />
          <Button size="sm" variant="default" disabled={!businessId || phrase!=="CREATE SOCIAL CALENDAR"} onClick={async()=>{
            const r = await call("social-calendar-create", { method:"POST", body: JSON.stringify({ business_id: businessId, calendar_type: type, start_date: startDate, content_pack_id: packId || undefined, dry_run:false, confirmation_phrase: phrase }) });
            setSaved(r);
          }}>Create calendar</Button>
        </div>
        {preview && <pre className="text-xs bg-muted p-2 rounded max-h-64 overflow-auto">{JSON.stringify({ proposed_count: preview.proposed_count, readiness_score: preview.readiness_score, missing_assets: preview.missing_assets?.slice(0,5), warnings: preview.compliance_warnings?.slice(0,5) }, null, 2)}</pre>}
        {saved && <pre className="text-xs bg-muted p-2 rounded">{JSON.stringify(saved, null, 2)}</pre>}
      </CardContent></Card>
  );
}

function ItemBadge({ s, kind }: { s: string; kind: string }) {
  const tone = s.includes("block") || s.includes("missing") ? "destructive" : s.includes("ready") || s==="approved" || s==="passed" ? "default" : "secondary";
  return <Badge variant={tone as any} className="text-[10px]">{kind}:{s}</Badge>;
}

export function SocialCalendarDayView({ businessId }: { businessId: string }) {
  const [date, setDate] = useState(new Date().toISOString().slice(0,10));
  const [data, setData] = useState<any>(null);
  useEffect(()=>{ businessId && call(`social-calendar-day-view?business_id=${businessId}&date=${date}`, { method:"GET" }).then(setData); }, [businessId, date]);
  return (
    <Card><CardHeader className="flex flex-row items-center justify-between">
      <CardTitle className="text-base">Day View</CardTitle>
      <Input type="date" value={date} onChange={e=>setDate(e.target.value)} className="max-w-[180px]" />
    </CardHeader><CardContent>
      {!data?.items?.length ? <p className="text-xs text-muted-foreground">No items.</p> :
        <div className="space-y-2">{data.items.map((it:any)=>(
          <div key={it.id} className="flex items-center justify-between border rounded p-2 text-xs">
            <div className="flex items-center gap-2">
              <span className="font-mono">{(it.planned_time??"").slice(0,5)}</span>
              <Badge variant="outline" className="text-[10px]">{it.platform}</Badge>
              <span>{it.slot_label}</span>
            </div>
            <div className="flex gap-1 flex-wrap">
              <ItemBadge s={it.status} kind="status" />
              <ItemBadge s={it.asset_status} kind="asset" />
              <ItemBadge s={it.compliance_status} kind="compl" />
              <ItemBadge s={it.queue_readiness} kind="queue" />
            </div>
          </div>
        ))}</div>}
    </CardContent></Card>
  );
}

export function SocialCalendarWeekView({ businessId }: { businessId: string }) {
  const [start, setStart] = useState(new Date().toISOString().slice(0,10));
  const [data, setData] = useState<any>(null);
  useEffect(()=>{ businessId && call(`social-calendar-week-view?business_id=${businessId}&week_start=${start}`, { method:"GET" }).then(setData); }, [businessId, start]);
  return (
    <Card><CardHeader className="flex flex-row items-center justify-between"><CardTitle className="text-base">Week View</CardTitle>
      <Input type="date" value={start} onChange={e=>setStart(e.target.value)} className="max-w-[180px]" />
    </CardHeader><CardContent>
      {!data?.items?.length ? <p className="text-xs text-muted-foreground">No items.</p> :
        <div className="grid grid-cols-7 gap-2 text-xs">
          {Object.entries(data.by_day ?? {}).map(([d, list]: any)=>(
            <div key={d} className="border rounded p-2">
              <div className="font-mono text-[10px] mb-1">{d}</div>
              <div className="space-y-1">{list.map((i:any)=>(
                <div key={i.id} className="flex justify-between"><span>{i.platform}</span><span className={i.status==="blocked"?"text-destructive":""}>{(i.planned_time??"").slice(0,5)}</span></div>
              ))}</div>
            </div>
          ))}
        </div>}
    </CardContent></Card>
  );
}

export function SocialCalendarMonthView({ businessId }: { businessId: string }) {
  const [month, setMonth] = useState(new Date().toISOString().slice(0,7));
  const [data, setData] = useState<any>(null);
  useEffect(()=>{ businessId && call(`social-calendar-month-view?business_id=${businessId}&month=${month}`, { method:"GET" }).then(setData); }, [businessId, month]);
  return (
    <Card><CardHeader className="flex flex-row items-center justify-between"><CardTitle className="text-base">Month View</CardTitle>
      <Input type="month" value={month} onChange={e=>setMonth(e.target.value)} className="max-w-[180px]" />
    </CardHeader><CardContent>
      {!data?.items?.length ? <p className="text-xs text-muted-foreground">No items.</p> :
        <div className="grid grid-cols-7 gap-1 text-[10px]">
          {Object.entries(data.by_day ?? {}).map(([d, list]: any)=>(
            <div key={d} className="border rounded p-1">
              <div className="font-mono">{d.slice(8)}</div>
              <div className="text-muted-foreground">{list.length} slots</div>
              {list.some((i:any)=>i.status==="blocked") && <div className="text-destructive">blocked</div>}
            </div>
          ))}
        </div>}
    </CardContent></Card>
  );
}

export function SocialCalendarItemDetailPanel({ businessId }: { businessId: string }) {
  const [id, setId] = useState("");
  const [item, setItem] = useState<any>(null);
  return (
    <Card><CardHeader><CardTitle className="text-base">Calendar Item Detail</CardTitle></CardHeader>
      <CardContent className="space-y-2 text-sm">
        <div className="flex gap-2"><Input placeholder="calendar_item id" value={id} onChange={e=>setId(e.target.value)} />
          <Button size="sm" disabled={!id} onClick={async()=>{
            const { data } = await supabase.from("social_calendar_items").select("*").eq("id", id).eq("business_id", businessId).maybeSingle();
            setItem(data);
          }}>Load</Button></div>
        {item && <pre className="text-xs bg-muted p-2 rounded max-h-64 overflow-auto">{JSON.stringify(item, null, 2)}</pre>}
      </CardContent></Card>
  );
}

export function SocialCalendarCadencePanel({ businessId }: { businessId: string }) {
  const [phrase, setPhrase] = useState("");
  const [out, setOut] = useState<any>(null);
  return (
    <Card><CardHeader><CardTitle className="text-base">Cadence Rules</CardTitle></CardHeader>
      <CardContent className="space-y-2 text-sm">
        <p className="text-xs text-muted-foreground">Generate cadence rules from Social Brain / platform defaults. Internal only — no cron, no external scheduling.</p>
        <div className="flex gap-2">
          <Button size="sm" disabled={!businessId} onClick={async()=>{
            const r = await call("social-calendar-cadence-generate", { method:"POST", body: JSON.stringify({ business_id: businessId }) });
            setOut(r);
          }}>Preview cadence</Button>
          <Input className="max-w-[260px]" placeholder='confirmation: CREATE SOCIAL CADENCE RULES' value={phrase} onChange={e=>setPhrase(e.target.value)} />
          <Button size="sm" variant="default" disabled={!businessId || phrase!=="CREATE SOCIAL CADENCE RULES"} onClick={async()=>{
            const r = await call("social-calendar-cadence-generate", { method:"POST", body: JSON.stringify({ business_id: businessId, dry_run:false, confirmation_phrase: phrase }) });
            setOut(r);
          }}>Save cadence</Button>
        </div>
        {out && <pre className="text-xs bg-muted p-2 rounded max-h-64 overflow-auto">{JSON.stringify(out, null, 2)}</pre>}
      </CardContent></Card>
  );
}

export function SocialCalendarReadinessPanel({ businessId }: { businessId: string }) {
  const [calId, setCalId] = useState("");
  const [out, setOut] = useState<any>(null);
  return (
    <Card><CardHeader><CardTitle className="text-base">Readiness Check</CardTitle></CardHeader>
      <CardContent className="space-y-2 text-sm">
        <Input placeholder="calendar_id (optional)" value={calId} onChange={e=>setCalId(e.target.value)} />
        <Button size="sm" disabled={!businessId} onClick={async()=>{
          const r = await call("social-calendar-readiness-check", { method:"POST", body: JSON.stringify({ business_id: businessId, calendar_id: calId || undefined }) });
          setOut(r);
        }}>Run readiness check</Button>
        {out && <pre className="text-xs bg-muted p-2 rounded max-h-64 overflow-auto">{JSON.stringify(out, null, 2)}</pre>}
      </CardContent></Card>
  );
}

export function SocialCalendarGapPanel({ businessId }: { businessId: string }) {
  const [calId, setCalId] = useState("");
  const [out, setOut] = useState<any>(null);
  return (
    <Card><CardHeader><CardTitle className="text-base">Gap Analysis</CardTitle></CardHeader>
      <CardContent className="space-y-2 text-sm">
        <Input placeholder="calendar_id (optional)" value={calId} onChange={e=>setCalId(e.target.value)} />
        <Button size="sm" disabled={!businessId} onClick={async()=>{
          const r = await call("social-calendar-gap-analysis", { method:"POST", body: JSON.stringify({ business_id: businessId, calendar_id: calId || undefined }) });
          setOut(r);
        }}>Analyze gaps</Button>
        {out && <pre className="text-xs bg-muted p-2 rounded max-h-64 overflow-auto">{JSON.stringify(out, null, 2)}</pre>}
      </CardContent></Card>
  );
}

export function SocialCalendarReschedulePanel({ businessId }: { businessId: string }) {
  const [calId, setCalId] = useState("");
  const [shift, setShift] = useState(1);
  const [preview, setPreview] = useState<any>(null);
  const [phrase, setPhrase] = useState("");
  const [saved, setSaved] = useState<any>(null);
  return (
    <Card><CardHeader><CardTitle className="text-base">Reschedule</CardTitle></CardHeader>
      <CardContent className="space-y-2 text-sm">
        <div className="flex gap-2"><Input placeholder="calendar_id" value={calId} onChange={e=>setCalId(e.target.value)} />
          <Input type="number" value={shift} onChange={e=>setShift(parseInt(e.target.value||"0"))} className="max-w-[100px]" />
          <Button size="sm" disabled={!businessId||!calId} onClick={async()=>{
            const r = await call("social-calendar-reschedule-preview", { method:"POST", body: JSON.stringify({ business_id: businessId, calendar_id: calId, shift_days: shift }) });
            setPreview(r);
          }}>Preview shift</Button>
        </div>
        <div className="flex gap-2">
          <Input className="max-w-[300px]" placeholder='confirmation: APPLY SOCIAL CALENDAR RESCHEDULE' value={phrase} onChange={e=>setPhrase(e.target.value)} />
          <Button size="sm" variant="default" disabled={!preview?.proposed || phrase!=="APPLY SOCIAL CALENDAR RESCHEDULE"} onClick={async()=>{
            const payload = preview.proposed.map((p:any)=>({ id:p.id, planned_date:p.to, planned_time:p.time }));
            const r = await call("social-calendar-reschedule-apply", { method:"POST", body: JSON.stringify({ business_id: businessId, calendar_id: calId, reschedule_payload: payload, dry_run:false, confirmation_phrase: phrase }) });
            setSaved(r);
          }}>Apply</Button>
        </div>
        {preview && <pre className="text-xs bg-muted p-2 rounded max-h-48 overflow-auto">{JSON.stringify(preview, null, 2)}</pre>}
        {saved && <pre className="text-xs bg-muted p-2 rounded">{JSON.stringify(saved, null, 2)}</pre>}
      </CardContent></Card>
  );
}

export function SocialCalendarDashboard({ businessId }: { businessId: string }) {
  return (
    <div className="space-y-4">
      <SocialCalendarHealthPanel businessId={businessId} />
      <SocialCalendarGeneratorPanel businessId={businessId} />
      <SocialCalendarCadencePanel businessId={businessId} />
      <Tabs defaultValue="day">
        <TabsList><TabsTrigger value="day">Day</TabsTrigger><TabsTrigger value="week">Week</TabsTrigger><TabsTrigger value="month">Month</TabsTrigger></TabsList>
        <TabsContent value="day"><SocialCalendarDayView businessId={businessId} /></TabsContent>
        <TabsContent value="week"><SocialCalendarWeekView businessId={businessId} /></TabsContent>
        <TabsContent value="month"><SocialCalendarMonthView businessId={businessId} /></TabsContent>
      </Tabs>
      <div className="grid md:grid-cols-2 gap-4">
        <SocialCalendarReadinessPanel businessId={businessId} />
        <SocialCalendarGapPanel businessId={businessId} />
        <SocialCalendarReschedulePanel businessId={businessId} />
        <SocialCalendarItemDetailPanel businessId={businessId} />
      </div>
    </div>
  );
}
