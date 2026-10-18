import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {createShopBicycles,SHOP_BIKES} from '../src/cycle-shop.js';
import {Cyclist} from '../src/cyclist.js';
import {CHALLENGE_BIKE} from '../src/movement.js';
test('challenge display uses coral paint, one detailed bicycle and ground-level placement',()=>{
  const display=createShopBicycles([CHALLENGE_BIKE],CHALLENGE_BIKE.color);
  assert.ok(display.children.some(m=>m.material.color.getHex()===CHALLENGE_BIKE.color));
  for(const mesh of display.children){assert.equal(mesh.count,1);const matrix=new T.Matrix4();mesh.getMatrixAt(0,matrix);assert.equal(matrix.elements[12],CHALLENGE_BIKE.x);assert.ok(Math.abs(matrix.elements[13]-.015)<1e-6);assert.equal(matrix.elements[14],CHALLENGE_BIKE.z);}
});
test('shop shares the detailed bicycle geometry and instances both displays',()=>{
  const original=new Cyclist().group;let originalTriangles=0;
  original.traverse(o=>{if(o.isMesh)originalTriangles+=(o.geometry.index?.count||o.geometry.attributes.position.count)/3;});
  const shop=createShopBicycles();let displayTriangles=0;
  shop.traverse(o=>{assert.ok(!o.isSkinnedMesh);if(o.isMesh){assert.ok(o.isInstancedMesh);assert.equal(o.count,2);displayTriangles+=(o.geometry.index?.count||o.geometry.attributes.position.count)/3;const matrix=new T.Matrix4();o.getMatrixAt(0,matrix);assert.equal(matrix.elements[12],SHOP_BIKES[0].x);}});
  assert.equal(displayTriangles,originalTriangles);assert.ok(shop.children.length<16);
});
