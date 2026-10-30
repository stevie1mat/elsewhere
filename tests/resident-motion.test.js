import test from 'node:test';
import assert from 'node:assert/strict';
import {ResidentMotion} from '../src/resident-motion.js';
import {Locomotion} from '../src/locomotion.js';
const pose={x:0,y:0,z:0,yaw:0,walked:0,speed:1.65,mode:'walking',grounded:true};
test('400ms server updates produce small frame steps that advance the walk gait',()=>{
  const motion=new ResidentMotion(pose,0),gait=new Locomotion();gait.update(pose,1/60);
  let previous=pose,advancedFrames=0;
  for(let frame=1;frame<=180;frame++){
    const now=frame*1000/60;
    if(frame%24===0){const distance=now/1000*1.65;motion.receive({...pose,x:distance,walked:distance},now);}
    const p=motion.sample(now),phase=gait.phase;gait.update(p,1/60);
    assert.ok(Math.abs(p.x-previous.x)<.04,'body must not jump between server snapshots');
    if(p.walked>previous.walked){assert.notEqual(gait.phase,phase);advancedFrames++;}
    previous=p;
  }
  assert.ok(advancedFrames>140);
  assert.ok(previous.x>3.8);
});
test('heading interpolates across the short angle and reconnect corrections do not become strides',()=>{
  const motion=new ResidentMotion({...pose,yaw:Math.PI-.1},0);
  motion.receive({...pose,x:.66,walked:.66,yaw:-Math.PI+.1},0);
  assert.ok(Math.abs(Math.abs(motion.sample(200).yaw)-Math.PI)<.001);
  motion.receive({...pose,x:100,walked:100},400);
  assert.equal(motion.sample(400).x,100);
});
test('the actual traveler rig bends its legs during interpolated autonomous walking',async()=>{
  const {readFile}=await import('node:fs/promises');
  const {GLTFLoader}=await import('three/addons/loaders/GLTFLoader.js');
  const {Explorer}=await import('../src/explorer.js');
  const data=await readFile(new URL('../public/assets/people/traveler-man.glb',import.meta.url));
  const model=await new GLTFLoader().parseAsync(data.buffer.slice(data.byteOffset,data.byteOffset+data.byteLength),'');
  const explorer=new Explorer(model.scene,model.animations[0]);
  const motion=new ResidentMotion(pose,0),leg=explorer.walker.getObjectByName('Bip01_L_Calf');
  explorer.update(pose,1/60);let previous=leg.quaternion.clone(),changed=0;
  for(let frame=1;frame<=120;frame++){
    const now=frame*1000/60;
    if(frame%24===0){const d=now/1000*1.65;motion.receive({...pose,x:d,walked:d},now);}
    explorer.update(motion.sample(now),1/60);
    if(leg.quaternion.angleTo(previous)>.0001)changed++;
    previous.copy(leg.quaternion);
  }
  assert.ok(changed>75,`expected continuous leg animation, got ${changed} moving frames`);
});
