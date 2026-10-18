import test from 'node:test';
import assert from 'node:assert/strict';
import {createAdventure,advanceAdventure,adventureUpgrades} from '../src/adventure.js';
import {createRide,stepRide,Skyway,rideRegion,rideDifficulty} from '../src/skyway.js';
import * as T from 'three';
test('city objectives award persistent upgrades once and never regress',()=>{
  const a=createAdventure(null);
  assert.equal(advanceAdventure(a,{places:3,coins:25,delivery:3}).length,3);
  assert.deepEqual(adventureUpgrades(a),{handling:true,shield:true,hearts:4,bonus:1});
  assert.equal(advanceAdventure(a,{places:0,coins:0}).length,0);
  assert.deepEqual(createAdventure(JSON.parse(JSON.stringify(a))),a);
  assert.equal(advanceAdventure(a,{distance:6000,places:10}).length,3);
  assert.equal(adventureUpgrades(a).bonus,2);
});
test('checkpoint restores one heart, gives shield and awards bonus only once',()=>{
  const s=createRide(()=>.5,{hearts:4,bonus:2});s.next=Infinity;s.distance=749.9;s.speed=12;s.lives=2;
  stepRide(s,.05);assert.equal(s.checkpoint,1);assert.equal(s.lives,3);assert.ok(s.shield);assert.equal(s.bonusPoints,1000);
  stepRide(s,.05);assert.equal(s.lives,3);assert.equal(s.bonusPoints,1000);
  s.distance=1499.9;stepRide(s,.05);assert.equal(s.lives,4);
});
test('long scenic route has five regions, bounded scenery and over six kilometres',()=>{
  const route=new Skyway(new T.Scene());assert.ok(route.length>6000);
  assert.equal(new Set([.1,.2,.4,.6,.9].map(u=>rideRegion(u*route.length,route.length))).size,5);
  const peaks=route.group.getObjectByName('Highland rock formations');assert.ok(peaks.count>0&&peaks.count<=24);
  assert.equal(route.group.getObjectByName('Route region pennants').count,60);
});
test('upgraded bicycle starts with earned equipment and a failed ride earns no checkpoint',()=>{
  const s=createRide(()=>.5,{shield:true,handling:true,hearts:4});assert.equal(s.lives,4);assert.ok(s.shield&&s.handling);
  s.running=false;s.distance=751;stepRide(s,.05);assert.equal(s.checkpoint,0);
});
test('checkpoints increase cruise speed and obstacle density gradually, with a safe cap',()=>{
  for(let i=1;i<=7;i++){
    const before=rideDifficulty(i-1),after=rideDifficulty(i);
    assert.equal(after.speed,before.speed+2);assert.ok(after.spacing<before.spacing);
    assert.ok(after.doubleBarrierChance>=before.doubleBarrierChance);
    assert.ok(after.spacing/after.speed>1.2,'enough time to react at maximum speed');
  }
  assert.deepEqual(rideDifficulty(100),rideDifficulty(7));
  const s=createRide();s.next=Infinity;s.distance=749.9;s.speed=12;
  stepRide(s,.05);assert.equal(s.checkpoint,1);assert.equal(s.speed,12);
  stepRide(s,.05);assert.ok(s.speed>12&&s.speed<14,'acceleration is smooth, not an instant jump');
  for(let i=0;i<30;i++)stepRide(s,.05);assert.equal(s.speed,14);
  stepRide(s,.05,{brake:true});assert.ok(s.speed<14);
});
test('rounded entrance is open through its center and has no box lintel',()=>{
  const route=new Skyway(new T.Scene()),arches=route.group.getObjectByName('Open rounded Skyway arches');
  assert.equal(arches.geometry.type,'TorusGeometry');assert.equal(arches.geometry.parameters.arc,Math.PI);
  assert.equal(arches.count,9);assert.equal(route.group.getObjectByName('Skyway arch feet').count,18);
  const position=arches.geometry.attributes.position;
  for(let i=0;i<position.count;i++)assert.ok(Math.hypot(position.getX(i),position.getY(i))>5.2,'open riding clearance inside arch');
});
