import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {Explorer} from '../src/explorer.js';
import {createResident,applyResidentDecision,stepResident} from '../server/resident.js';
import {ensureMind} from '../server/resident-mind.js';
import {validateObjects,perceivedObjects} from '../server/object-perception.js';
import {buildFirstHome} from '../src/welcome-world.js';
const bed={id:'bed',name:'Home bed',type:'bed',x:16,y:.67,z:-85.1,yaw:0,approach:{x:19,z:-85},affordances:['lie_down']};
const seat={id:'seat',name:'Bench',type:'bench',x:40,y:.59,z:10,yaw:0,approach:{x:40,z:8.7},affordances:['sit']};
const person=()=>{const s=createResident();s.obstacles=[];s.objects=[bed,seat];s.arrival.phase='landed';s.ai={enabled:true,connected:true};s.player.x=40;s.player.z=7;ensureMind(s);return s;};
const advance=(s,seconds)=>{for(let i=0;i<seconds*10;i++)stepResident(s,.1,i*100);};
test('Yuka perception filters behind, distant and occluded objects; registry validates inputs',()=>{
 const s=person();s.player.yaw=Math.PI;assert.deepEqual(perceivedObjects(s).map(o=>o.id),['seat']);
 s.player.yaw=0;assert.equal(perceivedObjects(s).length,0);s.player.yaw=Math.PI;
 s.obstacles=[{minX:39,maxX:41,minZ:7.8,maxZ:8.3}];assert.equal(perceivedObjects(s).length,0);
 assert.equal(validateObjects([bed,seat]),true);assert.equal(validateObjects([bed,bed]),false);assert.equal(validateObjects([{...seat,approach:{x:Infinity,z:0}}]),false);
});
test('model-selected bench interaction pauses, finishes, persists a reusable skill and stands safely',()=>{
 const s=person();assert.equal(applyResidentDecision(s,{action:'interact',objectId:'seat',verb:'sit',seconds:15,intention:'Sit on this bench.'},0).started,true);
 advance(s,3);assert.equal(s.player.interactionPose.kind,'sit');const remaining=s.rest;s.paused=true;advance(s,20);assert.equal(s.rest,remaining);assert.equal(s.skills,undefined);
 s.paused=false;advance(s,20);assert.equal(s.player.interactionPose,undefined);assert.ok(s.player.z<10);assert.equal(s.skills['bench:sit'].successes,1);assert.equal(s.learning.totalOutcomes,1);
 const restored=JSON.parse(JSON.stringify(s));assert.equal(restored.skills['bench:sit'].successes,1);
});
test('sleep routes through the actual home doorway to the usable bed and recovers energy',()=>{
 const s=person();const noop=()=>{};buildFirstHome({interactionObjects:[],cameraColliders:[],m:{},box:noop,obstacle:(x,z,a,b)=>s.obstacles.push({minX:x-a/2,maxX:x+a/2,minZ:z-b/2,maxZ:z+b/2}),mesh:noop,sign:noop,scene:{add:noop}});
 s.player.x=25;s.player.z=-83;s.needs.energy=10;
 const result=applyResidentDecision(s,{action:'sleep',seconds:30,intention:'Sleep at home.'},0);assert.equal(result.started,true);advance(s,15);assert.equal(s.player.interactionPose?.kind,'lie_down');advance(s,35);assert.equal(s.player.interactionPose,undefined);assert.ok(s.needs.energy>25);assert.equal(s.skills['bed:lie_down'].successes,1);
});
test('unsupported affordances preserve ongoing action; interruption is not a learned success',()=>{
 const s=person();applyResidentDecision(s,{action:'interact',objectId:'seat',verb:'sit',seconds:60,intention:'Sit'},0);advance(s,3);
 assert.ok(applyResidentDecision(s,{action:'interact',objectId:'seat',verb:'lie_down'},1000).error);assert.equal(s.player.interactionPose.kind,'sit');
 assert.match(applyResidentDecision(s,{action:'eat',destination:'cafe',seconds:30,intention:'Eat'},1500).error,/No usable food/);assert.equal(s.player.interactionPose.kind,'sit');
 applyResidentDecision(s,{action:'observe',destination:'garden',seconds:15,intention:'Observe'},2000);assert.equal(s.player.interactionPose,undefined);assert.equal(s.skills['bench:sit'].successes,0);assert.equal(s.skills['bench:sit'].interruptions,1);
});
test('real rig seats hips at seat height and lies horizontally, restoring standing pose afterwards',async()=>{
 const data=await readFile(new URL('../public/assets/people/traveler-man.glb',import.meta.url));const gltf=await new GLTFLoader().parseAsync(data.buffer.slice(data.byteOffset,data.byteOffset+data.byteLength),'');
 const e=new Explorer(gltf.scene,gltf.animations[0]);const s=person(),p={...s.player,speed:0,mode:'walking',interactionPose:{kind:'sit',...seat}};
 e.update(p,0);const pos=name=>e.walker.getObjectByName(name).getWorldPosition(new T.Vector3());assert.ok(Math.abs(pos('Bip01_Pelvis').y-(seat.y+.1))<.02);assert.ok(pos('Bip01_L_Foot').y<.2);
 p.interactionPose={kind:'lie_down',...bed};e.update(p,0);const head=pos('Bip01_Head'),foot=pos('Bip01_L_Foot');assert.ok(Math.abs(head.y-foot.y)<.35);assert.ok(head.z<foot.z-1);
 delete p.interactionPose;e.update(p,0);assert.ok(pos('Bip01_Head').y-pos('Bip01_L_Foot').y>1);
});
