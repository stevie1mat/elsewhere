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
      const hand=cyclist.bones[`Bip01_${key}_Hand`];
      const palm=cyclist.group.worldToLocal(hand.localToWorld(new T.Vector3(7.5,0,0)));
      assert.ok(palm.distanceTo(new T.Vector3(side*.28,1.347,.185))<.002,'palm stays above grip');
      const knuckle=local(`Bip01_${key}_Finger2`);
      const curled=local(`Bip01_${key}_Finger22`);
      assert.ok(knuckle.y>1.34 && curled.y<1.31,'fingers wrap from above to below the bar');
      assert.ok(Math.abs(curled.z-.185)<.04,'curled fingers stay close to grip');
      const palmDown=new T.Vector3(0,1,0).applyQuaternion(hand.getWorldQuaternion(new T.Quaternion()));
      assert.ok(palmDown.dot(new T.Vector3(0,-1,0))>.999,'palms face down throughout turns');
      const ankleTarget=cyclist.pedals[i].position.clone().add(new T.Vector3(0,.1,-.08));
      assert.ok(local(`Bip01_${key}_Foot`).distanceTo(ankleTarget)<.035,'foot follows pedal');
    }
  }
  assert.ok(gltf.scene.getObjectByName('Bip01').position.equals(originalHip),'source rig is unchanged');
});

test('rider plants a foot at rest and smoothly returns it to the pedal in either direction', async () => {
  const data=await readFile(new URL('../public/assets/people/traveler-man.glb',import.meta.url));
  const gltf=await new GLTFLoader().parseAsync(data.buffer.slice(data.byteOffset,data.byteOffset+data.byteLength),'');
  const cyclist=new Cyclist(gltf.scene);
  const player={x:0,z:0,yaw:Math.PI,walked:0,speed:0};
  const foot=key=>{cyclist.group.updateMatrixWorld(true);return cyclist.group.worldToLocal(cyclist.bones[`Bip01_${key}_Foot`].getWorldPosition(new T.Vector3()));};
  for (const phase of [0,1.5,3,5,8]) {
    player.walked=phase;player.speed=0;cyclist.update(player);
    cyclist.group.updateMatrixWorld(true);
    const pelvis=cyclist.group.worldToLocal(cyclist.bones.Bip01.getWorldPosition(new T.Vector3()));
    assert.ok(Math.abs(pelvis.y-.85)<.002 && Math.abs(pelvis.z+.28)<.002,'stopped rider stays over the saddle');
    assert.ok(foot('L').distanceTo(new T.Vector3(.29,.088,-.26))<.003,'support leg can reach the ground at any crank angle');
    assert.ok(foot('R').distanceTo(cyclist.pedals[1].position.clone().add(new T.Vector3(0,.1,-.08)))<.003,'other foot remains on its pedal');
  }
  let sole=Infinity;
  cyclist.rider.traverse(mesh=>{
    if(!mesh.isSkinnedMesh)return;
    mesh.skeleton.update();
    for(let i=0;i<mesh.geometry.attributes.position.count;i++){
      const p=mesh.localToWorld(mesh.getVertexPosition(i,new T.Vector3()));
      if(p.x>.22 && p.y<.3)sole=Math.min(sole,p.y);
    }
  });
  assert.ok(sole>=-.005 && sole<.015,`planted shoe touches the ground without sinking (${sole})`);
  for (const speed of [3,-2]) {
    player.speed=speed;
    const before=foot('L');
    player.walked+=speed/60;cyclist.update(player,1/60);
    const first=foot('L');
    assert.ok(first.y>before.y && first.distanceTo(before)<.14,'foot lifts gradually on starting');
    for(let i=0;i<90;i++){player.walked+=speed/60;cyclist.update(player,1/60);}
    cyclist.group.updateMatrixWorld(true);
    const seated=cyclist.group.worldToLocal(cyclist.bones.Bip01.getWorldPosition(new T.Vector3()));
    assert.ok(Math.abs(seated.y-.85)<.002 && Math.abs(seated.z+.28)<.002,'starting does not raise or slide the rider off the saddle');
    assert.ok(foot('L').distanceTo(cyclist.pedals[0].position.clone().add(new T.Vector3(0,.1,-.08)))<.003,'raised foot follows its pedal');
    player.speed=0;
    for(let i=0;i<90;i++)cyclist.update(player,1/60);
    assert.ok(foot('L').distanceTo(new T.Vector3(.29,.088,-.26))<.003,'foot returns to ground after braking');
  }
});

test('kicks and punches extend the chosen limb and return to the riding pose', async () => {
  const data=await readFile(new URL('../public/assets/people/traveler-man.glb',import.meta.url));
  const gltf=await new GLTFLoader().parseAsync(data.buffer.slice(data.byteOffset,data.byteOffset+data.byteLength),'');
  const c=new Cyclist(gltf.scene),p={x:0,z:0,yaw:Math.PI,walked:0,speed:3};
  const local=name=>{c.group.updateMatrixWorld(true);return c.group.worldToLocal(c.bones[name].getWorldPosition(new T.Vector3()));};
  c.update(p);const hand=local('Bip01_L_Hand'),foot=local('Bip01_L_Foot'),other=local('Bip01_R_Hand');
  for(const type of ['kick','punch']){
    p.attack={type,side:1,weight:1};c.update(p);
    const striking=local(type==='kick'?'Bip01_L_Foot':'Bip01_L_Hand');
    assert.ok(striking.x>.6,'striking limb extends to the side');
    assert.ok(local('Bip01_R_Hand').distanceTo(other)<.005,'other hand holds the bar');
    p.attack=null;c.update(p);
    assert.ok(local('Bip01_L_Hand').distanceTo(hand)<.005,'hand returns to grip');
    assert.ok(local('Bip01_L_Foot').distanceTo(foot)<.005,'foot returns to pedal');
  }
});
