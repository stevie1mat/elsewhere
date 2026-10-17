import test from 'node:test';
import assert from 'node:assert/strict';
import {createEndlessRunner,endlessPlayerPose,jumpRunner,moveLane,stepEndless} from '../src/endless-runner.js';

const empty=()=>{const state=createEndlessRunner(()=>.5);state.items=[];state.nextSpawn=Infinity;return state;};

test('endless runner accelerates, scores, and wraps its visual track forever',()=>{
  const state=empty();
  for(let i=0;i<12000;i++)stepEndless(state,1/60);
  assert.ok(state.distance>2000);assert.equal(state.speed,22);assert.ok(state.score>10000);
  const pose=endlessPlayerPose(state);assert.ok(pose.z<=168&&pose.z>=-218);
});

test('lane changes clamp and ease between three lanes',()=>{
  const state=empty();assert.ok(moveLane(state,-1));assert.equal(state.lane,0);assert.equal(moveLane(state,-1),false);
  for(let i=0;i<60;i++)stepEndless(state,1/60);assert.ok(state.lanePosition<.01);
  moveLane(state,1);moveLane(state,1);assert.equal(state.lane,2);
});

test('jump clears barriers while grounded collisions consume lives',()=>{
  const hit=empty();hit.items=[{id:'b',type:'barrier',lane:1,distance:.1,hit:false}];stepEndless(hit,.02);assert.equal(hit.lives,2);
  const clear=empty();clear.items=[{id:'b',type:'barrier',lane:1,distance:2,hit:false}];jumpRunner(clear);
  for(let i=0;i<12;i++)stepEndless(clear,1/60);assert.ok(clear.jump>.72);clear.items[0].distance=clear.distance+.1;stepEndless(clear,.01);assert.equal(clear.lives,3);
});

test('coins are collected once and add to the score',()=>{
  const state=empty();state.items=[{id:'c',type:'coin',lane:1,distance:.1,hit:false}];stepEndless(state,.02);
  assert.equal(state.coins,1);const score=state.score;stepEndless(state,.02);assert.equal(state.coins,1);assert.ok(state.score>=score);
});
