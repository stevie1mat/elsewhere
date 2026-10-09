import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import { World } from '../src/world.js';
import { detailedCarGeometry } from '../src/detailed-car.js';

test('detailed cars bake with finite surfaces and rotation-aware collision clearance',()=>{
 const parts=detailedCarGeometry();
 const bounds=new T.Box3();let triangles=0;
 for(const geometry of Object.values(parts)){
   geometry.computeBoundingBox();bounds.union(geometry.boundingBox);triangles+=geometry.index.count/3;
   for(const attribute of Object.values(geometry.attributes))assert.ok(attribute.array.every(Number.isFinite));
 }
 assert.ok(bounds.min.y>=0&&bounds.max.y<1.45);
 assert.ok(bounds.max.x-bounds.min.x<2.3&&bounds.max.z-bounds.min.z<4.4);
 assert.ok(triangles<50000);
 const w=Object.create(World.prototype);
 Object.assign(w,{scene:new T.Scene(),batches:new Map(),cameraColliders:[],obstacles:[],m:{}});
 w.car(0,0,0xd9b889);w.car(8,8,0x849ba8,Math.PI/2);w.car(-8,-8,0x849ba8,Math.PI);
 assert.ok([...w.batches.keys()].some(m=>m.isMeshPhysicalMaterial&&m.clearcoat===1),'reflective clearcoat is used');
 w.bake();assert.ok(w.scene.children.every(m=>m.geometry&&m.castShadow));
 assert.ok(Math.abs(w.obstacles[0].maxX-w.obstacles[0].minX-2.2)<1e-8);
 assert.ok(Math.abs(w.obstacles[1].maxX-w.obstacles[1].minX-4.4)<1e-8);
 assert.ok(Math.abs(w.obstacles[2].maxX-w.obstacles[2].minX-2.2)<1e-8);
 Object.values(parts).forEach(g=>g.dispose());
});
