import {recordEffect} from './experience.js';
import {verifyTask} from './task-verification.js';
import {recordProgress,contextualOutcome} from './learning-progress.js';
import {perceivedObjects} from './object-perception.js';
import {LANDMARKS} from './shared/movement.js';
const rounded=values=>Object.fromEntries(Object.entries(values||{}).map(([k,v])=>[k,Math.round(v)]));
export function perception(s){
  const nearby=LANDMARKS.map(p=>({id:p.id,name:p.name,metres:Math.round(Math.hypot(s.player.x-p.x,s.player.z-p.z))})).filter(p=>p.metres<=25).sort((a,b)=>a.metres-b.metres).slice(0,3);
  return {source:'simulation geometry, not camera vision',position:{x:Math.round(s.player.x),z:Math.round(s.player.z)},travel:s.arrival.phase,nearbyPlaces:nearby,objects:perceivedObjects(s),activity:s.activity?.kind||(s.route.length?'walking':'idle'),unavailable:['images','sounds','NPC observations','weather']};
}
export function recordObservation(s,now){
  const p=perception(s),key=JSON.stringify([p.position,p.activity,p.nearbyPlaces.map(x=>x.id),p.objects.map(x=>x.id)]);
  s.observations??=[];
  if(s.observations.at(-1)?.key===key)return;
  s.observations.push({at:now,key,source:'simulation',position:p.position,nearbyPlaces:p.nearbyPlaces,activity:p.activity,objects:p.objects});s.observations=s.observations.slice(-20);
}
export function learnOutcome(s,activity,now){
  if(!activity.before)return null;
  s.learning??={version:1,totalOutcomes:0,preferences:{}};
  const before=activity.before,after=rounded(s.needs),b=before.needs;
  const relief=((b.hunger-after.hunger)*b.hunger/100+(b.thirst-after.thirst)*b.thirst/100+(after.energy-b.energy)*(100-b.energy)/100+(b.stress-after.stress)*b.stress/100+(b.curiosity-after.curiosity)*b.curiosity/100)/100;
  const moneyChange=s.wallet-before.money;
  const reward=Math.max(-1,Math.min(1,relief+moneyChange/20));
  const key=activity.kind+'|'+activity.place,old=s.learning.preferences[key]||{count:0,meanReward:0};
  const count=old.count+1;
  s.learning.preferences[key]={count,meanReward:Math.round((old.meanReward+(reward-old.meanReward)/count)*1000)/1000,lastAt:now};
  s.learning.totalOutcomes++;
  const result={at:now,activity:activity.kind,place:activity.place,source:'measured simulation outcome',before:b,after,moneyChange,duration:activity.total,executionMode:activity.executionMode,reward:Math.round(reward*1000)/1000};
  s.outcomes??=[];s.outcomes.push(result);s.outcomes=s.outcomes.slice(-12);
  contextualOutcome(s,activity,result);recordProgress(s,result);recordEffect(s,result);verifyTask(s,result,now);
  return result;
}
export function cachedMemory(s){
  // A deterministic summary: no model call is used to summarize memories.
  const version=JSON.stringify([s.learning?.totalOutcomes||0,s.observations?.at(-1)?.at||0]);
  if(s.memoryCache?.version===version){s.memoryCache.hits++;return s.memoryCache.summary;}
  const lessons=Object.entries(s.learning?.preferences||{}).sort((a,b)=>b[1].meanReward-a[1].meanReward);
  const knownObjects=[...new Map((s.observations||[]).flatMap(o=>o.objects||[]).map(o=>[o.id,o])).values()].slice(-6);
  const summary={knownObjects,outcomesLearned:s.learning?.totalOutcomes||0,helpful:lessons.filter(([,v])=>v.meanReward>0).slice(0,3).map(([activity,v])=>({activity,trials:v.count,score:v.meanReward})),unhelpful:lessons.filter(([,v])=>v.meanReward<=0).slice(-3).map(([activity,v])=>({activity,trials:v.count,score:v.meanReward})),lastObserved:s.observations?.length?(({key,...observation})=>observation)(s.observations.at(-1)):null,lastOutcome:s.outcomes?.length?(({activity,place,reward,moneyChange})=>({activity,place,reward,moneyChange}))(s.outcomes.at(-1)):null};
  s.memoryCache={version,summary,hits:s.memoryCache?.hits||0,builds:(s.memoryCache?.builds||0)+1};return summary;
}
export function groundedRecall(s,message){
  // Action requests must reach the planner even if they also mention seeing/hearing.
  if(/\b(search|play|listen|watch)\b|\buse\b.{0,40}\bphone\b/i.test(message))return null;
  if(!/\b(see|saw|seen|hear|heard|smell|smelled|notice|noticed|observe|observed)\b/i.test(message)||/\b(go|walk|visit|head|take me)\b/i.test(message))return null;
  const earlier=/\b(earlier|before|previous|last)\b/i.test(message),observation=earlier?s.observations?.at(-1):null,p=observation||perception(s);
  const places=(p.nearbyPlaces||[]).map(x=>`${x.name} (${x.metres}m away)`).join(', ');
  return `${earlier?'My last recorded observation':'My current location data'} places me ${places?'near '+places:'at x '+p.position.x+', z '+p.position.z}. I ${earlier?'was':'am'} ${p.activity}. I don't receive camera images or sound, so I can't verify visual or sensory details.`;
}
