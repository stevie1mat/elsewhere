import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import { World } from '../src/world.js';
import { flowerPlanterGeometry } from '../src/flower-planter.js';

test('detailed planters batch cleanly with finite geometry and retain their collision footprint',()=>{
 const w=Object.create(World.prototype);
 Object.assign(w,{scene:new T.Scene(),batches:new Map(),cameraColliders:[],obstacles:[],m:{}});
 w.planter(28,31);w.planter(28,58);w.bake();
 assert.equal(w.scene.children.length,5,'all planters share five material batches');
 assert.equal(w.obstacles.length,2);
 assert.ok(Math.abs(w.obstacles[0].maxX-w.obstacles[0].minX-1.15)<1e-8);
 for(const mesh of w.scene.children){
   for(const attribute of Object.values(mesh.geometry.attributes))assert.ok(attribute.array.every(Number.isFinite));
   assert.equal(mesh.geometry.attributes.color.count,mesh.geometry.attributes.position.count);
   assert.ok(mesh.castShadow&&mesh.receiveShadow);
 }
 const parts=flowerPlanterGeometry(42);
 parts.pot.computeBoundingBox();parts.leaves.computeBoundingBox();
 assert.ok(parts.pot.boundingBox.max.y<.8);
 assert.ok(parts.leaves.boundingBox.max.y>1.5&&parts.leaves.boundingBox.max.y<2);
 assert.ok(Object.values(parts).reduce((sum,g)=>sum+g.index.count/3,0)<30000);
 Object.values(parts).forEach(g=>g.dispose());
});
