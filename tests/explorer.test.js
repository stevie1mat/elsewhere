import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import * as T from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { Explorer, normalizeLook } from '../src/explorer.js';
import { createPlayer, stepPlayer, toggleTravelMode } from '../src/movement.js';

test('dismount requires stopping and room; walking leaves the bike behind and remount requires proximity',()=>{
  const p=createPlayer();p.speed=4;assert.match(toggleTravelMode(p,[]),/stop/);assert.equal(p.mode,'cycling');p.speed=0;
  const blocked=[{minX:p.x-3,maxX:p.x+3,minZ:p.z-3,maxZ:p.z+3}];assert.match(toggleTravelMode(p,blocked),/clearer/);
  assert.equal(toggleTravelMode(p,[]),null);const parked={...p.bike};assert.equal(p.mode,'walking');
  for(let i=0;i<180;i++)stepPlayer(p,{forward:1},1/60,[]);
  assert.deepEqual(p.bike,parked);assert.ok(p.speed<=2.2);assert.match(toggleTravelMode(p,[]),/Return/);
  p.x=parked.x+1;p.z=parked.z;assert.equal(toggleTravelMode(p,[]),null);assert.equal(p.mode,'cycling');assert.equal(p.x,parked.x);assert.equal(p.bike,null);
});

test('walking respects coast and obstacles and can turn while standing still',()=>{
  const p=createPlayer();toggleTravelMode(p,[]);p.x=62;p.z=60;p.yaw=Math.PI/2;
  for(let i=0;i<120;i++)stepPlayer(p,{forward:1,sprint:true},1/60,[]);
  assert.ok(p.x<=63.65);
  p.x=50;p.speed=0;p.yaw=0;const initial=p.yaw;
  for(let i=0;i<60;i++)stepPlayer(p,{right:1},1/60,[]);
  assert.ok(p.yaw>initial+1);assert.equal(p.x,50);
  p.yaw=0;const wall=[{minX:48,maxX:52,minZ:57,maxZ:58}];
  for(let i=0;i<120;i++)stepPlayer(p,{forward:1},1/60,wall);
  assert.ok(p.z>=58.35);
});

test('real character changes from seated cycling to animated walking with independent wardrobe materials',async()=>{
  const data=await readFile(new URL('../public/assets/people/traveler-man.glb',import.meta.url));
  const gltf=await new GLTFLoader().parseAsync(data.buffer.slice(data.byteOffset,data.byteOffset+data.byteLength),'');
  gltf.scene.traverse(o=>{if(o.isMesh){const prep=m=>{m.name=m.name.includes('head')?'head':'body';return m;};if(Array.isArray(o.material))o.material.forEach(prep);else prep(o.material);}});
  const player=createPlayer(),explorer=new Explorer(gltf.scene,gltf.animations[0]),friend=new Explorer(gltf.scene,gltf.animations[0]);
  explorer.applyLook({outfit:'ocean',helmet:false,backpack:true,sunglasses:true});
  assert.equal(explorer.cycle.rider.getObjectByName('helmet').visible,false);
  assert.equal(explorer.cycle.rider.getObjectByName('backpack').visible,true);
  assert.equal(friend.cycle.rider.getObjectByName('backpack').visible,false);
  assert.equal(normalizeLook({outfit:'unknown',helmet:'no'}).outfit,'original');
  explorer.update(player);assert.equal(explorer.walker.visible,false);
  toggleTravelMode(player,[]);explorer.update(player);const bike=explorer.cycle.group.position.clone();
  assert.equal(explorer.cycle.rider.visible,false);assert.equal(explorer.walker.visible,true);
  const leg=explorer.walker.getObjectByName('Bip01_L_Calf');const pose=leg.quaternion.clone();
  player.walked+=.5;player.x+=1;explorer.update(player);assert.ok(explorer.cycle.group.position.equals(bike));assert.equal(explorer.walker.position.x,player.x);assert.ok(leg.quaternion.angleTo(pose)>.01);
  explorer.group.updateMatrixWorld(true);
  const helmet=explorer.walker.getObjectByName('helmet');const size=new T.Box3().setFromObject(helmet).getSize(new T.Vector3());assert.ok(size.length()<.6&&size.length()>.1,'accessories stay human scale');
  const head=explorer.walker.getObjectByName('Bip01_Head').getWorldPosition(new T.Vector3());assert.ok(helmet.getWorldPosition(new T.Vector3()).distanceTo(head)<.3);
});

test('co-op snapshots preserve parked bikes and reject malformed walking positions',async()=>{
  const {Rooms}=await import('../server/rooms.js');const rooms=new Rooms();const {room,player:remote}=rooms.join(null,null,{});
  const p=createPlayer();toggleTravelMode(p,[]);p.x=63.5;
  assert.equal(rooms.position(room,remote,p),true);
  const state=rooms.snapshot(room).players[0];assert.equal(state.mode,'walking');assert.deepEqual(state.bike,p.bike);
  assert.equal(rooms.position(room,remote,{...p,bike:{...p.bike,x:NaN}}),false);
  assert.equal(rooms.position(room,remote,{...p,bike:null}),false);
});
