import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {readFile} from 'node:fs/promises';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {Explorer} from '../src/explorer.js';
import {WelcomeWorld} from '../src/welcome-world.js';
import {SuitcasePhysics} from '../src/suitcase-physics.js';
import {groundElevation} from '../src/movement.js';

test('real traveler grips the suitcase while standing, walking, turning and climbing',async()=>{
 const data=await readFile(new URL('../public/assets/people/traveler-man.glb',import.meta.url));
 const gltf=await new GLTFLoader().parseAsync(data.buffer.slice(data.byteOffset,data.byteOffset+data.byteLength),'');
 const explorer=new Explorer(gltf.scene,gltf.animations[0]),scene=new T.Scene(),welcome=new WelcomeWorld(scene);scene.add(explorer.group);
 const p={x:40,z:60,y:0,yaw:0,speed:0,walked:0,mode:'walking',grounded:true};
 for(let i=0;i<180;i++){
  if(i===120)p.x=-350;
  p.speed=i<30?0:2;p.yaw=i/90;p.x+=Math.sin(p.yaw)*p.speed/60;p.z-=Math.cos(p.yaw)*p.speed/60;p.y=groundElevation(p.x,p.z);p.walked+=p.speed/60;
  explorer.update(p,1/60);welcome.update({phase:'leading'},p,true,1/60,explorer,[]);scene.updateMatrixWorld(true);
  const handle=welcome.bag.userData.grip.getWorldPosition(new T.Vector3()),hand=explorer.walker.getObjectByName('Bip01_R_Hand').getWorldPosition(new T.Vector3());
  const palm=hand.clone().add(new T.Vector3(0,-.075,0));
  assert.ok(palm.distanceTo(handle)<.015,`palm/handle gap ${palm.distanceTo(handle)}`);
  assert.ok(welcome.physics.handleLength>.7&&welcome.physics.handleLength<1.25,`handle length ${welcome.physics.handleLength}`);
  assert.ok(Number.isFinite(welcome.bag.position.y));
  for(const x of [-.23,.23])for(const z of [-.135,.135]){
   const corner=new T.Vector3(x,.005,z).applyMatrix4(welcome.bag.matrixWorld);
   assert.ok(corner.y>=groundElevation(corner.x,corner.z)+.04,`case penetrates ground: ${corner.y-groundElevation(corner.x,corner.z)}`);
  }
 }
});
test('rolling response is stable across frame rates and cannot pass through a wall',()=>{
 const run=hz=>{const body=new SuitcasePhysics();for(let i=0;i<hz*2;i++){const p={x:30,z:50-i/hz*2,yaw:0,speed:2};body.update(p,new T.Vector3(30.3,.95,p.z),1/hz,[]);}return body;};
 const a=run(30),b=run(120);assert.ok(a.position.distanceTo(b.position)<.07);assert.ok(a.roll>1);
 const body=new SuitcasePhysics(),wall=[{minX:30.8,maxX:31.2,minZ:40,maxZ:60}];
 for(let i=0;i<120;i++)body.update({x:30+i/120,z:50,yaw:0,speed:1},new T.Vector3(30.3+i/120,.95,50),1/60,wall);
 assert.ok(body.position.x<=30.52);assert.equal(body.connected,false,'blocked case releases instead of stretching the arm');
});

test('a held suitcase lifts with a jump and returns to wheel contact under gravity',()=>{
 const body=new SuitcasePhysics();
 for(let i=0;i<150;i++){
  const t=i/60,y=Math.max(0,4*t-4.905*t*t),p={x:30,z:50,y,yaw:0,speed:0};
  body.update(p,new T.Vector3(30.3,.95+y,50),1/60,[]);
  assert.ok(body.handleLength<=1.06);assert.ok(body.position.y>=.099);
  if(i===25)assert.ok(body.position.y>.5,'tether lifts suitcase');
 }
 const bottoms=[-.17,.17].map(x=>new T.Vector3(x,0,0).applyQuaternion(body.rotation).add(body.position).y-.055);
 assert.ok(Math.abs(Math.min(...bottoms)-.045)<.005,'wheels settle onto the paving');
});
