import {recordWorldRequests} from './world-requests.js';
import {LANDMARKS} from './shared/movement.js';
export function executionGap(s,d,now){
  const sleep=d.action==='sleep'||/\b(lie down|lying down|sleep|sleeping|(?:in|on) (?:the |a )?bed)\b/i.test(d.intention||'');
  const sitting=/\b(sit down|sitting|sit on|sit in)\b/i.test(d.intention||'');
  if(!sleep&&!sitting&&d.action!=='rest'&&!/\brest\b/i.test(d.intention||''))return null;
  const blocked=sleep||sitting;
  const name=sleep?'Use the existing bed, lie down and sleep':'Sit down on furniture and stand up';
  const message=sleep?"I want to sleep, but I can't get into bed or lie down yet. The bed exists; bed-use and sleep animations need to be built.":sitting?"I can't sit on furniture yet. Seating interaction and sit/stand animations need to be built.":"I can rest standing here, but I can't sit down yet. I've requested seating interaction and sit/stand animations.";
  const near=sleep?'home':LANDMARKS.reduce((best,p)=>Math.hypot(s.player.x-p.x,s.player.z-p.z)<Math.hypot(s.player.x-best.x,s.player.z-best.z)?p:best,LANDMARKS[0]).id;
  const added=recordWorldRequests(s,[{name,kind:'ability',reason:message.slice(0,180),intendedUse:sleep?'Approach the existing bed, lie down, sleep and get up.':'Approach a seat, sit to rest, then stand and continue.',near,priority:'high'}],now);
  for(const r of added){r.evidence='Confirmed execution limitation from the game action system, not an inferred missing visual asset.';r.source='action capability check';}
  s.executionFeedback??=[];
  if(s.executionFeedback.at(-1)?.requirement!==name||s.executionFeedback.at(-1)?.status!==(blocked?'blocked':'limited'))s.executionFeedback.push({at:now,action:d.action,status:blocked?'blocked':'limited',requirement:name,message,source:'action capability check'});
  s.executionFeedback=s.executionFeedback.slice(-10);
  return {blocked,message,requirement:name};
}
