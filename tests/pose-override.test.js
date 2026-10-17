import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {PoseOverride} from '../src/pose-override.js';
test('landing restores arms and fingers even when animation time is unchanged',()=>{
  const root=new T.Group(),arm=new T.Bone(),finger=new T.Bone();arm.name='arm';root.add(arm);arm.add(finger);
  const clip=new T.AnimationClip('walk',1,[new T.QuaternionKeyframeTrack('arm.quaternion',[0,1],[0,0,0,1,0,0,0,1])]);
  const mixer=new T.AnimationMixer(root);mixer.clipAction(clip).play();mixer.setTime(0);
  const pose=new PoseOverride(root),expected=arm.quaternion.clone();
  for(let i=0;i<20;i++){
    pose.restore();mixer.setTime(0);assert.ok(arm.quaternion.equals(expected));assert.equal(Math.abs(finger.rotation.z),0);
    pose.capture();arm.rotation.z=2.5;finger.rotation.z=.65;
  }
  pose.restore();mixer.setTime(0);assert.ok(arm.quaternion.equals(expected));assert.equal(Math.abs(finger.rotation.z),0);
  pose.restore();assert.ok(arm.quaternion.equals(expected));
});
