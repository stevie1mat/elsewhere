import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {createRide,stepRide,rideInput,Skyway,SKYWAY_GATE,keepOutsideRamp,SKYWAY_ENTRY_BLOCK} from '../src/skyway.js';
import {challengeGeometry} from '../src/challenge-pickups.js';
const empty=()=>({...createRide(()=>.5),next:Infinity});
test('entrance railing has a real open gap, not a closed fence through the arch',()=>{
  const route=new Skyway(new T.Scene());
  for(const side of [-1,1]){
    const rail=route.group.getObjectByName(`Skyway open entrance railing ${side}`);
    assert.equal(rail.geometry.parameters.closed,false);
    assert.equal(rail.geometry.parameters.path.closed,false);
    const p=rail.geometry.attributes.position;
    for(let i=0;i<p.count;i++)assert.ok(Math.hypot(p.getX(i)-SKYWAY_GATE.x,p.getZ(i)-SKYWAY_GATE.z)>12,'no railing inside the entrance approach');
  }
  const matrix=new T.Matrix4();route.group.getObjectByName('Open rounded Skyway arches').getMatrixAt(0,matrix);
  assert.equal(matrix.elements[0],1,'entrance arch faces south toward the city');
});
test('lane controls, jumps, pickups and shields work',()=>{
  const s=empty();rideInput(s,'KeyA');rideInput(s,'KeyA');assert.equal(s.lane,0);rideInput(s,'KeyD');
  s.items=[{d:.1,lane:1,type:'coin'},{d:.2,lane:1,type:'gem'},{d:.3,lane:1,type:'shield'},{d:.4,lane:1,type:'barrier'}];stepRide(s,.05);
  assert.equal(s.coins,1);assert.equal(s.gems,1);assert.equal(s.lives,3);assert.equal(s.shield,false);
  s.items=[];rideInput(s,'Space');for(let i=0;i<18;i++)stepRide(s,1/60);assert.ok(s.jump>1);
  s.items=[{d:s.distance+.1,lane:1,type:'barrier'}];s.immune=0;stepRide(s,.02);assert.equal(s.lives,3);
});
test('entrance keeps free-roam riders outside the elevated ramp',()=>{
 const p={x:55,z:-382,y:0,speed:6};keepOutsideRamp(p);assert.ok(p.z>SKYWAY_ENTRY_BLOCK.maxZ+1);assert.equal(p.speed,0);assert.ok(Math.hypot(p.x-SKYWAY_GATE.x,p.z-SKYWAY_GATE.z)<SKYWAY_GATE.radius);
});
test('challenge has gradual acceleration, bicycle-strength braking and game gravity',()=>{
 const s=empty();stepRide(s,.05);assert.ok(s.speed>0&&s.speed<1);
 for(let i=0;i<120;i++)stepRide(s,.05);const speed=s.speed;stepRide(s,.05,{brake:true});assert.ok(s.speed<speed);
 rideInput(s,'Space');let apex=0;for(let i=0;i<120;i++){stepRide(s,1/120);apex=Math.max(apex,s.jump);}assert.ok(apex>1.36&&apex<1.39);
});
test('detailed pickup models merge into valid single-draw geometry',()=>{
 for(const type of ['coin','gem','shield','barrier']){const g=challengeGeometry(type);assert.ok(g?.index);assert.ok(g.attributes.color);assert.ok(g.attributes.position.count<5000);g.dispose();}
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
test('bridge support tops remain below the sloping road, not visible as green hazards',()=>{
 const route=new Skyway(new T.Scene()),supports=route.group.getObjectByName('Skyway supports below deck'),m=new T.Matrix4();
 for(let i=0;i<supports.count;i++){
   supports.getMatrixAt(i,m);const top=m.elements[13]+m.elements[5]/2,d=i/supports.count*route.length;
   for(const offset of [-2,0,2])assert.ok(top<route.pose(d+offset,1).y-.9);
 }
 assert.ok(route.group.getObjectByName('Skyway textured road').geometry.attributes.uv);
});
