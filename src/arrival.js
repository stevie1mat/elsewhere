import {PORTO_BOUNDS} from './movement.js';
export const JOURNEY_SECONDS=10;
export const DESCENT_SECONDS=7;
export function createArrival(origin){return {phase:'balloon',elapsed:0,...(origin?{origin:{x:origin.x,z:origin.z}}:{})};}
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
export function stepArrival(a,dt,options={}){
  if(!a||a.phase==='landed')return;
  if(a.phase==='parachute'&&a.canopy){stepParachute(a,dt,options);return;}
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
  a.canopy={x:from.x,y:from.y,z:from.z,vy:0,vx:(a.vx||0)*.5,vz:(a.vz||0)*.5};
  p.x=landing.x;p.z=landing.z;return true;
}
export function stepParachute(a,delta,{input={},player,canLand=()=>true}={}){
  const c=a.canopy,total=Math.min(20,Math.max(0,delta)),steps=Math.max(1,Math.ceil(total*120)),dt=total/steps;
  for(let i=0;i<steps&&a.phase==='parachute';i++){
    a.elapsed+=dt;
    const turn=Math.max(-1,Math.min(1,input.right||0)),flare=(input.forward||0)<0;
    a.steering=(a.steering||0)+(turn-(a.steering||0))*(1-Math.exp(-4*dt));
    a.heading=Math.atan2(Math.sin((a.heading||0)+a.steering*.8*dt),Math.cos((a.heading||0)+a.steering*.8*dt));
    const inflation=Math.min(1,a.elapsed/.9),wind=balloonWind(a.elapsed+JOURNEY_SECONDS);
    const terminal=flare&&c.y<10?2.8:5.4;
    c.vy+=(-9.81-(9.81/(terminal*terminal))*inflation*c.vy*Math.abs(c.vy))*dt;
    const glide=flare?.5:(input.forward||0)>0?3.2:1.1;
    let targetX=wind.x*.6+Math.sin(a.heading)*glide,targetZ=wind.z*.6-Math.cos(a.heading)*glide;
    // Assist a blocked launch toward its nearby safe landing area above roof height.
    if(!canLand(c.x,c.z)){const dx=a.landing.x-c.x,dz=a.landing.z-c.z,length=Math.hypot(dx,dz)||1;targetX=dx/length*4;targetZ=dz/length*4;}
    c.vx+=(targetX-c.vx)*(1-Math.exp(-1.5*dt));c.vz+=(targetZ-c.vz)*(1-Math.exp(-1.5*dt));
    const nx=c.x+c.vx*dt,nz=c.z+c.vz*dt;
    if(canLand(nx,nz)||!canLand(c.x,c.z)){c.x=nx;c.z=nz;}else{c.vx*=Math.exp(-8*dt);c.vz*=Math.exp(-8*dt);}
    c.y=Math.max(canLand(c.x,c.z)?0:25,c.y+c.vy*dt);
    if(canLand(c.x,c.z))a.landing={x:c.x,z:c.z};
    if(c.y<=0){a.phase='landed';c.vy=0;if(player){player.x=c.x;player.z=c.z;player.y=0;player.yaw=a.heading;player.vy=0;player.grounded=true;}}
  }
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
    const origin=a.origin??p;
    if(a.elapsed>=JOURNEY_SECONDS)return tourPose(a.elapsed-JOURNEY_SECONDS,origin);
    const t=a.elapsed/JOURNEY_SECONDS,s=t*t*(3-2*t);return {x:origin.x+70*(1-s),y:42+Math.sin(t*Math.PI)*3,z:origin.z+35*(1-s)};
  }
  if(a.canopy)return {x:a.canopy.x,y:a.canopy.y,z:a.canopy.z};
  const t=Math.min(1,a.elapsed/DESCENT_SECONDS),from=a.from??{x:p.x,y:42,z:p.z},landing=a.landing??p,s=t*t*(3-2*t);
  return {x:from.x+(landing.x-from.x)*s,y:from.y*(1-t),z:from.z+(landing.z-from.z)*s};
}
