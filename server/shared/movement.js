export const SPAWN = Object.freeze({ x: 47, z: 66, yaw: -0.23, pitch: 0.25 });
export const LANDMARKS = Object.freeze([
  { id: 'cafe', name: 'Café Luma', subtitle: 'A slow morning, any time of day.', x: 31, z: 10, radius: 10, number: '01' },
  { id: 'pier', name: 'The old pier', subtitle: 'Nothing between you and the horizon.', x: 105, z: -36, radius: 11, number: '02' },
  { id: 'garden', name: 'Jardim do Sol', subtitle: 'Take the long way home.', x: -57, z: 64, radius: 15, number: '03' },
]);

export function onLand(x, z, radius = 0.95) {
  const main = x >= -119 + radius && x <= 64 - radius && z >= -139 + radius && z <= 119 - radius;
  const pier = x >= 60 && x <= 117 - radius && z >= -42 + radius && z <= -30 - radius;
  return main || pier;
}

export function canOccupy(x, z, obstacles, radius = 0.95) {
  if (!onLand(x, z, radius)) return false;
  return !obstacles.some(b => x + radius > b.minX && x - radius < b.maxX && z + radius > b.minZ && z - radius < b.maxZ);
}

export function createPlayer() {
  return { ...SPAWN, y: 0, vx: 0, vz: 0, vy: 0, grounded: true, walked: 0, moving: false, speed: 0, steering: 0 };
}

export function stepPlayer(p, input, delta, obstacles) {
  const dt = Math.min(Math.max(delta, 0), 0.05);
  const forward = Math.max(-1, Math.min(1, input.forward || 0));
  const steering = Math.max(-1, Math.min(1, input.right || 0));
  const maxSpeed = input.sprint ? 10 : 6;
  const targetSpeed = forward > 0 ? maxSpeed : forward < 0 ? -2.5 : 0;
  const acceleration = input.brake ? 18 : forward ? 4 : 1.8;
  const target = input.brake ? 0 : targetSpeed;
  p.speed += Math.sign(target-p.speed)*Math.min(Math.abs(target-p.speed), acceleration*dt);
  p.steering += (steering-p.steering)*(1-Math.exp(-10*dt));
  // Steering changes heading, never strafes; reverse steering follows the wheels.
  p.yaw += p.steering * Math.min(Math.abs(p.speed)/2, 1) * Math.sign(p.speed) * 1.35 * dt;
  p.vx = Math.sin(p.yaw)*p.speed;
  p.vz = -Math.cos(p.yaw)*p.speed;
  const steps = Math.max(1, Math.ceil(Math.hypot(p.vx, p.vz) * dt / 0.15));
  const oldX = p.x, oldZ = p.z;
  for (let i = 0; i < steps; i++) {
    const nextX = p.x + p.vx * dt / steps;
    if (canOccupy(nextX, p.z, obstacles)) p.x = nextX; else p.vx = 0;
    const nextZ = p.z + p.vz * dt / steps;
    if (canOccupy(p.x, nextZ, obstacles)) p.z = nextZ; else p.vz = 0;
  }
  const distance = Math.hypot(p.x - oldX, p.z - oldZ);
  p.walked += distance * Math.sign(p.speed);
  p.moving = distance > 0.002;
  if (distance < Math.abs(p.speed)*dt*.5) p.speed = 0;
  p.y = 0; p.vy = 0; p.grounded = true;
  return p;
}

export function validateSavedPosition(value, obstacles) {
  if (!value || !['x', 'z', 'yaw', 'pitch'].every(k => Number.isFinite(value[k]))) return null;
  if (!canOccupy(value.x, value.z, obstacles)) return null;
  return { x: value.x, z: value.z, yaw: value.yaw % (Math.PI * 2), pitch: Math.max(0.05, Math.min(.85, value.pitch)) };
}
