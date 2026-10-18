import * as T from 'three';
import {groundElevation} from '../server/shared/landscape.js';

// Sample the actual shoe geometry, not the ankle bone (which sits above the sole).
export class FootContact {
  constructor(model){
    this.model=model;this.samples=[];this.point=new T.Vector3();
    model.updateWorldMatrix(true,true);model.updateMatrixWorld(true);
    model.traverse(mesh=>{
      if(!mesh.isSkinnedMesh)return;
      mesh.skeleton.update();
      const joints=mesh.geometry.attributes.skinIndex,weights=mesh.geometry.attributes.skinWeight;
      const indices=[];
      for(let i=0;i<joints.count;i++){
        let weight=0;
        for(let j=0;j<4;j++)if(/_(Foot|Toe\d*)$/.test(mesh.skeleton.bones[joints.getComponent(i,j)]?.name||''))weight+=weights.getComponent(i,j);
        if(weight>.5)indices.push(i);
      }
      if(indices.length)this.samples.push({mesh,indices});
    });
  }
  align(player){
    if(player.swimming||player.grounded===false||(player.arrival&&player.arrival.phase!=='landed'))return;
    this.model.updateWorldMatrix(true,true);this.model.updateMatrixWorld(true);
    let correction=-Infinity;
    for(const {mesh,indices} of this.samples){
      mesh.skeleton.update();
      for(const i of indices){
        mesh.getVertexPosition(i,this.point).applyMatrix4(mesh.matrixWorld);
        // Keep the sole clear of the slightly raised path surfaces, including slopes.
        const surface=(player.y||0)+groundElevation(this.point.x,this.point.z)-groundElevation(player.x,player.z)+.045;
        correction=Math.max(correction,surface-this.point.y);
      }
    }
    if(Number.isFinite(correction))this.model.position.y+=correction;
  }
}
