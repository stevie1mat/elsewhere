import {createPlayer,SPAWN,canOccupy,groundElevation,LANDMARKS,PORTO_BOUNDS} from './shared/movement.js';
import {createArrival,stepArrival,dropArrival,JOURNEY_SECONDS} from '../src/arrival.js';

export function createResident(now=Date.now()) {
  return {version:1,player:{...createPlayer(),mode:'walking'},arrival:createArrival(SPAWN),welcome:{phase:'waiting'},obstacles:null,route:[],routeIndex:0,visit:0,rest:0,thought:'I wonder what life in Porto Sol will be like.',events:[],updatedAt:now};
}
export function remember(s,message,now) {
  s.events.push({at:now,message});s.events=s.events.slice(-500);
}
// One-metre A* grid fits the guesthouse doorway; a two-metre grid misses it.
export function residentRoute(start,target,obstacles) {
  const clear=(x,z)=>canOccupy(x,z,obstacles,.6);
  const edge=(a,b)=>[.25,.5,.75,1].every(t=>clear(a.x+(b.x-a.x)*t,a.z+(b.z-a.z)*t));
  const key=(x,z)=>`${x},${z}`,heap=[],parents=new Map(),costs=new Map();
  const push=node=>{heap.push(node);let i=heap.length-1;while(i>0){const p=(i-1)>>1;if(heap[p].f<=node.f)break;heap[i]=heap[p];i=p;}heap[i]=node;};
  const pop=()=>{const first=heap[0],last=heap.pop();if(heap.length){let i=0;while(i*2+1<heap.length){let child=i*2+1;if(child+1<heap.length&&heap[child+1].f<heap[child].f)child++;if(last.f<=heap[child].f)break;heap[i]=heap[child];i=child;}heap[i]=last;}return first;};
  const heuristic=(x,z)=>Math.max(0,Math.hypot(x-target.x,z-target.z)-2);
  // Connect the exact saved position to a nearby safe cell, never through a wall.
  for(let dx=-1;dx<=1;dx++)for(let dz=-1;dz<=1;dz++){
    const x=Math.round(start.x)+dx,z=Math.round(start.z)+dz,k=key(x,z);
    if(!edge(start,{x,z}))continue;
    const g=Math.hypot(x-start.x,z-start.z);costs.set(k,g);parents.set(k,null);push({x,z,g,f:g+heuristic(x,z)});
  }
  for(let expanded=0;heap.length&&expanded<450000;expanded++) {
    const p=pop(),pk=key(p.x,p.z);if(p.g!==costs.get(pk))continue;
    if(Math.hypot(p.x-target.x,p.z-target.z)<=2) {
      const route=[];let k=pk;
      while(k){const [x,z]=k.split(',').map(Number);route.push({x,z});k=parents.get(k);}return route.reverse();
    }
    for(const [dx,dz] of [[0,-1],[-1,0],[1,0],[0,1]]) {
      const x=p.x+dx,z=p.z+dz,k=key(x,z),g=p.g+1;
      if(x<PORTO_BOUNDS.minX||x>PORTO_BOUNDS.maxX||z<PORTO_BOUNDS.minZ||z>PORTO_BOUNDS.maxZ||g>=(costs.get(k)??Infinity)||!edge(p,{x,z}))continue;
      costs.set(k,g);parents.set(k,pk);push({x,z,g,f:g+heuristic(x,z)});
    }
  }
  return [];
}
const visits=['home','cafe','garden','bikes','home','south'];
export function stepResident(s,dt,now=Date.now()) {
  if(!s.obstacles)return;
  const p=s.player,clear=(x,z)=>canOccupy(x,z,s.obstacles,.6);
  s.updatedAt=now;
  if(s.arrival.phase!=='landed') {
    stepArrival(s.arrival,dt,{player:p,canLand:clear});
    if(s.arrival.phase==='balloon'&&s.arrival.elapsed>=JOURNEY_SECONDS){
      if(dropArrival(s.arrival,p,clear)){s.thought='Time to land and find my room.';remember(s,'Left the balloon and opened the parachute.',now);}
    }
    if(s.arrival.phase==='landed')remember(s,'Landed in Porto Sol. Next: find Casa Aurora.',now);
    return;
  }
  if(s.rest>0){s.rest=Math.max(0,s.rest-dt);p.moving=false;p.speed=0;return;}
  if(!s.route.length){
    let decision;
    if(s.ai?.enabled&&!s.ai.fallback){
      decision=s.pendingDecision;
      if(!decision){p.speed=0;p.moving=false;return;}
      delete s.pendingDecision;
      if(decision.action==='rest'){s.rest=decision.seconds;s.thought=decision.intention;p.speed=0;p.moving=false;remember(s,`Resting for ${decision.seconds} seconds.`,now);return;}
    }
    const destination=LANDMARKS.find(l=>l.id===(decision?decision.destination:visits[s.visit%visits.length]));
    s.route=residentRoute(p,destination,s.obstacles);s.routeIndex=0;s.destination=destination.name;
    if(!s.route.length){s.thought=`I could not find a safe route to ${destination.name}. I'll try somewhere else.`;remember(s,s.thought,now);s.visit++;s.rest=10;return;}
    s.thought=decision?.intention||`I'm walking to ${destination.name}.`;remember(s,`Set off for ${destination.name}.`,now);
  }
  let budget=dt*1.65;
  while(budget>0&&s.routeIndex<s.route.length){
    const next=s.route[s.routeIndex],dx=next.x-p.x,dz=next.z-p.z,d=Math.hypot(dx,dz);
    if(d<.001){s.routeIndex++;continue;}
    const distance=Math.min(budget,d),x=p.x+dx/d*distance,z=p.z+dz/d*distance;
    if(!clear(x,z)){s.route=[];s.rest=3;p.moving=false;p.speed=0;return;}
    p.x=x;p.z=z;p.y=groundElevation(x,z);p.yaw=Math.atan2(dx,-dz);p.walked+=distance;p.speed=1.65;p.moving=true;budget-=distance;
    if(distance===d)s.routeIndex++;
  }
  if(s.routeIndex===s.route.length){
    remember(s,`Reached ${s.destination}. Taking a short rest.`,now);
    if(s.destination==='Casa Aurora'&&s.welcome.phase!=='settled'){s.welcome={phase:'settled'};remember(s,'Settled into Casa Aurora; the first home is saved.',now);}
    s.thought=`I'm taking a moment at ${s.destination}.`;s.route=[];s.visit++;s.rest=45;p.moving=false;p.speed=0;
  }
}
export function residentSnapshot(s){const {obstacles,route,...snapshot}=s;return {...snapshot,initialized:!!obstacles,mode:s.ai?.enabled&&!s.ai.fallback?'ai':'routine'};}
