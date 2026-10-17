import test from 'node:test';
import assert from 'node:assert/strict';
import {movementInput} from '../src/movement-input.js';
import {createPlayer,stepPlayer} from '../src/movement.js';
test('either Shift key runs forward without W and releasing stops',()=>{
  for(const shift of ['ShiftLeft','ShiftRight']){
    const p={...createPlayer(),mode:'walking',x:0,z:100,yaw:0};
    for(let i=0;i<120;i++)stepPlayer(p,movementInput(new Set([shift]),p.mode),1/60,[]);
    assert.ok(p.speed>4.7);assert.ok(p.z<92);
    for(let i=0;i<60;i++)stepPlayer(p,movementInput(new Set(),p.mode),1/60,[]);
    assert.equal(p.speed,0);
  }
});
test('Shift respects backward movement, steering and bicycle controls',()=>{
  assert.equal(movementInput(new Set(['ShiftLeft','KeyS']),'walking').forward,-1);
  const turning=movementInput(new Set(['ShiftRight','KeyD']),'walking');
  assert.equal(turning.forward,1);assert.equal(turning.right,1);
  assert.equal(movementInput(new Set(['ShiftLeft']),'cycling').forward,0);
  assert.equal(movementInput(new Set(['ShiftLeft','KeyW']),'cycling').forward,1);
});
