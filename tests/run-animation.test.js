import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {readFileSync} from 'node:fs';
import data from '../public/assets/people/run-neutral.json' with {type:'json'};
test('authored run binds to traveler rig, loops, and preserves airborne hip motion',()=>{
  const b=readFileSync(new URL('../public/assets/people/traveler-man.glb',import.meta.url));
  const doc=JSON.parse(b.subarray(20,20+b.readUInt32LE(12)));
  const nodes=doc.nodes.map(n=>{const b=new T.Bone();b.name=n.name||'';if(n.translation)b.position.fromArray(n.translation);if(n.rotation)b.quaternion.fromArray(n.rotation);if(n.scale)b.scale.fromArray(n.scale);return b;});
  doc.nodes.forEach((n,i)=>n.children?.forEach(c=>nodes[i].add(nodes[c])));
  const model=new T.Group();doc.scenes[0].nodes.forEach(i=>model.add(nodes[i]));
  const clip=T.AnimationClip.parse(data),mixer=new T.AnimationMixer(model);mixer.clipAction(clip).play();
  for(const track of clip.tracks){
    assert.ok(model.getObjectByName(track.name.split('.')[0]),track.name);
    const size=track.getValueSize();
    for(let i=0;i<size;i++)assert.ok(Math.abs(track.values[i]-track.values[track.values.length-size+i])<.002,'seamless loop');
  }
  let min=Infinity,max=0;
  for(let i=0;i<100;i++){
    mixer.setTime(clip.duration*i/100);model.updateMatrixWorld(true);
    const feet=['L','R'].flatMap(s=>['Foot','Toe0'].map(part=>model.getObjectByName(`Bip01_${s}_${part}`).getWorldPosition(new T.Vector3()).y));
    min=Math.min(min,...feet);max=Math.max(max,Math.min(...feet));
    const hip=model.getObjectByName('Bip01').position;assert.equal(hip.x,0);assert.equal(hip.z,0);
  }
  assert.ok(min>0&&min<15,`foot range ${min}..${max}`);assert.ok(max-min>5,'both feet leave the ground');
});
