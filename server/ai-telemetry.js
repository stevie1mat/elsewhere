const safeNumber=value=>Number.isFinite(value)&&value>=0?value:null;
export function trackedProviderFetch(fetchImpl,provider,model,secrets=[]){
  let latest=null;
  const redact=value=>secrets.filter(Boolean).reduce((s,key)=>s.split(key).join('[redacted]'),String(value||'')).replace(/(?:Bearer\s+)[^\s"']+/gi,'Bearer [redacted]').slice(0,600);
  return {get latest(){return latest;},async fetch(url,options){
    const start=Date.now();let sent;try{sent=JSON.parse(options.body);}catch{sent={};}
    latest={provider,model,at:start,status:'pending',httpStatus:null,latencyMs:0,usage:null,sent,received:null,error:null};
    try{
      const response=await fetchImpl(url,options);latest.httpStatus=response.status??200;latest.status=response.ok?'success':'error';
      // Only capture the public answer and usage, never reasoning traces or headers.
      if(response.clone){try{const data=await response.clone().json();
        if(data.usage)latest.usage={input:safeNumber(data.usage.prompt_tokens),output:safeNumber(data.usage.completion_tokens),total:safeNumber(data.usage.total_tokens)};
        latest.received={finishReason:data.choices?.[0]?.finish_reason||null,content:data.choices?.[0]?.message?.content||null};
        if(!response.ok)latest.error=redact(data.error?.message||data.message||`HTTP ${response.status}`);
      }catch{latest.error=response.ok?'Response was not valid JSON.':`HTTP ${response.status}`;}}
      return response;
    }catch(error){latest.status='error';latest.error=/timeout|abort/i.test(error.name||'')?'Request timed out or was cancelled.':'Network connection failed.';throw error;}
    finally{latest.latencyMs=Date.now()-start;}
  }};
}
export function recordTelemetry(ai,client){
  const attempts=client.attempts||(client.lastAttempt?[client.lastAttempt]:[]);
  const t=ai.telemetry??={requests:0,input:0,output:0,total:0,usageReported:0,startedAt:Date.now(),recent:[]};
  for(const a of attempts){
    t.requests++;if(a.usage){t.input+=a.usage.input||0;t.output+=a.usage.output||0;t.total+=a.usage.total??((a.usage.input||0)+(a.usage.output||0));t.usageReported++;}
    const {sent,received,...summary}=a;t.recent.push(summary);t.recent=t.recent.slice(-12);
    t.lastExchange={...a};
  }
  ai.providerHealth=client.diagnostics||[];
}
