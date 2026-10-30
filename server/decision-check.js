// Check the plan's declared contract, never substitute a routine for the model.
export function decisionIssue(s,d){
 if(d.action==='rest'&&/\b(sit|sitting|seated)\b/i.test(d.intention||'')&&!/\b(cannot|unable|standing|unavailable)\b/i.test(d.intention||''))return 'Your intention promises sitting but rest is standing-only. Use interact with a usable objectId and verb=sit.';
 const steps=[d,...(d.nextSteps||[])],o=d.objective;
 if(steps.every(x=>x.action==='phone')&&['energy','hunger','thirst'].includes(o?.metric)&&o.amount>0)return 'Phone use cannot improve energy, hunger or thirst. For a phone-only task use objective metric=none, amount=0; do not invent a physical benefit.';
 for(const step of steps)if(step.action==='interact'){
  const object=(s.objects||[]).find(x=>x.id===step.objectId);
  if(!object?.affordances.includes(step.verb))return 'The selected objectId/verb is not in the usable object registry. Choose a perceived or remembered object with the affordance.';
 }
 if(o?.interaction&&o.interaction!=='none'&&!steps.some(x=>x.action==='interact'&&x.verb===o.interaction||o.interaction==='lie_down'&&x.action==='sleep'))return 'The objective requires '+o.interaction+', but no step executes it. rest is standing-only. Use an interact step with objectId and verb from available objects (or sleep for a bed). Do not claim a physical pose without its command.';
 if(o?.metric==='energy'&&o.direction==='increase'&&steps.every(x=>x.action==='work'||x.action==='exercise'))return 'Every step consumes energy, contradicting the recovery objective. Choose supported recovery actions using mechanics and measuredEffects.';
 return null;
}
export function requestedObjective(message){
 const m=message.match(/\b(raise|increase|restore|gain|reduce|decrease|lower)\b[^.!?]{0,25}\b(energy|hunger|thirst|stress|curiosity|social|money)\b[^.!?]{0,15}?\bby\s+(?:at\s+least\s+)?(\d{1,3})\b/i);
 if(!m||Number(m[3])>100)return null;
 return {metric:m[2].toLowerCase(),direction:/reduce|decrease|lower/i.test(m[1])?'decrease':'increase',amount:Number(m[3]),interaction:/\b(sit|sitting|seated)\b/i.test(message)?'sit':/\blie down\b/i.test(message)?'lie_down':'none'};
}
export function objectiveIssue(d,required){if(required&&d.changePlan!==true&&!/\b(cannot|can't|unable|impossible)\b/i.test(d.reply||''))return 'Your reply accepts an executable human task but changePlan=false does not execute it. Use changePlan=true with the required objective when accepting.';return required&&d.changePlan===true&&['metric','direction','amount','interaction'].some(k=>d.objective?.[k]!==required[k])?'The accepted human task requires objective '+JSON.stringify(required)+'. Keep that exact target and physical requirement; choose your own supported approach.':null;}
