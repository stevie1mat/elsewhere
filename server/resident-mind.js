import {learnOutcome,recordObservation} from './cognition.js';
export const ACTIVITY_ACTIONS=['visit','rest','sleep','eat','observe','reflect','exercise','work'];
const clamp=value=>Math.max(0,Math.min(100,value));
export function ensureMind(s){
  s.needs??={energy:78,hunger:25,thirst:20,stress:20,curiosity:60,social:35};
  s.personality??={curiosity:75,sociability:55,ambition:65,caution:60};
  s.wallet??=20;s.placesVisited??={};s.experiences??=[];
  s.mood=s.needs.energy<25?'tired':s.needs.hunger>75?'hungry':s.needs.thirst>75?'thirsty':s.needs.stress>70?'overwhelmed':s.needs.social>75?'lonely':s.needs.curiosity>65?'curious':'content';
  return s;
}
export function stepMind(s,dt){
  ensureMind(s);s.livedSeconds=(s.livedSeconds||0)+dt;const n=s.needs,kind=s.activity?.kind,moving=s.route.length>0;
  n.energy=clamp(n.energy-dt*(moving?.025:.008));n.hunger=clamp(n.hunger+dt*.018);n.thirst=clamp(n.thirst+dt*.025);n.social=clamp(n.social+dt*.008);n.curiosity=clamp(n.curiosity+dt*.012);
  if(s.rest>0){
    if(kind==='sleep')n.energy=clamp(n.energy+dt*.7);
    else if(['rest','reflect','observe'].includes(kind))n.energy=clamp(n.energy+dt*.14);
    if(kind==='eat'){n.hunger=clamp(n.hunger-dt*.95);n.thirst=clamp(n.thirst-dt*.8);}
    if(['reflect','observe','rest','sleep'].includes(kind))n.stress=clamp(n.stress-dt*.18);
    if(kind==='observe')n.curiosity=clamp(n.curiosity-dt*.45);
    if(kind==='exercise'){n.energy=clamp(n.energy-dt*.09);n.stress=clamp(n.stress-dt*.3);}
    if(kind==='work'){n.energy=clamp(n.energy-dt*.08);n.stress=clamp(n.stress+dt*.04);}
  }
  ensureMind(s);
}
export function activityDestination(d){
  if(d.action==='sleep')return 'home';
  if(['eat','work'].includes(d.action))return d.destination==='south'?'south':'cafe';
  return d.destination;
}
export function startActivity(s,d,place,now){
  ensureMind(s);
  if(d.action==='eat'&&s.wallet<4)return {error:'I need €4 for a meal. I should earn some money first.'};
  const before={needs:{...s.needs},money:s.wallet};
  if(d.action==='eat')s.wallet-=4;
  s.activity={before,kind:d.action==='visit'?'observe':d.action,total:d.seconds,remaining:d.seconds,place:place?.name||s.destination||'Porto Sol',startedAt:now};
  recordObservation(s,now);
  s.rest=d.seconds;s.thought=d.intention;s.player.speed=0;s.player.moving=false;
  return {started:true};
}
export function finishActivity(s,now){
  if(!s.activity)return null;
  const a=s.activity;s.activity=null;
  if(a.kind==='work')s.wallet+=8;
  learnOutcome(s,a,now);recordObservation(s,now);
  const text=a.kind==='work'?`Finished a local work shift at ${a.place}; earned €8.`:a.kind==='eat'?`Finished a meal and drink at ${a.place}; spent €4.`:a.kind==='reflect'?`Reflected at ${a.place}. Current ambition: ${s.ai?.goal||'Build a life in Porto Sol.'}`:`Finished ${a.kind} at ${a.place}.`;
  s.experiences.push({at:now,activity:a.kind,place:a.place,mood:s.mood});s.experiences=s.experiences.slice(-40);return text;
}
