import {groundElevation,shorelineX} from './landscape.js';
export {groundElevation,shorelineX} from './landscape.js';
export const PORTO_BOUNDS = Object.freeze({minX:-479,maxX:64,minZ:-399,maxZ:359});
export const URBAN_BOUNDS = Object.freeze({minX:-119,maxX:64,minZ:-139,maxZ:119});
export const SPAWN = Object.freeze({ x: 47, z: 66, yaw: -0.23, pitch: 0.25 });
export const BIKE_SHOP=Object.freeze({x:29,z:-15,radius:5});
export function inSwimArea(x,z){return Number.isFinite(x)&&Number.isFinite(z)&&x>=-650&&x<=400&&z>=-500&&z<=500&&Math.hypot(x-188,z+161)>29;}
export function canTravelOnFoot(x,z,obstacles,bounds=PORTO_BOUNDS){
  if(canOccupy(x,z,obstacles,.35,bounds))return true;
  return bounds===PORTO_BOUNDS&&!onLand(x,z,.35,bounds)&&inSwimArea(x,z)&&!obstacles.some(b=>x+.35>b.minX&&x-.35<b.maxX&&z+.35>b.minZ&&z-.35<b.maxZ);
}
export function stepSwimmer(p,input,delta,obstacles){
  const elapsed=Math.max(0,Math.min(.1,delta)),steps=Math.max(1,Math.ceil(elapsed*120)),dt=elapsed/steps;
  p.swimming=true;p.grounded=false;p.vy=0;p.vx??=0;p.vz??=0;p.swimTime??=0;
  const enteringSpeed=Math.hypot(p.vx,p.vz);if(enteringSpeed>2.5){p.vx*=2.5/enteringSpeed;p.vz*=2.5/enteringSpeed;}
  for(let i=0;i<steps;i++){
    p.swimTime+=dt;p.yaw+=Math.max(-1,Math.min(1,input.right||0))*1.8*dt;
    const speed=Math.max(-1,Math.min(1,input.forward||0))*(input.sprint?2.5:1.6),drag=1-Math.exp(-3*dt);
    p.vx+=(Math.sin(p.yaw)*speed-p.vx)*drag;p.vz+=(-Math.cos(p.yaw)*speed-p.vz)*drag;
    const x=p.x+p.vx*dt,z=p.z+p.vz*dt;
    if(canTravelOnFoot(x,p.z,obstacles))p.x=x;else p.vx=0;
    if(canTravelOnFoot(p.x,z,obstacles))p.z=z;else p.vz=0;
    if(onLand(p.x,p.z,.35)){p.swimming=false;p.y=groundElevation(p.x,p.z);p.grounded=true;p.jumpHeld=!!input.jump;break;}
  }
  p.speed=Math.hypot(p.vx,p.vz);p.moving=p.speed>.05;
  if(p.swimming)p.y=-2.55+Math.min(1,p.speed/1.6)*.4+Math.sin(p.swimTime*3)*.05;
  return p;
}
export const CHALLENGE_BIKE=Object.freeze({x:40,y:.015,z:-368,radius:3.5,color:0xf16b3d,replace:true});
export const LANDMARKS = Object.freeze([
  {id:'home',name:'Casa Aurora',subtitle:'Your first room in Porto Sol. A place to leave your suitcase and come back to.',x:19,z:-83,radius:5,number:'12'},
  {id:'skyway',name:'Skyway Ride',subtitle:'Endless cycling over the sea to the mountains. Press F at the gate.',x:55,z:-380,radius:9,number:'11'},
  { id: 'cafe', name: 'Café Luma', subtitle: 'A slow morning, any time of day.', x: 31, z: 10, radius: 10, number: '01' },
  { id: 'pier', name: 'The old pier', subtitle: 'Nothing between you and the horizon.', x: 105, z: -36, radius: 11, number: '02' },
  { id: 'garden', name: 'Jardim do Sol', subtitle: 'Take the long way home.', x: -57, z: 64, radius: 15, number: '03' },
  {id:'north',name:'Bairro do Mar',subtitle:'A new stretch of sea and city.',x:48,z:-200,radius:14,number:'04'},
  {id:'palms',name:'Parque das Palmeiras',subtitle:'Wide paths under the trees.',x:-179,z:103,radius:14,number:'05'},
  {id:'south',name:'Mercado Sul',subtitle:'The southern end of town.',x:34,z:171,radius:14,number:'06'},
  {id:'olives',name:'Parque das Oliveiras',subtitle:'A little shade, a longer ride.',x:-350,z:78,radius:18,number:'07'},
  {id:'village',name:'Vila Poente',subtitle:'Quiet streets at the western edge.',x:-410,z:-158,radius:18,number:'08'},
  {id:'coast',name:'Costa Dourada',subtitle:'The coast keeps going.',x:40,z:310,radius:18,number:'09'},
  {id:'bikes',name:'Porto Cycle House',subtitle:'Collect a bicycle here. Press F by the entrance.',x:29,z:-15,radius:5,number:'10'},
]);

