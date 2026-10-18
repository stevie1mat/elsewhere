import {canOccupy,groundElevation} from './movement.js';
export const FIRST_HOME={x:19,z:-83,name:'Casa Aurora'};
export function createWelcome(saved){return {phase:saved?.version===1&&saved?.settled===true?'settled':'waiting',guide:null,route:[],index:0,walked:0,speed:0};}
// A small grid search lets Mara lead from any safe parachute landing, around buildings.
export function homeRoute(start,obstacles){
  const sx=Math.round(start.x),sz=Math.round(start.z),goal=FIRST_HOME;
  const key=(x,z)=>`${x},${z}`,queue=[{x:sx,z:sz}],parents=new Map([[key(sx,sz),null]]);
  for(let i=0;i<queue.length;i++){
    const p=queue[i];
    if(p.x===goal.x&&p.z===goal.z){const route=[];let k=key(p.x,p.z);while(k){const [x,z]=k.split(',').map(Number);route.push({x,z});k=parents.get(k);}return route.reverse();}
    for(const [dx,dz] of [[0,-1],[-1,0],[1,0],[0,1]]){
      const x=p.x+dx,z=p.z+dz,k=key(x,z);
      if(parents.has(k)||!canOccupy(x,z,obstacles,.6)||!canOccupy(p.x+dx*.5,p.z+dz*.5,obstacles,.6))continue;
      parents.set(k,key(p.x,p.z));queue.push({x,z});
    }
  }
  return [];
}
export function meetGuide(s,p,obstacles){
  if(s.guide||s.phase==='settled')return;
  const bearing=Math.atan2(FIRST_HOME.z-p.z,FIRST_HOME.x-p.x);
  for(let r=3;r<=8;r++)for(let i=0;i<16;i++){
    const angle=bearing+i*Math.PI/8;
    const x=Math.round(p.x+Math.cos(angle)*r),z=Math.round(p.z+Math.sin(angle)*r);
    if(canOccupy(x,z,obstacles,.7)){s.guide={x,z,y:groundElevation(x,z),yaw:Math.atan2(p.x-x,z-p.z)};return;}
  }
}
export function welcomeAction(s,p,obstacles){
  if(!s.guide||p.swimming||p.mode!=='walking'||Math.hypot(p.x-s.guide.x,p.z-s.guide.z)>4)return false;
  if(s.phase==='waiting'){
    const route=homeRoute(s.guide,obstacles);if(!route.length)return false;
    s.route=route;s.index=0;s.phase='leading';return true;
  }
  if(s.phase==='doorstep'&&Math.hypot(p.x-FIRST_HOME.x,p.z-FIRST_HOME.z)<4){s.phase='settled';return true;}
  return false;
}
export function stepWelcome(s,p,delta){
  s.speed=0;if(s.phase!=='leading'||!s.guide)return;
  if(p.swimming||p.mode!=='walking'||Math.hypot(p.x-s.guide.x,p.z-s.guide.z)>7)return;
  let budget=Math.min(.05,Math.max(0,delta))*1.65;
  while(budget>0&&s.index<s.route.length){
    const next=s.route[s.index],dx=next.x-s.guide.x,dz=next.z-s.guide.z,d=Math.hypot(dx,dz);
    if(d<.001){s.index++;continue;}
    const move=Math.min(d,budget);s.guide.x+=dx/d*move;s.guide.z+=dz/d*move;s.guide.yaw=Math.atan2(dx,-dz);s.guide.y=groundElevation(s.guide.x,s.guide.z);s.walked+=move;s.speed=1.65;budget-=move;
    if(move===d)s.index++;
  }
  if(s.index===s.route.length){s.phase='doorstep';s.speed=0;}
}
export function welcomeCopy(s,p){
  const distance=s.guide?Math.hypot(p.x-s.guide.x,p.z-s.guide.z):0,d=Math.round(distance);
  if(s.phase==='waiting')return {title:'Mara · Your welcome guide',body:'“Welcome to Porto Sol. I’m Mara. You must be tired from the journey. Your room is ready at Casa Aurora. Shall we walk there together?”',action:d<=4?'F · Meet Mara':`Find Mara · ${d}m`};
  if(s.phase==='leading')return {title:'A street to call your own',body:distance>7?'“Take your time. I’ll wait here for you.”':s.index>s.route.length*.6?'“That’s Casa Aurora ahead. Put your bag down first. There’s time to figure out the rest.”':'“I remember my first morning here. Let’s get you settled. The café and cycle shop are just along this street.”',action:`Follow Mara · ${d}m · W to walk, A / D to turn`};
  if(s.phase==='doorstep')return {title:'Your first room · Casa Aurora',body:'“Here we are. A bed, a little desk, and a key of your own. Leave your suitcase by the bed. You can come back whenever you need a quiet moment.”',action:'F · Put down your suitcase'};
  return {title:'A place to begin',body:'Your suitcase is safe at Casa Aurora. Take a breath. Send a message home when you’re ready. The town is yours to get to know.',action:'Suitcase stored · First home saved'};
}
