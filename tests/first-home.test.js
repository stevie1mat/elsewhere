import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {buildFirstHome} from '../src/welcome-world.js';
import {canOccupy} from '../src/movement.js';

test('first home has a continuous ceiling, enclosed walls and a clear human-scale doorway',()=>{
 const material=new T.MeshStandardMaterial(),w={m:new Proxy({},{get:()=>material}),scene:new T.Scene(),cameraColliders:[],obstacles:[],box(){},mesh(g){g.dispose();},sign(){},obstacle(x,z,a,b){this.obstacles.push({minX:x-a/2,maxX:x+a/2,minZ:z-b/2,maxZ:z+b/2});}};
 buildFirstHome(w);
 for(const x of [14.5,18,23])for(const z of [-87.5,-83,-78.5]){
  const ray=new T.Raycaster(new T.Vector3(x,2.8,z),new T.Vector3(0,1,0));
  const hit=ray.intersectObjects(w.cameraColliders)[0];assert.ok(hit&&hit.distance<.5,'every part of the room is covered');
 }
 for(let x=19;x<25;x+=.25)assert.ok(canOccupy(x,-83,w.obstacles,.6),'entrance remains walkable');
 for(const [x,z] of [[14,-83],[18,-88],[18,-78],[23.5,-86],[23.5,-80]])assert.equal(canOccupy(x,z,w.obstacles,.35),false,'walls enclose the room');
});
