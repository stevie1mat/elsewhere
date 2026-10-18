import test from 'node:test';
import assert from 'node:assert/strict';
import {createPlayer,stepPlayer,toggleTravelMode,PORTO_BOUNDS,URBAN_BOUNDS} from '../src/movement.js';
import {validPosition,Rooms} from '../server/rooms.js';
import {createLighthouse} from '../src/lighthouse.js';
test('walking enters sea, floats, and returns to walking on shore',()=>{
  const p={...createPlayer(),mode:'walking',x:63.5,z:60,yaw:Math.PI/2};
  for(let i=0;i<100;i++)stepPlayer(p,{forward:1},.05,[]);
  assert.ok(p.swimming&&p.x>64&&p.y< -2&&p.y> -2.7);assert.ok(validPosition(p));
  assert.match(toggleTravelMode(p,[]),/Land/);
  p.yaw=-Math.PI/2;
  for(let i=0;i<140;i++)stepPlayer(p,{forward:1},.05,[]);
  assert.equal(p.swimming,false);assert.equal(p.y,0);assert.ok(p.grounded);
});
test('bicycles stay on shore and urban movement retains its boundary',()=>{
  const p={...createPlayer(),x:63,z:60,yaw:Math.PI/2};for(let i=0;i<100;i++)stepPlayer(p,{forward:1},.05,[]);
  assert.ok(p.x<=PORTO_BOUNDS.maxX-.95);assert.equal(p.swimming,false);
  p.mode='walking';for(let i=0;i<100;i++)stepPlayer(p,{forward:1},.05,[],URBAN_BOUNDS);assert.ok(p.x<=URBAN_BOUNDS.maxX-.35);
});
test('swimming has drag, frame-rate consistency, world bounds and obstacle collision',()=>{
  const run=hz=>{const p={...createPlayer(),mode:'walking',x:90,z:60,yaw:Math.PI/2};for(let i=0;i<hz*3;i++)stepPlayer(p,{forward:1},1/hz,[]);return p;};
  const a=run(30),b=run(120);assert.ok(Math.abs(a.x-b.x)<.03);
  const speed=a.speed;stepPlayer(a,{},.05,[]);assert.ok(a.speed<speed);
  a.x=399.9;for(let i=0;i<100;i++)stepPlayer(a,{forward:1},.05,[]);assert.ok(a.x<=400);
  a.x=90;for(let i=0;i<100;i++)stepPlayer(a,{forward:1},.05,[{minX:92,maxX:94,minZ:50,maxZ:70}]);assert.ok(a.x<91.66);
});
test('server accepts swimming state but not bicycles or invalid depth in water',()=>{
  const rooms=new Rooms(),{room,player}=rooms.join(null,null,{}),p={...createPlayer(),mode:'walking',x:90,z:60,y:-2.3,speed:1.6};
  assert.equal(rooms.position(room,player,p),true);assert.ok(player.position.swimming);assert.equal(player.position.grounded,false);
  assert.equal(rooms.position(room,player,{...p,mode:'cycling'}),false);
  assert.equal(rooms.position(room,player,{...p,y:-20}),false);
});
test('detailed lighthouse batches rock, tower, balcony and lantern into six meshes',()=>{
  const group=createLighthouse();assert.equal(group.children.length,6);assert.equal(group.position.x,188);
  for(const mesh of group.children){assert.ok(mesh.geometry.attributes.position.count>0);mesh.geometry.computeBoundingBox();assert.ok(Number.isFinite(mesh.geometry.boundingBox.max.y));}
  assert.ok(group.children.some(m=>m.material.emissiveIntensity===2));
});
