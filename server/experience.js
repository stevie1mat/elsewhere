const metrics=['energy','hunger','thirst','stress','curiosity','social'];
function addEffect(s,o){
 const key=o.activity+'|'+o.place,old=s.actionEffects[key]||{action:o.activity,place:o.place,trials:0,delta:{},lastAt:0};
 const n=old.trials+1,delta={...old.delta};
 for(const k of metrics)if(Number.isFinite(o.before?.[k])&&Number.isFinite(o.after?.[k]))delta[k]=Math.round(((delta[k]||0)+(o.after[k]-o.before[k]-(delta[k]||0))/n)*100)/100;
 s.actionEffects[key]={...old,trials:n,delta,lastAt:o.at,lastExample:{before:o.before,after:o.after,duration:o.duration,executionMode:o.executionMode}};
 s.actionEffects=Object.fromEntries(Object.entries(s.actionEffects).sort((a,b)=>b[1].lastAt-a[1].lastAt).slice(0,100));
}
export function ensureEffects(s){if(s.actionEffects)return;s.actionEffects={};for(const o of s.outcomes||[])addEffect(s,o);}
export function recordEffect(s,o){if(!s.actionEffects){s.actionEffects={};for(const old of s.outcomes||[])if(old!==o)addEffect(s,old);}addEffect(s,o);}
export function retrieveEffects(s){
 ensureEffects(s);const metric=s.task?.status==='active'?s.task.metric:'energy';
 return Object.values(s.actionEffects).sort((a,b)=>Math.abs(b.delta[metric]||0)-Math.abs(a.delta[metric]||0)||b.lastAt-a.lastAt).slice(0,5)
 .map(({action,place,trials,delta,lastExample})=>({action,place,trials,meanChanges:delta,lastExample,note:'Effects are separate from total reward. Context and duration affect results; no guarantee.'}));
}
export const EFFECT_FACTS={
 rest:{energyPerSecond:.132,stressPerSecond:-.18,requires:'Standing rest or seated object interaction'},
 sleep:{energyPerSecond:.692,stressPerSecond:-.18,requires:'Usable bed and lying interaction'},
 work:{energyPerSecond:-.088,moneyOnCompletion:8,physical:false},
 drinking:{available:false},eating:{available:false},
 interpretation:'These are simulation mechanics, not lived sensations. Energy caps at 100. A low total reward does not mean every individual effect failed. Do not describe a work shift as energy recovery.'
};
export function needAwareness(s){return {values:s.needs,unresolved:['hunger','thirst','social'].filter(k=>s.needs[k]>=70).map(metric=>({metric,value:Math.round(s.needs[metric]),status:metric==='social'?'No implemented NPC social interaction':'No usable consumption interaction',choice:'Explain the limitation; decide whether to request a capability. No automatic asset request is created.'}))};}
