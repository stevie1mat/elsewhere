import {PORTO_BOUNDS} from './movement.js';
export const JOURNEY_SECONDS=10;
export const DESCENT_SECONDS=7;
export function createArrival(){return {phase:'balloon',elapsed:0};}
// Game-assisted propulsion: real balloons cannot steer against the wind.
// Heading, angular inertia and drag replace camera-relative strafing.
export function balloonWind(time){return {x:1.4+Math.sin(time*.13)*.8,z:-1.2+Math.cos(time*.09)*.7};}
export function steerArrival(a,p,input,dt){
  if(a?.phase!=='balloon'||a.elapsed<JOURNEY_SECONDS)return;
  dt=Math.min(.05,Math.max(0,dt));
  const forward=Math.max(-1,Math.min(1,input.forward||0)),right=Math.max(-1,Math.min(1,input.right||0));
  a.steering=(a.steering||0)+(right-(a.steering||0))*(1-Math.exp(-5*dt));
  if(!a.pilot){const pose=arrivalPose(a,p);a.pilot={x:pose.x,z:pose.z};}
  a.heading??=0;a.vx??=0;a.vz??=0;a.turnRate??=0;
  a.turnRate+=(a.steering*.55-a.turnRate)*(1-Math.exp(-1.8*dt));
  a.heading=Math.atan2(Math.sin(a.heading+a.turnRate*dt),Math.cos(a.heading+a.turnRate*dt));
  const wind=balloonWind(a.elapsed),drag=forward<0?1.1:.22,thrust=Math.max(0,forward)*2.4;
  a.vx+=(Math.sin(a.heading)*thrust+(wind.x-a.vx)*drag)*dt;
  a.vz+=(-Math.cos(a.heading)*thrust+(wind.z-a.vz)*drag)*dt;
  a.pilot.x+=a.vx*dt;a.pilot.z+=a.vz*dt;
  // Soft world-edge containment; no bounce or instantaneous reversal.
  for(const [axis,velocity,min,max] of [['x','vx',PORTO_BOUNDS.minX+2,PORTO_BOUNDS.maxX-2],['z','vz',PORTO_BOUNDS.minZ+2,PORTO_BOUNDS.maxZ-2]]){
    if(a.pilot[axis]<min||a.pilot[axis]>max){a.pilot[axis]=Math.max(min,Math.min(max,a.pilot[axis]));a[velocity]=0;}
  }
}
export function stepArrival(a,dt){
  if(!a||a.phase==='landed')return;
  a.elapsed+=Math.max(0,dt);
  if(a.phase==='parachute'&&a.elapsed>=DESCENT_SECONDS){a.phase='landed';a.elapsed=0;}
}
export function dropArrival(a,p,canLand=()=>true){
  if(a?.phase!=='balloon'||a.elapsed<JOURNEY_SECONDS)return false;
  const from=arrivalPose(a,p);let landing=canLand(from.x,from.z)?{x:from.x,z:from.z}:null;
  // Stay near the chosen location, but never finish inside a building or water.
  for(let radius=1;!landing&&radius<=40;radius++)for(let i=0;i<32;i++){
    const angle=i*Math.PI/16,x=from.x+Math.cos(angle)*radius,z=from.z+Math.sin(angle)*radius;
    if(canLand(x,z)){landing={x,z};break;}
  }
  if(!landing)return false;
  a.from=from;a.landing=landing;a.phase='parachute';a.elapsed=0;
  p.x=landing.x;p.z=landing.z;return true;
}
function tourPose(elapsed,p){
  const route=[{x:p.x,z:p.z},{x:47,z:-200},{x:-218,z:-232},{x:-218,z:136},{x:34,z:171},{x:p.x,z:p.z}];
  const lengths=route.slice(1).map((b,i)=>Math.hypot(b.x-route[i].x,b.z-route[i].z));
  let distance=elapsed*12%lengths.reduce((a,b)=>a+b,0);
  for(let i=0;i<lengths.length;i++){
    if(distance<=lengths[i]){const t=lengths[i]?distance/lengths[i]:0,s=t*t*(3-2*t);return {x:route[i].x+(route[i+1].x-route[i].x)*s,y:42+Math.sin(elapsed*.25)*1.2,z:route[i].z+(route[i+1].z-route[i].z)*s};}
    distance-=lengths[i];
  }
  return {x:p.x,y:42,z:p.z};
}
export function arrivalPose(a,p){
  if(!a||a.phase==='landed')return {x:p.x,y:0,z:p.z};
  if(a.phase==='balloon'){
    if(a.pilot)return {x:a.pilot.x,y:42+Math.sin((a.elapsed-JOURNEY_SECONDS)*.25)*1.2,z:a.pilot.z};
    if(a.elapsed>=JOURNEY_SECONDS)return tourPose(a.elapsed-JOURNEY_SECONDS,p);
    const t=a.elapsed/JOURNEY_SECONDS,s=t*t*(3-2*t);return {x:p.x+70*(1-s),y:42+Math.sin(t*Math.PI)*3,z:p.z+35*(1-s)};
  }
  const t=Math.min(1,a.elapsed/DESCENT_SECONDS),from=a.from??{x:p.x,y:42,z:p.z},landing=a.landing??p,s=t*t*(3-2*t);
  return {x:from.x+(landing.x-from.x)*s,y:from.y*(1-t),z:from.z+(landing.z-from.z)*s};
}
