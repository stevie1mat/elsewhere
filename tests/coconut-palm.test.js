import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import { coconutPalmGeometry } from '../src/coconut-palm.js';
import { World } from '../src/world.js';

test('coconut palms have finite detailed geometry and bake into shared material batches', () => {
  const world = Object.create(World.prototype);
  Object.assign(world, { scene: new T.Scene(), batches: new Map(), cameraColliders: [], obstacles: [], m: {} });
  world.palm(40, 0, 7);
  world.palm(40, 19, 8);
  assert.equal(world.batches.size, 4, 'trees share four materials');
  world.bake();
  assert.equal(world.scene.children.length, 4);
  for (const mesh of world.scene.children) {
    const g = mesh.geometry;
    assert.ok(g.index.count > 0);
    assert.equal(g.attributes.color.count, g.attributes.position.count);
    for (const attr of Object.values(g.attributes)) assert.ok(attr.array.every(Number.isFinite));
    assert.ok(mesh.castShadow && mesh.receiveShadow);
    g.dispose(); mesh.material.dispose();
  }
  assert.equal(world.obstacles.length, 2, 'trunk collision remains present');
  const palm = coconutPalmGeometry(7, 427);
  palm.foliage.computeBoundingBox();
  const size = palm.foliage.boundingBox.getSize(new T.Vector3());
  assert.ok(size.x > 5 && size.z > 5 && size.y > 2, 'crown spreads and droops in three dimensions');
  const triangles = Object.values(palm).reduce((sum, g) => sum + g.index.count / 3, 0);
  assert.ok(triangles < 45000, 'individual leaflets stay within the per-tree geometry budget');
  Object.values(palm).forEach(g => g.dispose());
});
