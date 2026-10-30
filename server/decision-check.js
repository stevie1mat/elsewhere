import {requestedPlace} from './human-command.js';
import {LANDMARKS} from './shared/movement.js';

// Keep explicit human constraints visible even after conversation compaction.
export function humanActionConstraints(messages=[],message=''){
 let phoneAllowed=true;
 for(const text of [...messages.filter(m=>m.role==='user').map(m=>m.content),message]){
  if(/\b(?:don't|dont|do not|stop|no)\b[^.!?]{0,60}\b(?:youtube|phone|online)\b/i.test(text))phoneAllowed=false;
  else if(/\b(?:use|search|play|watch|listen|open)\b[^.!?]{0,60}\b(?:youtube|phone|online|video|music)\b/i.test(text))phoneAllowed=true;
 }
 const travel=/\b(?:walk|go|head|visit|find|look for|get a|take|collect|pick up|rent)\b/i.test(message)&&!/^\s*(?:where|how|why|what)\b/i.test(message)&&!/\b(?:don't|dont|do not)\s+(?:walk|go|visit)\b/i.test(message);
 const destination=travel?(requestedPlace(message)||LANDMARKS.find(p=>message.toLowerCase().includes(p.name.toLowerCase())||
  p.id==='bikes'&&/\b(?:bike|bikes|bicycle|bicycles|cycle shop)\b/i.test(message)||
  p.id==='coast'&&/\b(?:beach|coast)\b/i.test(message))):null;
 const collect=destination?.id==='bikes'&&/\b(?:get|take|collect|rent|pick up)\b/i.test(message);
 return {phoneAllowed,...(collect?{travelAction:'collect_bicycle'}:{}),...(destination?{travelDestination:destination.id}:{})};
}
export function humanActionIssue(d,constraints,{chat=false}={}){
 const steps=[d,...(d.nextSteps||[])];
 if(!constraints.phoneAllowed&&steps.some(step=>step.action==='phone'))return 'The human explicitly prohibited phone/YouTube searches. Choose an available physical action; visit a listed landmark to walk there. Do not search videos for in-world places.';
 if(chat&&constraints.travelDestination&&!/\b(?:cannot|can't|unable|decline)\b/i.test(d.reply||'')){
  if(d.changePlan!==true)return 'Accepting this travel request requires changePlan=true so the character actually moves.';
  if(!(constraints.travelAction?d.action===constraints.travelAction:['visit','walk','run','ride'].includes(d.action))||d.destination!==constraints.travelDestination)return `The accepted travel request requires action=${constraints.travelAction||'visit'}, destination=${constraints.travelDestination} now. A local action or a promised later step does not walk there.`;
 }
 return null;
}
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
