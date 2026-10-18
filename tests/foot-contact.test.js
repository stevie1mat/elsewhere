import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {Explorer} from '../src/explorer.js';
import {groundElevation} from '../server/shared/landscape.js';

test('real shoes stay above paving through idle, walk, run, slopes and repeated poses',async()=>{
  const data=await readFile(new URL('../public/assets/people/traveler-man.glb',import.meta.url));
  const gltf=await new GLTFLoader().parseAsync(data.buffer.slice(data.byteOffset,data.byteOffset+data.byteLength),'');
  const explorer=new Explorer(gltf.scene,gltf.animations[0]);
  assert.ok(explorer.footContact.samples.length>0);
  const point=new T.Vector3();
  for(const x of [30,-350])for(const speed of [0,2,4.5]){
    const p={x,z:40,y:groundElevation(x,40),yaw:.6,speed,walked:0,mode:'walking',grounded:true};
    for(let frame=0;frame<90;frame++){
      p.walked+=speed/60;explorer.update(p,1/60);explorer.walker.updateMatrixWorld(true);
      let clearance=Infinity;
      for(const {mesh,indices} of explorer.footContact.samples){
        mesh.skeleton.update();
        for(const i of indices){mesh.getVertexPosition(i,point).applyMatrix4(mesh.matrixWorld);clearance=Math.min(clearance,point.y-groundElevation(point.x,point.z));}
      }
      assert.ok(Math.abs(clearance-.045)<1e-5,`sole clearance ${clearance} at speed ${speed}`);
    }
    p.speed=0;explorer.update(p,1/60);const y=explorer.walker.position.y;
    for(let i=0;i<20;i++){explorer.update(p,0);assert.ok(Math.abs(explorer.walker.position.y-y)<1e-6,'idle pose does not alternate or accumulate height');}
    explorer.update({...p,y:p.y+1,grounded:false},1/60);assert.equal(explorer.walker.position.y,p.y+1,'jump remains airborne');
    explorer.update({...p,y:-2.2,grounded:false,swimming:true},1/60);assert.equal(explorer.walker.position.y,-2.2,'swimming retains water depth');
  }
});
