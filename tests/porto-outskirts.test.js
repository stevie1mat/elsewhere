import test from 'node:test';
import assert from 'node:assert/strict';
import {PORTO_BOUNDS,onLand,LANDMARKS} from '../server/shared/movement.js';
import {OUTSKIRT_ROADS} from '../src/porto-outskirts.js';
test('expanded island supports new districts on shared server/client land',()=>{
  const area=(PORTO_BOUNDS.maxX-PORTO_BOUNDS.minX)*(PORTO_BOUNDS.maxZ-PORTO_BOUNDS.minZ);
  assert.ok(area/(303*458)>2.9);
  for(const id of ['olives','village','coast']){const landmark=LANDMARKS.find(p=>p.id===id);assert.ok(onLand(landmark.x,landmark.z));}
  for(const road of OUTSKIRT_ROADS)assert.ok(onLand(road.x,road.z));
  assert.ok(!onLand(-490,0));assert.ok(!onLand(0,370));
});
