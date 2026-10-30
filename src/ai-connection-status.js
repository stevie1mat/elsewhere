export function aiConnectionStatus(ai,{paused=false,offline=false}={}){
 if(paused)return {state:'offline',text:'Paused · AI stopped'};
 if(offline)return {state:'offline',text:'AI disconnected · reconnecting'};
 if(!ai?.enabled)return {state:'offline',text:'AI not configured'};
 if(ai.error?.startsWith('Mac worker waiting for memory'))return {state:'attention',text:'AI waiting for Mac memory · will resume automatically'};
 const rejected=!!ai.error&&(ai.failureKind==='decision'||ai.error.startsWith('AI plan could not be executed:'));
 if(rejected&&ai.providerHealth?.some(p=>p.provider===ai.provider&&p.status==='connected'))return {state:'attention',text:`AI connected · ${ai.provider} · plan rejected, retrying`};
 if(ai.connected===true&&!ai.error&&!ai.fallback)return {state:'online',text:`AI connected · ${ai.provider||'AI'}${ai.status==='thinking'?' · thinking':''}`};
 return {state:'offline',text:ai.error||ai.fallback?'AI unavailable · retrying':'AI connecting…'};
}
