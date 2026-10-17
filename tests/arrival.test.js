import test from 'node:test';
import assert from 'node:assert/strict';
import {createArrival,stepArrival,steerArrival,dropArrival,arrivalPose} from '../src/arrival.js';
import {PORTO_BOUNDS} from '../src/movement.js';
test('turning changes heading gradually, independent of the camera',()=>{
  const p={x:0,z:0},a=createArrival(),b=createArrival();stepArrival(a,10);stepArrival(b,10);
  steerArrival(a,p,{forward:1},.05);steerArrival(b,p,{forward:1,orbitYaw:Math.PI},.05);
  assert.deepEqual(a.pilot,b.pilot);
  const before=a.heading;steerArrival(a,p,{right:1},.05);
  assert.ok(a.heading>before&&a.heading-before<.01);
  assert.ok(a.vz<0,'D does not reverse forward motion');
});
test('piloting unlocks after the journey, retains momentum, and drops at the piloted location',()=>{
  const a=createArrival(),p={x:47,z:66};
  steerArrival(a,p,{forward:1},.05);assert.equal(a.pilot,undefined);
  stepArrival(a,10);const start=arrivalPose(a,p);
  for(let i=0;i<100;i++)steerArrival(a,p,{forward:1,right:-1},.05);
  const flown=arrivalPose(a,p);assert.ok(Math.hypot(flown.x-start.x,flown.z-start.z)>5);
  stepArrival(a,5);steerArrival(a,p,{},.05);
  assert.notEqual(arrivalPose(a,p).x,flown.x);const chosen=arrivalPose(a,p);
  assert.equal(dropArrival(a,p),true);stepArrival(a,7);
  assert.equal(p.x,chosen.x);assert.equal(p.z,chosen.z);
  steerArrival(a,p,{forward:1},.05);assert.equal(p.x,chosen.x);
});
test('wind drifts an idle balloon and braking does not apply reverse thrust',()=>{
  const a=createArrival(),p={x:0,z:0};stepArrival(a,10);
  for(let i=0;i<100;i++)steerArrival(a,p,{},.05);
  assert.ok(Math.hypot(a.pilot.x,a.pilot.z)>1);
  for(let i=0;i<100;i++)steerArrival(a,p,{forward:1},.05);
  const speed=a.vz;steerArrival(a,p,{forward:-1},.05);
  assert.ok(a.vz>speed&&a.vz<0);
});
test('piloting stays within the island boundaries',()=>{
  const a=createArrival(),p={x:47,z:66};stepArrival(a,10);
  for(let i=0;i<5000;i++)steerArrival(a,p,{forward:1},.05);
  const pose=arrivalPose(a,p);assert.ok(pose.x>=PORTO_BOUNDS.minX+2&&pose.z>=PORTO_BOUNDS.minZ+2);
});
test('arrival waits for an explicit drop after ten seconds and lands by parachute',()=>{
  const a=createArrival(),p={x:20,z:10};
  assert.equal(dropArrival(a),false);assert.equal(arrivalPose(a,p).y,42);
  stepArrival(a,9.9);assert.equal(dropArrival(a),false);
  stepArrival(a,.1);assert.equal(a.phase,'balloon');assert.equal(arrivalPose(a,p).x,20);
  assert.equal(dropArrival(a,p),true);
  stepArrival(a,3.5);assert.equal(arrivalPose(a,p).y,21);assert.equal(dropArrival(a),false);
  stepArrival(a,3.5);assert.equal(a.phase,'landed');assert.deepEqual(arrivalPose(a,p),{x:20,y:0,z:10});
});
test('waiting keeps touring, and jumping preserves the chosen location through touchdown',()=>{
  const a=createArrival(),p={x:47,z:66};stepArrival(a,10);
  const first=arrivalPose(a,p);stepArrival(a,30);const chosen=arrivalPose(a,p);
  assert.ok(Math.hypot(chosen.x-first.x,chosen.z-first.z)>50);
  assert.equal(dropArrival(a,p),true);assert.deepEqual(arrivalPose(a,p),chosen);
  assert.equal(p.x,chosen.x);assert.equal(p.z,chosen.z);
  stepArrival(a,7);assert.deepEqual(arrivalPose(a,p),{x:chosen.x,y:0,z:chosen.z});
});
test('a blocked drop drifts to nearby clear ground and refuses a fully blocked area',()=>{
  const a=createArrival(),p={x:47,z:66};stepArrival(a,10);
  assert.equal(dropArrival(a,p,()=>false),false);assert.equal(a.phase,'balloon');
  assert.equal(dropArrival(a,p,(x,z)=>x>=49),true);
  assert.ok(p.x>=49);assert.deepEqual(arrivalPose(a,p),{x:47,y:42,z:66});
  stepArrival(a,7);assert.equal(arrivalPose(a,p).x,p.x);
});
