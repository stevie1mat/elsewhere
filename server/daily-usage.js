export const USAGE_TIMEZONE='America/Toronto';
export function usageDay(at){const parts=new Intl.DateTimeFormat('en-CA',{timeZone:USAGE_TIMEZONE,year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date(at));return ['year','month','day'].map(k=>parts.find(p=>p.type===k).value).join('-');}
function add(daily,a){if(!Number.isFinite(a.at))return;const date=usageDay(a.at),day=daily.days[date]??={date,providers:{}};const p=day.providers[a.provider||'Unknown']??={requests:0,input:0,output:0,total:0,reported:0,missing:0};p.requests++;if(a.usage&&[a.usage.input,a.usage.output,a.usage.total].some(Number.isFinite)){p.input+=a.usage.input||0;p.output+=a.usage.output||0;p.total+=a.usage.total??((a.usage.input||0)+(a.usage.output||0));p.reported++;}else p.missing++;}
export function ensureDailyUsage(t,now=Date.now()){
 if(t.daily)return t.daily;const startedDay=usageDay(now),daily={version:1,timeZone:USAGE_TIMEZONE,startedAt:now,partialDates:[startedDay],days:{}};
 const retained=[...(t.recent||[])];if(t.lastExchange&&!retained.some(a=>a.at===t.lastExchange.at&&a.provider===t.lastExchange.provider&&a.model===t.lastExchange.model))retained.push(t.lastExchange);
 for(const a of retained){if(!Number.isFinite(a.at))continue;add(daily,a);const day=usageDay(a.at);if(!daily.partialDates.includes(day))daily.partialDates.push(day);}
 t.daily=daily;return daily;
}
export function recordDailyUsage(t,a,now=Date.now()){const daily=ensureDailyUsage(t,now);add(daily,a);const dates=Object.keys(daily.days).sort().slice(-90);daily.days=Object.fromEntries(dates.map(d=>[d,daily.days[d]]));daily.partialDates=daily.partialDates.filter(d=>dates.includes(d)||d===usageDay(daily.startedAt));}
export function dailyUsageView(t={},now=Date.now()){
 // Read-only derivation supports a paused older save without requiring an AI call.
 const daily=t.daily||ensureDailyUsage({...t},now),today=usageDay(now),current=daily.days[today]||{date:today,providers:{}};
 const totals=Object.values(current.providers).reduce((sum,p)=>({total:sum.total+p.total,requests:sum.requests+p.requests,missing:sum.missing+p.missing}),{total:0,requests:0,missing:0});
 return {today,timeZone:daily.timeZone,startedAt:daily.startedAt,partial:daily.partialDates.includes(today),current,...totals,days:Object.values(daily.days).sort((a,b)=>b.date.localeCompare(a.date)).map(d=>({...d,partial:daily.partialDates.includes(d.date)}))};
}