export function onLand(x, z, radius = 0.95, bounds = PORTO_BOUNDS) {
  const main = x >= bounds.minX + radius && x <= (bounds===PORTO_BOUNDS?shorelineX(z):bounds.maxX) - radius && z >= bounds.minZ + radius && z <= bounds.maxZ - radius;
  const pier = x >= 60 && x <= 117 - radius && z >= -42 + radius && z <= -30 - radius;
  return main || pier;
}

export function canOccupy(x, z, obstacles, radius = 0.95, bounds = PORTO_BOUNDS) {
  if (!onLand(x, z, radius, bounds)) return false;
  return !obstacles.some(b => x + radius > b.minX && x - radius < b.maxX && z + radius > b.minZ && z - radius < b.maxZ);
}

export function createPlayer() {
  return { ...SPAWN, mode: 'cycling', bike: null, swimming:false,swimTime:0,y: 0, vx: 0, vz: 0, vy: 0, grounded: true, walked: 0, moving: false, speed: 0, steering: 0 };
}
export function collectBicycle(p,obstacles=[],station=BIKE_SHOP){
  if(p.grounded===false)return 'Land before collecting a bicycle.';
  if(!station.replace&&(p.mode!=='walking'||p.bike))return 'You already have a bicycle.';
  if(Math.hypot(p.x-station.x,p.z-station.z)>station.radius)return 'Visit the bicycle pickup to collect a bicycle.';
  if(!canOccupy(p.x,p.z,obstacles))return 'Step into the clear area outside the cycle shop.';
  Object.assign(p,{mode:'cycling',bike:null,speed:0,vx:0,vz:0,moving:false});return null;
}

export function stepPlayer(p, input, delta, obstacles, bounds = PORTO_BOUNDS) {
  if(p.mode==='walking')return stepWalker(p,input,delta,obstacles,bounds);
  const dt = Math.min(Math.max(delta, 0), 0.05);
  const forward = Math.max(-1, Math.min(1, input.forward || 0));
  const steering = Math.max(-1, Math.min(1, input.right || 0));
  const walking = p.mode === 'walking';
  const boosted = !walking && input.boost && forward > 0 && !input.brake;
  const maxSpeed = boosted ? 15 : walking ? (input.sprint ? 4.2 : 2.2) : (input.sprint ? 10 : 6);
  const targetSpeed = forward > 0 ? maxSpeed : forward < 0 ? (walking ? -1.5 : -2.5) : 0;
  const acceleration = input.brake ? 18 : forward ? (walking ? 12 : boosted ? 11 : 4) : (walking ? 14 : 1.8);
  const target = input.brake ? 0 : targetSpeed;
  p.speed += Math.sign(target-p.speed)*Math.min(Math.abs(target-p.speed), acceleration*dt);
  p.steering += (steering-p.steering)*(1-Math.exp(-10*dt));
  // Steering changes heading, never strafes; reverse steering follows the wheels.
  p.yaw += p.steering * (walking ? 2.3 : Math.min(Math.abs(p.speed)/2, 1) * Math.sign(p.speed) * 1.35) * dt;
  p.vx = Math.sin(p.yaw)*p.speed;
  p.vz = -Math.cos(p.yaw)*p.speed;
  const steps = Math.max(1, Math.ceil(Math.hypot(p.vx, p.vz) * dt / 0.15));
  const oldX = p.x, oldZ = p.z;
  for (let i = 0; i < steps; i++) {
    const nextX = p.x + p.vx * dt / steps;
    if (canOccupy(nextX, p.z, obstacles, walking ? .35 : .95, bounds)) p.x = nextX; else p.vx = 0;
    const nextZ = p.z + p.vz * dt / steps;
    if (canOccupy(p.x, nextZ, obstacles, walking ? .35 : .95, bounds)) p.z = nextZ; else p.vz = 0;
  }
  const distance = Math.hypot(p.x - oldX, p.z - oldZ);
  p.walked += distance * Math.sign(p.speed);
  p.moving = distance > 0.002;
  if (distance < Math.abs(p.speed)*dt*.5) p.speed = 0;
  p.y = bounds===PORTO_BOUNDS?groundElevation(p.x,p.z):0; p.vy = 0; p.grounded = true;
  return p;
}

