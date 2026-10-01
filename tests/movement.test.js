import test from 'node:test';
import assert from 'node:assert/strict';
import { createPlayer, stepPlayer, canOccupy, onLand, validateSavedPosition } from '../src/movement.js';

test('cycling accelerates consistently across frame rates and faster pedaling increases speed', () => {
  function run(hz,input){const p=createPlayer();p.x=0;p.z=100;p.yaw=0;for(let i=0;i<hz*3;i++)stepPlayer(p,input,1/hz,[]);return p;}
  const a=run(60,{forward:1}),b=run(120,{forward:1});
  assert.ok(Math.abs(a.walked-b.walked)<.06);
  assert.ok(run(60,{forward:1,sprint:true}).walked>a.walked*1.25);
  const stopped=run(60,{right:1});assert.equal(stopped.x,0);assert.equal(stopped.z,100);assert.equal(stopped.yaw,0);
  const turning=run(60,{forward:1,right:1});assert.ok(turning.yaw>1);assert.ok(turning.x>2);
});
test('bike footprint cannot tunnel through a wall or ride into water',()=>{
  const p=createPlayer();p.x=0;p.z=42;p.yaw=0;
  const obstacles=[{minX:-5,maxX:5,minZ:40,maxZ:40.1}];
  for(let i=0;i<120;i++)stepPlayer(p,{forward:1,sprint:true},.05,obstacles);
  assert.ok(p.z>=41.05);assert.ok(canOccupy(p.x,p.z,obstacles));
  p.x=62;p.z=0;p.yaw=Math.PI/2;
  for(let i=0;i<120;i++)stepPlayer(p,{forward:1,sprint:true},.05,[]);
  assert.ok(p.x<=63.05);
  assert.ok(onLand(85,-36));assert.ok(!onLand(85,0));
});
test('braking stops the bike and reversing turns the wheels backwards',()=>{
  const p=createPlayer();for(let i=0;i<60;i++)stepPlayer(p,{forward:1},1/60,[]);
  assert.ok(p.speed>3);for(let i=0;i<30;i++)stepPlayer(p,{brake:true},1/60,[]);
  assert.equal(p.speed,0);assert.equal(p.y,0);
  const distance=p.walked;for(let i=0;i<60;i++)stepPlayer(p,{forward:-1},1/60,[]);
  assert.ok(p.speed<0);assert.ok(p.walked<distance);
});
test('saved positions respect bicycle clearance and camera elevation',()=>{
  assert.equal(validateSavedPosition({x:NaN,z:0,yaw:0,pitch:0},[]),null);
  assert.equal(validateSavedPosition({x:90,z:0,yaw:0,pitch:0},[]),null);
  assert.equal(validateSavedPosition({x:63.5,z:0,yaw:0,pitch:0},[]),null);
  assert.ok(validateSavedPosition(createPlayer(),[]));
  assert.equal(validateSavedPosition({x:47,z:66,yaw:0,pitch:-1},[]).pitch,.05);
});
