import test from 'node:test';
import assert from 'node:assert/strict';
import {createBalloon,animateHelm,createParachute,createParachutePack} from '../src/flight-models.js';
import {createArrival,stepArrival,steerArrival} from '../src/arrival.js';

test('balloon has a visible wheel that follows steering and returns to center',()=>{
  const balloon=createBalloon(),wheel=balloon.getObjectByName('Balloon steering wheel');
  assert.ok(wheel?.children.length>6);
  const a=createArrival(),p={x:0,z:0};stepArrival(a,10);
  steerArrival(a,p,{right:1},.05);animateHelm(balloon,a.steering);
  assert.ok(wheel.rotation.z<0);
  const turned=Math.abs(wheel.rotation.z);
  steerArrival(a,p,{},.05);animateHelm(balloon,a.steering);
  assert.ok(Math.abs(wheel.rotation.z)<turned);
  animateHelm(balloon,-1);assert.ok(wheel.rotation.z>0);
  animateHelm(balloon);assert.equal(Math.abs(wheel.rotation.z),0);
});
test('parachute has inflated panels, harness risers and a separate wearable pack',()=>{
  const canopy=createParachute(),pack=createParachutePack();
  assert.equal(canopy.children.filter(o=>o.name==='Inflated fabric panel').length,16);
  assert.equal(canopy.children.filter(o=>o.name==='Harness riser').length,2);
  assert.ok(pack.children.length>=8);
  for(const root of [canopy,pack])root.traverse(o=>{
    const positions=o.geometry?.attributes.position;
    if(positions)assert.ok(Array.from(positions.array).every(Number.isFinite));
  });
});
