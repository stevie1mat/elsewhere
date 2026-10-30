import {dailyUsageView} from '../server/daily-usage.js';
const COLUMNS=['record_type','exported_at','tracking_started_at','request_at','provider','model','status','http_status','latency_ms','input_tokens','output_tokens','total_tokens','error','retry_at','cumulative_requests','cumulative_input_tokens','cumulative_output_tokens','cumulative_total_tokens','usage_reported_requests','request_json','response_json','usage_date','usage_timezone','partial_history','requests_without_usage'];
const iso=value=>Number.isFinite(value)?new Date(value).toISOString():'';
function cell(value){
  if(value===null||value===undefined)return '""';
  let text=typeof value==='object'?JSON.stringify(value):String(value);
  // Quoting alone does not prevent a spreadsheet from executing formulas.
  if(typeof value!=='number'&&/^\s*[=+\-@\t\r]/.test(text))text="'"+text;
  return '"'+text.replaceAll('"','""')+'"';
}
export function aiTelemetryCsv(ai={}, {includePayloads=true,now=Date.now()}={}){
  const t=ai.telemetry||{},last=t.lastExchange,common={exported_at:iso(now),tracking_started_at:iso(t.startedAt)},rows=[];
  rows.push({...common,record_type:'summary',provider:ai.provider,model:ai.model,status:ai.connected?'connected':'unavailable',error:ai.error,cumulative_requests:t.requests||0,cumulative_input_tokens:t.input||0,cumulative_output_tokens:t.output||0,cumulative_total_tokens:t.total||0,usage_reported_requests:t.usageReported||0});
  for(const day of dailyUsageView(t,now).days)for(const [provider,p] of Object.entries(day.providers))rows.push({...common,record_type:'daily_usage',provider,usage_date:day.date,usage_timezone:'America/Toronto',partial_history:day.partial,requests_without_usage:p.missing,input_tokens:p.input,output_tokens:p.output,total_tokens:p.total,cumulative_requests:p.requests,usage_reported_requests:p.reported});
  for(const a of t.recent||[]){
    const isLast=last&&a.at===last.at&&a.provider===last.provider&&a.model===last.model;
    rows.push({...common,record_type:'request_attempt',request_at:iso(a.at),provider:a.provider,model:a.model,status:a.status,http_status:a.httpStatus,latency_ms:a.latencyMs,input_tokens:a.usage?.input,output_tokens:a.usage?.output,total_tokens:a.usage?.total,error:a.error,request_json:includePayloads&&isLast?last.sent:null,response_json:includePayloads&&isLast?last.received:null});
  }
  for(const p of ai.providerHealth||[])rows.push({...common,record_type:'provider_health',provider:p.provider,model:p.model,status:p.status,error:p.error,retry_at:iso(p.retryAt)});
  return '\ufeff'+[COLUMNS.map(cell).join(','),...rows.map(row=>COLUMNS.map(key=>cell(row[key])).join(','))].join('\r\n')+'\r\n';
}
export function downloadAiCsv(ai,includePayloads){
  const blob=new Blob([aiTelemetryCsv(ai,{includePayloads})],{type:'text/csv;charset=utf-8'}),url=URL.createObjectURL(blob),link=document.createElement('a');
  link.href=url;link.download=`resident-ai-research-${new Date().toISOString().replaceAll(':','-')}.csv`;document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
