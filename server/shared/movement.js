export const PORTO_BOUNDS = Object.freeze({minX:-239,maxX:64,minZ:-259,maxZ:199});
export const URBAN_BOUNDS = Object.freeze({minX:-119,maxX:64,minZ:-139,maxZ:119});
export const SPAWN = Object.freeze({ x: 47, z: 66, yaw: -0.23, pitch: 0.25 });
export const LANDMARKS = Object.freeze([
  { id: 'cafe', name: 'Café Luma', subtitle: 'A slow morning, any time of day.', x: 31, z: 10, radius: 10, number: '01' },
  { id: 'pier', name: 'The old pier', subtitle: 'Nothing between you and the horizon.', x: 105, z: -36, radius: 11, number: '02' },
  { id: 'garden', name: 'Jardim do Sol', subtitle: 'Take the long way home.', x: -57, z: 64, radius: 15, number: '03' },
  {id:'north',name:'Bairro do Mar',subtitle:'A new stretch of sea and city.',x:48,z:-200,radius:14,number:'04'},
  {id:'palms',name:'Parque das Palmeiras',subtitle:'Wide paths under the trees.',x:-179,z:103,radius:14,number:'05'},
  {id:'south',name:'Mercado Sul',subtitle:'The southern end of town.',x:34,z:171,radius:14,number:'06'},
]);

export function onLand(x, z, radius = 0.95, bounds = PORTO_BOUNDS) {
  const main = x >= bounds.minX + radius && x <= bounds.maxX - radius && z >= bounds.minZ + radius && z <= bounds.maxZ - radius;
  const pier = x >= 60 && x <= 117 - radius && z >= -42 + radius && z <= -30 - radius;
  return main || pier;
}

export function canOccupy(x, z, obstacles, radius = 0.95, bounds = PORTO_BOUNDS) {
  if (!onLand(x, z, radius, bounds)) return false;
  return !obstacles.some(b => x + radius > b.minX && x - radius < b.maxX && z + radius > b.minZ && z - radius < b.maxZ);
}

export function createPlayer() {
  return { ...SPAWN, mode: 'cycling', bike: null, y: 0, vx: 0, vz: 0, vy: 0, grounded: true, walked: 0, moving: false, speed: 0, steering: 0 };
}

export function stepPlayer(p, input, delta, obstacles, bounds = PORTO_BOUNDS) {
  const dt = Math.min(Math.max(delta, 0), 0.05);
  const forward = Math.max(-1, Math.min(1, input.forward || 0));
  const steering = Math.max(-1, Math.min(1, input.right || 0));
  const walking = p.mode === 'walking';
  const maxSpeed = walking ? (input.sprint ? 4.2 : 2.2) : (input.sprint ? 10 : 6);
  const targetSpeed = forward > 0 ? maxSpeed : forward < 0 ? (walking ? -1.5 : -2.5) : 0;
  const acceleration = input.brake ? 18 : forward ? (walking ? 12 : 4) : (walking ? 14 : 1.8);
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
  p.y = 0; p.vy = 0; p.grounded = true;
  return p;
}

export function validateSavedPosition(value, obstacles, bounds = PORTO_BOUNDS) {
  if (!value || !['x', 'z', 'yaw', 'pitch'].every(k => Number.isFinite(value[k]))) return null;
  if (!canOccupy(value.x, value.z, obstacles, .95, bounds)) return null;
  return { x: value.x, z: value.z, yaw: value.yaw % (Math.PI * 2), pitch: Math.max(0.05, Math.min(.85, value.pitch)) };
}

// Keep the parked bicycle in world space, and only remount within reach.
export function toggleTravelMode(p, obstacles) {
  if (p.mode === 'walking') {
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