export function stepWalker(p,input,delta,obstacles,bounds=PORTO_BOUNDS){
  if(bounds===PORTO_BOUNDS&&!onLand(p.x,p.z,.35))return stepSwimmer(p,input,delta,obstacles);
  p.swimming=false;
  const elapsed=Math.min(.1,Math.max(0,delta)),steps=Math.max(1,Math.ceil(elapsed/(1/120))),dt=elapsed/steps;
  const forward=Math.max(-1,Math.min(1,input.forward||0)),turn=Math.max(-1,Math.min(1,input.right||0));
  p.y??=0;p.vy??=0;p.vx??=0;p.vz??=0;
  const ground=()=>bounds===PORTO_BOUNDS?groundElevation(p.x,p.z):0;
  p.grounded=p.y<=ground()+.001&&p.vy<=0;
  if(p.grounded){p.y=ground();p.vy=0;}
  if(input.jump&&!p.jumpHeld&&p.grounded){p.vy=5.2;p.grounded=false;}
  p.jumpHeld=!!input.jump;
  let traveled=0;
  for(let i=0;i<steps;i++){
    p.steering+=(turn-p.steering)*(1-Math.exp(-10*dt));
    p.yaw+=p.steering*(p.grounded?2.5:1.1)*dt;
    const targetSpeed=input.brake?0:forward*(forward<0?1.5:input.sprint?4.8:2.1);
    const desiredX=Math.sin(p.yaw)*targetSpeed,desiredZ=-Math.cos(p.yaw)*targetSpeed;
    const dx=desiredX-p.vx,dz=desiredZ-p.vz,length=Math.hypot(dx,dz);
    const acceleration=p.grounded?(forward?9:14):2.2,amount=Math.min(1,acceleration*dt/Math.max(length,.00001));
    p.vx+=dx*amount;p.vz+=dz*amount;
    const oldX=p.x,oldZ=p.z;
    const nextX=p.x+p.vx*dt;if(canTravelOnFoot(nextX,p.z,obstacles,bounds))p.x=nextX;else p.vx=0;
    const nextZ=p.z+p.vz*dt;if(canTravelOnFoot(p.x,nextZ,obstacles,bounds))p.z=nextZ;else p.vz=0;
    if(bounds===PORTO_BOUNDS&&!onLand(p.x,p.z,.35))return stepSwimmer(p,input,0,obstacles);
    const distance=Math.hypot(p.x-oldX,p.z-oldZ);traveled+=distance;
    if(p.grounded)p.walked+=distance*(forward<0?-1:1);
    // Constant gravity with analytic displacement avoids frame-rate-dependent jumps.
    if(p.grounded){p.y=ground();p.vy=0;}
    else {p.y+=p.vy*dt-9.81*dt*dt/2;p.vy-=9.81*dt;if(p.y<=ground()){p.y=ground();p.vy=0;p.grounded=true;}}
  }
  p.speed=Math.hypot(p.vx,p.vz)*(forward<0?-1:1);p.moving=traveled>.0001;return p;
}

export function validateSavedPosition(value, obstacles, bounds = PORTO_BOUNDS) {
  if (!value || !['x', 'z', 'yaw', 'pitch'].every(k => Number.isFinite(value[k]))) return null;
  if (!canOccupy(value.x, value.z, obstacles, .95, bounds)) return null;
  return { x: value.x, z: value.z, yaw: value.yaw % (Math.PI * 2), pitch: Math.max(0.05, Math.min(.85, value.pitch)) };
}

// Keep the parked bicycle in world space, and only remount within reach.
export function toggleTravelMode(p, obstacles) {
  if(p.grounded===false)return 'Land before getting on a bicycle.';
  if (p.mode === 'walking') {
    if(!p.bike)return 'Collect a bicycle at Porto Cycle House first.';
    if (!p.bike || Math.hypot(p.x-p.bike.x,p.z-p.bike.z)>2.8) return 'Return to your bicycle to ride again.';
    Object.assign(p,{...p.bike,mode:'cycling',bike:null,speed:0,vx:0,vz:0,moving:false});
    return null;
  }
  if (Math.abs(p.speed)>.6) return 'Brake to a stop before getting off.';
  for (const offset of [Math.PI/2,-Math.PI/2,Math.PI,0]) {
    const x=p.x+Math.sin(p.yaw+offset)*1.3,z=p.z-Math.cos(p.yaw+offset)*1.3;
    if (!canOccupy(x,z,obstacles,.35)) continue;
    p.bike={x:p.x,z:p.z,yaw:p.yaw,walked:p.walked};
    Object.assign(p,{x,z,mode:'walking',speed:0,vx:0,vz:0,moving:false});
    return null;
  }
  return 'Move to a clearer spot to get off.';
}
