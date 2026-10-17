import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {createShopBicycles,SHOP_BIKES} from '../src/cycle-shop.js';
import {Cyclist} from '../src/cyclist.js';
test('shop shares the detailed bicycle geometry and instances both displays',()=>{
  const original=new Cyclist().group;let originalTriangles=0;
  original.traverse(o=>{if(o.isMesh)originalTriangles+=(o.geometry.index?.count||o.geometry.attributes.position.count)/3;});
  const shop=createShopBicycles();let displayTriangles=0;
  shop.traverse(o=>{assert.ok(!o.isSkinnedMesh);if(o.isMesh){assert.ok(o.isInstancedMesh);assert.equal(o.count,2);displayTriangles+=(o.geometry.index?.count||o.geometry.attributes.position.count)/3;const matrix=new T.Matrix4();o.getMatrixAt(0,matrix);assert.equal(matrix.elements[12],SHOP_BIKES[0].x);}});
  assert.equal(displayTriangles,originalTriangles);assert.ok(shop.children.length<16);
});
