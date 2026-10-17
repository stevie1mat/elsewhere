import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {createRide,stepRide,rideInput,Skyway,SKYWAY_GATE} from '../src/skyway.js';
const empty=()=>({...createRide(()=>.5),next:Infinity});
test('lane controls, jumps, pickups and shields work',()=>{
  const s=empty();rideInput(s,'KeyA');rideInput(s,'KeyA');assert.equal(s.lane,0);rideInput(s,'KeyD');
  s.items=[{d:.1,lane:1,type:'coin'},{d:.2,lane:1,type:'gem'},{d:.3,lane:1,type:'shield'},{d:.4,lane:1,type:'barrier'}];stepRide(s,.05);
  assert.equal(s.coins,1);assert.equal(s.gems,1);assert.equal(s.lives,3);assert.equal(s.shield,false);
  s.items=[];rideInput(s,'Space');for(let i=0;i<15;i++)stepRide(s,1/60);assert.ok(s.jump>1);
  s.items=[{d:s.distance+.1,lane:1,type:'barrier'}];s.immune=0;stepRide(s,.02);assert.equal(s.lives,3);
});
test('collisions end a ride and stop scoring',()=>{
  const s=empty();for(let i=0;i<3;i++){s.immune=0;s.items=[{d:s.distance+.1,lane:1,type:'barrier'}];stepRide(s,.02);}
  assert.equal(s.running,false);const distance=s.distance;stepRide(s,.05);assert.equal(s.distance,distance);
});
test('endless generation stays bounded with a safe lane per obstacle row',()=>{
  const s=createRide(()=>.5);for(let i=0;i<30000;i++){s.lives=3;stepRide(s,.05);assert.ok(s.items.length<60);}
  assert.ok(s.distance>30000);assert.equal(s.speed,26);
  const rows=new Map();for(const item of s.items.filter(i=>i.type==='barrier'))rows.set(item.d,(rows.get(item.d)||0)+1);
  assert.ok([...rows.values()].every(n=>n<=2));
});
test('sea mountain route loops continuously and uses fixed render pools',()=>{
  const route=new Skyway(new T.Scene()),a=route.pose(0,1),b=route.pose(route.length,1);
  assert.ok(Math.hypot(a.x-SKYWAY_GATE.x,a.z-SKYWAY_GATE.z)<.01);
  assert.ok(Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z)<.001);
  assert.ok(route.pose(route.length*.5,1).y>100);
  assert.equal(Object.keys(route.pools).length,4);
  const s=createRide();stepRide(s,.05);route.update(s,1);assert.ok(Object.values(route.pools).every(m=>m.count<=64));
  route.update(null,2);assert.ok(Object.values(route.pools).every(m=>m.count===0));
});
