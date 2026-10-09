import test from 'node:test';
import assert from 'node:assert/strict';
import { onLand,URBAN_BOUNDS,validateSavedPosition } from '../src/movement.js';
import { Rooms } from '../server/rooms.js';

test('new districts support saved positions and co-op while urban boundaries remain unchanged',()=>{
 const rooms=new Rooms(),{room,player}=rooms.join(null,null,{});
 for(const [x,z] of [[48,-200],[-179,103],[34,171],[-218,-232]]){
   const p={x,z,yaw:0,pitch:.25,walked:0,speed:0,mode:'cycling'};
   assert.ok(onLand(x,z));assert.ok(validateSavedPosition(p,[]));
   assert.equal(rooms.position(room,player,p),true);
   assert.equal(onLand(x,z,.95,URBAN_BOUNDS),false);
 }
 for(const [x,z] of [[-240,0],[0,-260],[0,200],[70,80]])assert.equal(onLand(x,z),false);
});
