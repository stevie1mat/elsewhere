import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {World} from '../src/world.js';
test('Porto camera uses a twelve-triangle building shell with correct wall hits',()=>{
  const world={location:'porto',cameraColliders:[],m:{},box(){},obstacle(){},cylinder(){}};
  World.prototype.building.call(world,0,0,20,20,14,{});
  assert.equal(world.cameraColliders.length,1);
  const proxy=world.cameraColliders[0];assert.equal(proxy.geometry.index.count/3,12);
  const ray=new T.Raycaster(new T.Vector3(15,2,0),new T.Vector3(-1,0,0),0,8);
  assert.equal(ray.intersectObjects(world.cameraColliders)[0].distance,4.75);
  ray.set(new T.Vector3(15,20,0),new T.Vector3(-1,0,0));
  assert.equal(ray.intersectObjects(world.cameraColliders).length,0);
});
