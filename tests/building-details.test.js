import test from 'node:test';
import assert from 'node:assert/strict';
import {pitchedRoof,buildingDetails} from '../src/building-details.js';
import {World} from '../src/world.js';
import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
test('roof merges with indexed building batches and creates a renderable mesh',()=>{
  const roof=pitchedRoof(22,21,3),box=new T.BoxGeometry(22,.15,21);
  const merged=mergeGeometries([box,roof],false);assert.ok(merged);
  assert.doesNotThrow(()=>new T.Mesh(merged,new T.MeshStandardMaterial()));
  merged.dispose();roof.dispose();box.dispose();
});
test('pitched roof uses six triangles and faces upward',()=>{
  const roof=pitchedRoof(20,24,3);assert.equal(roof.attributes.position.count/3,6);
  roof.computeBoundingBox();assert.equal(roof.boundingBox.max.y,3);
  for(let i=0;i<12;i++)assert.ok(roof.attributes.normal.getY(i)>0);
  roof.dispose();
});
test('building upgrade reuses existing materials and stays within a small triangle budget',()=>{
  for(const x of [0,1,2]){
    const materials={trim:{},tile:{},cream:{}};let triangles=0;
    const world={m:materials,box(...args){assert.ok(Object.values(materials).includes(args[6]));triangles+=12;},mesh(g,m){assert.equal(m,materials.tile);triangles+=g.attributes.position.count/3;g.dispose();}};
    buildingDetails(world,x,0,22,21,14);
    assert.ok(triangles<=100,`detail budget: ${triangles}`);
  }
});
test('representative building stays below 3400 triangles without extra collider geometry',()=>{
  let triangles=0;
  const w={location:'porto',cameraColliders:[],m:{},box(){triangles+=12;},obstacle(){},cylinder(a,b,c,d,e,f,g,segments=10){triangles+=segments*4;},mesh(g){triangles+=g.attributes.position.count/3;g.dispose();}};
  World.prototype.building.call(w,1,0,22,21,14,{});
  assert.ok(triangles<3400,`${triangles} triangles`);assert.equal(w.cameraColliders.length,1);
});
