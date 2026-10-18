import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {buildingStyle,buildPortoBuilding} from '../src/architecture.js';
function builder(){
 const batches=new Map(),obstacles=[];
 const m=Object.fromEntries(['cream','peach','sage','blue','trim','glass','wood','terra','tile','pavement','dark','teak','leaves','flower'].map(k=>[k,new T.MeshStandardMaterial()]));
 return {m,batches,obstacles,cameraColliders:[],cityBuildings:[],mesh(g,mat,x=0,y=0,z=0,r=0){g.rotateY(r);g.translate(x,y,z);if(!batches.has(mat))batches.set(mat,[]);batches.get(mat).push(g);},box(a,h,b,x,y,z,m){this.mesh(new T.BoxGeometry(a,h,b),m,x,y,z);},obstacle(x,z,a,b){obstacles.push({minX:x-a/2,maxX:x+a/2,minZ:z-b/2,maxZ:z+b/2});}};
}
test('neighborhood receives all six residential silhouettes and purposeful shops',()=>{
 const styles=new Set();for(let x=0;x<50;x++)styles.add(buildingStyle(x,14));
 assert.equal(styles.size,6);assert.equal(buildingStyle(14,14,'CAFÉ LUMA'),'cafe');assert.equal(buildingStyle(13,-15,'PORTO CYCLE HOUSE'),'workshop');
 assert.equal(buildingStyle(-350,-365),'chapel');
});
test('every architecture style produces mergeable geometry and contained collision volumes',()=>{
 const examples=new Map();for(let x=0;x<100;x++)examples.set(buildingStyle(x,14),{x,z:14});
 examples.set('cafe',{x:14,z:14,shop:'CAFÉ LUMA'});examples.set('chapel',{x:-350,z:-365});
 const signatures=new Set();
 for(const [style,p] of examples){
  for(const front of ['east','south']){
   const w=builder();buildPortoBuilding(w,p.x,p.z,22,20,14,w.m.cream,p.shop,front);
   assert.equal(w.cityBuildings[0].architecture,style);
   let triangles=0;
   for(const parts of w.batches.values()){
    const g=mergeGeometries(parts);assert.ok(g);g.computeBoundingBox();assert.ok(Number.isFinite(g.boundingBox.max.y));triangles+=g.index.count/3;g.dispose();parts.forEach(g=>g.dispose());
   }
   assert.ok(triangles<4000,`${style}: ${triangles}`);
   for(const b of w.obstacles){assert.ok(b.minX>=p.x-11.1&&b.maxX<=p.x+11.1);assert.ok(b.minZ>=p.z-10.1&&b.maxZ<=p.z+10.1);}
   signatures.add(`${style}:${w.cameraColliders.map(c=>`${c.geometry.parameters.width},${c.geometry.parameters.height},${c.geometry.parameters.depth}`).join(';')}`);
  }
 }
 assert.ok(signatures.size>=8);
});
