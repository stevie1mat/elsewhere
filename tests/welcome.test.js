import test from 'node:test';
import assert from 'node:assert/strict';
import {createWelcome,meetGuide,stepWelcome,welcomeAction,homeRoute,FIRST_HOME} from '../src/welcome.js';
import {canOccupy,SPAWN,shorelineX} from '../src/movement.js';
import {createArrival,arrivalPose,JOURNEY_SECONDS} from '../src/arrival.js';

test('countdown begins over open water and approaches the arrival point continuously',()=>{
  const a=createArrival(SPAWN),start=arrivalPose(a,SPAWN);assert.ok(start.x>shorelineX(start.z)+100);
  let previous=start.x;
  for(let i=1;i<=100;i++){a.elapsed=JOURNEY_SECONDS*i/100;const p=arrivalPose(a,SPAWN);assert.ok(p.x<=previous);previous=p.x;}
  assert.equal(previous,SPAWN.x);assert.equal(arrivalPose(a,SPAWN).z,SPAWN.z);
});
test('guide routes around walls, waits for the player and requires storing the suitcase at home',()=>{
  const obstacles=[{minX:22,maxX:24,minZ:-90,maxZ:-70}],p={x:28,z:-83,mode:'walking'},s=createWelcome();
  meetGuide(s,p,obstacles);assert.ok(s.guide);assert.equal(welcomeAction(s,{...p,x:100},obstacles),false);
  Object.assign(p,s.guide);assert.equal(welcomeAction(s,p,obstacles),true);assert.equal(s.phase,'leading');
  for(const point of s.route)assert.ok(canOccupy(point.x,point.z,obstacles,.6));
  const before={...s.guide};stepWelcome(s,{...p,x:200},.05);assert.deepEqual(s.guide,before);
  assert.equal(welcomeAction(s,{...FIRST_HOME,mode:'walking'},obstacles),false);
  for(let i=0;i<2000&&s.phase==='leading';i++){Object.assign(p,s.guide);stepWelcome(s,p,.05);}
  assert.equal(s.phase,'doorstep');Object.assign(p,FIRST_HOME);assert.equal(welcomeAction(s,p,obstacles),true);assert.equal(s.phase,'settled');
  assert.equal(createWelcome({version:1,settled:true}).phase,'settled');assert.equal(createWelcome({settled:true}).phase,'waiting');
});
