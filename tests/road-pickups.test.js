import test from 'node:test';
import assert from 'node:assert/strict';
import { RoadPickups, PickupDisplay } from '../src/road-pickups.js';
import { stepPlayer,createPlayer } from '../src/movement.js';
import { RiderCombat } from '../src/rider-combat.js';
import * as T from 'three';

test('ride-over pickups grant rewards once, respawn, and reject walking or paused collection',()=>{
 const s=new RoadPickups([],()=>0),p={...createPlayer(),speed:3};
 s.items=[{x:p.x,z:p.z,type:'nitro',cooldown:0}];
 assert.equal(s.update(0,p).length,0);p.mode='walking';assert.equal(s.update(.05,p).length,0);
 p.mode='cycling';assert.equal(s.update(.05,p).length,1);assert.equal(s.nitro,50);assert.equal(s.update(.05,p).length,0);
 p.x+=10;s.update(40,p);assert.equal(s.items[0].cooldown,0);p.x-=10;s.update(.05,p);assert.equal(s.nitro,100);
 s.items=[{x:p.x,z:p.z,type:'mystery',cooldown:0}];s.random=()=>.5;s.update(.05,p);assert.equal(s.coins,10);
 s.nitro=0;assert.equal(s.buyNitro(),true);assert.equal(s.coins,0);assert.equal(s.nitro,50);assert.equal(s.buyNitro(),false);
 s.items=[{x:p.x,z:p.z,type:'shield',cooldown:0}];s.update(.05,p);assert.equal(s.absorbHit(),true);assert.equal(s.absorbHit(),false);
});
test('nitro drains only while boosting and high speed respects obstacles',()=>{
 const s=new RoadPickups(),p={...createPlayer(),speed:6,yaw:0};s.nitro=100;
 for(let i=0;i<120;i++)stepPlayer(p,{forward:1,boost:s.boost(1/60,p,true,false)},1/60,[]);
 assert.ok(p.speed>14);assert.ok(Math.abs(s.nitro-50)<.001);
 const fuel=s.nitro;assert.equal(s.boost(.05,p,true,true),false);assert.equal(s.nitro,fuel);
 const wall=[{minX:40,maxX:55,minZ:p.z-4,maxZ:p.z-3}];
 for(let i=0;i<120;i++)stepPlayer(p,{forward:1,boost:true},1/60,wall);
 assert.ok(p.z>=wall[0].maxZ+.95);
 s.nitro=0;assert.equal(s.boost(.05,p,true,false),false);
});
test('rival hits consume the shield before slowing the rider',()=>{
 const c=new RiderCombat(),s=new RoadPickups(),p={...createPlayer(),yaw:0,speed:3};
 c.rivals=[{...c.rivals[0],x:p.x-1.2,z:p.z,lane:p.x-1.2,attackCooldown:0}];
 s.shield=true;c.update(.01,p,[],s);assert.equal(s.shield,false);assert.equal(p.speed,3);assert.match(c.incoming,/blocked/);
 c.rivals[0].attackCooldown=0;c.update(.01,p,[],s);assert.ok(p.speed<3);
});
test('pickup models match collectible state',()=>{
 const scene=new T.Scene(),s=new RoadPickups(),display=new PickupDisplay(scene,s),p=createPlayer();
 assert.ok(new Set(s.items.map(i=>i.type)).size===4);
 s.items[0].cooldown=3;s.shield=true;display.update(p);
 assert.equal(display.models[0].group.visible,false);
 s.reset();display.update(p);assert.equal(display.models[0].group.visible,true);
});

test('pickups scatter safely with spacing and reshuffle their visible locations on reset',()=>{
 let seed=42;const random=()=>((seed=(1664525*seed+1013904223)>>>0)/4294967296);
 const obstacles=[{minX:40,maxX:58,minZ:0,maxZ:50}];
 const s=new RoadPickups(obstacles,random),display=new PickupDisplay(new T.Scene(),s);
 const previous=s.items.map(p=>[p.x,p.z]);
 assert.equal(s.items.length,64);
 assert.ok(new Set(s.items.map(p=>p.x)).size>20,'varied positions across the road width');
 for(let i=0;i<s.items.length;i++){
   const a=s.items[i];
   assert.ok(!(a.x>38.5&&a.x<59.5&&a.z> -1.5&&a.z<51.5),'clear of obstacles');
   for(const b of s.items.slice(i+1))assert.ok(Math.hypot(a.x-b.x,a.z-b.z)>=8);
 }
 s.reset();display.update(createPlayer());
 assert.notDeepEqual(s.items.map(p=>[p.x,p.z]),previous);
 s.items.forEach((p,i)=>assert.deepEqual(display.models[i].group.position.toArray(),[p.x,0,p.z]));
});
