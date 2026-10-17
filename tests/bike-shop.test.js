import test from 'node:test';
import assert from 'node:assert/strict';
import {createPlayer,collectBicycle,BIKE_SHOP,toggleTravelMode,stepPlayer} from '../src/movement.js';
test('uncollected bicycle cannot be summoned, but walking works',()=>{
  const p={...createPlayer(),mode:'walking',bike:null};
  assert.match(toggleTravelMode(p,[]),/Cycle House/);
  assert.match(collectBicycle(p),/Visit/);
  const z=p.z;stepPlayer(p,{forward:1},.05,[]);assert.notEqual(p.z,z);assert.equal(p.mode,'walking');
});
test('shop collection requires clear space, then supports parking and remounting',()=>{
  const p={...createPlayer(),mode:'walking',bike:null,x:BIKE_SHOP.x,z:BIKE_SHOP.z};
  assert.match(collectBicycle(p,[{minX:28,maxX:30,minZ:-16,maxZ:-14}]),/clear/);
  assert.equal(collectBicycle(p),null);assert.equal(p.mode,'cycling');
  assert.match(collectBicycle(p),/already/);
  assert.equal(toggleTravelMode(p,[]),null);assert.ok(p.bike);assert.equal(p.mode,'walking');
  assert.equal(toggleTravelMode(p,[]),null);assert.equal(p.mode,'cycling');
});
