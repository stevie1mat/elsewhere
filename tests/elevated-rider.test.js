import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {readFileSync} from 'node:fs';
import {Explorer} from '../src/explorer.js';
test('previous-frame bridge height cannot distort the bicycle IK pose',()=>{
 const bytes=readFileSync(new URL('../public/assets/people/traveler-man.glb',import.meta.url));const doc=JSON.parse(bytes.subarray(20,20+bytes.readUInt32LE(12)));
 const nodes=doc.nodes.map(n=>{const b=new T.Bone();b.name=n.name||'';if(n.translation)b.position.fromArray(n.translation);if(n.rotation)b.quaternion.fromArray(n.rotation);if(n.scale)b.scale.fromArray(n.scale);return b;});
 doc.nodes.forEach((n,i)=>n.children?.forEach(c=>nodes[i].add(nodes[c])));const root=new T.Group();doc.scenes[0].nodes.forEach(i=>root.add(nodes[i]));
 const rider=new Explorer(root),p={mode:'cycling',speed:12,walked:3,x:0,z:0,yaw:0};rider.update(p,0);
 const bones=['Bip01_L_Hand','Bip01_R_Hand','Bip01_L_Foot','Bip01_R_Foot'];
 const expected=bones.map(n=>rider.cycle.bones[n].getWorldPosition(new T.Vector3()));
 rider.group.position.y=130;rider.group.updateMatrixWorld(true);rider.update(p,0);rider.group.updateMatrixWorld(true);
 bones.forEach((n,i)=>assert.ok(rider.cycle.bones[n].getWorldPosition(new T.Vector3()).distanceTo(expected[i])<.001,n));
 const swimmer={...p,mode:'walking',swimming:true,x:90,y:-2.2,z:60,speed:1.6,grounded:false};
 for(let i=0;i<120;i++)rider.update(swimmer,1/60);
 rider.group.updateMatrixWorld(true);
 assert.ok(rider.walker.rotation.x>.5);assert.equal(rider.cycle.group.visible,false);
 for(const name of bones){const point=rider.walker.getObjectByName(name).getWorldPosition(new T.Vector3());assert.ok(Number.isFinite(point.x)&&point.distanceTo(new T.Vector3(swimmer.x,swimmer.y,swimmer.z))<3,'swimming limbs remain attached');}
 rider.update({...swimmer,swimming:false,y:0,grounded:true,speed:0},1/60);assert.equal(rider.walker.rotation.x,0);
});
