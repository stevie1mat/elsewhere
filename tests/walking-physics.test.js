import test from 'node:test';
import assert from 'node:assert/strict';
import {createPlayer,stepPlayer,canOccupy,collectBicycle,toggleTravelMode} from '../src/movement.js';
const walker=()=>({...createPlayer(),mode:'walking',x:0,z:100,yaw:0});
test('walking accelerates, coasts to a stop and does not instantly reverse momentum',()=>{
  const p=walker();stepPlayer(p,{forward:1},1/60,[]);assert.ok(p.speed>0&&p.speed<.2);
  for(let i=0;i<60;i++)stepPlayer(p,{forward:1,sprint:true},1/60,[]);
  assert.ok(p.speed>4.7);const z=p.z;
  stepPlayer(p,{forward:-1},1/60,[]);assert.ok(p.vz<0);
  for(let i=0;i<60;i++)stepPlayer(p,{},1/60,[]);
  assert.equal(p.speed,0);assert.ok(p.z<z);
});
test('jump arc and running distance are consistent at 30, 60 and 120 Hz',()=>{
  const results=[30,60,120].map(hz=>{
    const p=walker();let apex=0;
    for(let i=0;i<hz*2;i++){stepPlayer(p,{forward:1,sprint:true,jump:i===0},1/hz,[]);apex=Math.max(apex,p.y);}
    assert.equal(p.y,0);assert.equal(p.vy,0);assert.equal(p.grounded,true);
    assert.ok(apex>1.36&&apex<1.39);return p;
  });
  assert.ok(Math.abs(results[0].z-results[2].z)<.03);
});
test('holding jump does not bounce and pressing in midair does not double jump',()=>{
  const p=walker();stepPlayer(p,{jump:true},1/60,[]);
  stepPlayer(p,{jump:false},1/60,[]);const vy=p.vy;
  stepPlayer(p,{jump:true},1/60,[]);assert.ok(p.vy<vy);
  assert.match(collectBicycle(p),/Land/);assert.match(toggleTravelMode(p,[]),/Land/);
  for(let i=0;i<180;i++)stepPlayer(p,{jump:true},1/60,[]);
  assert.equal(p.y,0);assert.equal(p.grounded,true);
});
test('walking slides along walls without tunneling even during a jump',()=>{
  const p=walker();p.yaw=Math.PI/4;
  const walls=[{minX:1,maxX:1.1,minZ:60,maxZ:110}];
  for(let i=0;i<60;i++)stepPlayer(p,{forward:1,sprint:true,jump:i===5},.1,walls);
  assert.ok(p.x<=.65);assert.ok(p.z<85);assert.ok(canOccupy(p.x,p.z,walls,.35));
});
