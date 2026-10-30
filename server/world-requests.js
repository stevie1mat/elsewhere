import {LANDMARKS} from './shared/movement.js';
import {ACTIVITY_ACTIONS} from './resident-mind.js';
const normalize=text=>text.toLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim();
export function validateWorldRequests(requests){
  if(requests===undefined)return;
  if(!Array.isArray(requests)||requests.length>1)throw Error('Invalid world request count.');
  for(const r of requests){
    for(const [field,max] of [['name',70],['reason',180],['intendedUse',180]])if(typeof r[field]!=='string'||!r[field].trim()||r[field].length>max)throw Error('Invalid world request description.');
    if(!['place','object','ability'].includes(r.kind)||!['low','medium','high'].includes(r.priority)||!LANDMARKS.some(p=>p.id===r.near))throw Error('Invalid world request.');
  }
}
export function recordWorldRequests(s,requests,now){
  if(!requests?.length)return [];
  s.worldRequests??=[];const added=[];
  for(const r of requests){
    const key=r.kind+'|'+normalize(r.name);
    if(r.kind==='ability'&&ACTIVITY_ACTIONS.includes(normalize(r.name)))continue;
    if(r.kind==='place'&&LANDMARKS.some(p=>normalize(p.name)===normalize(r.name)||p.id===normalize(r.name)))continue;
    const existing=s.worldRequests.find(x=>x.key===key);
    if(existing){existing.lastRequestedAt=now;existing.mentions++;continue;}
    if(s.worldRequests.length>=50)continue;
    const request={...r,key,id:'request-'+now+'-'+s.worldRequests.length,createdAt:now,lastRequestedAt:now,mentions:1,status:'proposed',evidence:r.kind==='ability'?'Not exposed by the current action API; review the requested capability.':'Not confirmed absent. This is a requested addition; it may already exist visually.'};
    s.worldRequests.push(request);added.push(request);
    s.messages??=[];s.messages.push({role:'assistant',content:`I'd like ${r.name} near ${LANDMARKS.find(p=>p.id===r.near).name}. ${r.intendedUse} This is a request for you to review, not something I can use yet.`,at:now});s.messages=s.messages.slice(-100);
  }
  return added;
}
