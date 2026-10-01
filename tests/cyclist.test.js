import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import * as T from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { Cyclist } from '../src/cyclist.js';

test('the actual traveler rig pedals continuously with hands on the handlebars', async () => {
  const data=await readFile(new URL('../public/assets/people/traveler-man.glb',import.meta.url));
  const gltf=await new GLTFLoader().parseAsync(data.buffer.slice(data.byteOffset,data.byteOffset+data.byteLength),'');
  const originalHip=gltf.scene.getObjectByName('Bip01').position.clone();
  const cyclist=new Cyclist(gltf.scene);
  const player={x:47,z:66,yaw:.4,walked:0};
  cyclist.update(player);
  cyclist.group.updateMatrixWorld(true);
  const torso=cyclist.bones.Bip01_Neck.getWorldPosition(new T.Vector3()).sub(cyclist.bones.Bip01_Spine.getWorldPosition(new T.Vector3()));
  assert.ok(torso.angleTo(new T.Vector3(0,1,0))<Math.PI/9,'rider sits within 20 degrees of upright');
  const initial=cyclist.group.position.clone();
  cyclist.update(player);
  assert.ok(initial.distanceTo(cyclist.group.position)<1e-9,'paused cyclist stays put');
  for(let frame=0;frame<2400;frame++){
    player.walked+=.14;player.yaw+=.01;
    cyclist.update(player);cyclist.group.updateMatrixWorld(true);
    assert.equal(cyclist.group.position.x,player.x);
    assert.equal(cyclist.group.position.z,player.z);
    assert.equal(cyclist.group.rotation.y,Math.PI-player.yaw);
    for(const [i,key,side] of [[0,'L',1],[1,'R',-1]]){
      const local=name=>cyclist.group.worldToLocal(cyclist.bones[name].getWorldPosition(new T.Vector3()));
      assert.ok(local(`Bip01_${key}_Hand`).distanceTo(new T.Vector3(side*.27,1.33,.18))<.01,'hand stays on grip');
      const ankleTarget=cyclist.pedals[i].position.clone().add(new T.Vector3(0,.1,-.08));
      assert.ok(local(`Bip01_${key}_Foot`).distanceTo(ankleTarget)<.035,'foot follows pedal');
    }
  }
  assert.ok(gltf.scene.getObjectByName('Bip01').position.equals(originalHip),'source rig is unchanged');
});
