import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {Cyclist} from './cyclist.js';

export const SHOP_BIKES=[{x:27,z:-22},{x:27,z:-19}];
export function createShopBicycles(positions=SHOP_BIKES,color=0x278e86){
  const model=new Cyclist();model.frameMaterial.color.set(color);
  const bicycle=model.group,parts=new Map();bicycle.updateMatrixWorld(true);
  bicycle.traverse(o=>{if(!o.isMesh)return;if(!parts.has(o.material))parts.set(o.material,[]);parts.get(o.material).push(o.geometry.clone().applyMatrix4(o.matrixWorld));});
  const group=new T.Group();group.name='Porto Cycle House — rideable-model display';
  const matrix=new T.Matrix4();
  for(const [material,geometries] of parts){
    const geometry=mergeGeometries(geometries,false),mesh=new T.InstancedMesh(geometry,material,positions.length);
    positions.forEach((p,i)=>{matrix.makeTranslation(p.x,p.y??.12,p.z);mesh.setMatrixAt(i,matrix);});
    mesh.castShadow=true;mesh.receiveShadow=true;group.add(mesh);geometries.forEach(g=>g.dispose());
  }
  // Only the merged geometry is retained; materials are shared by the display.
  bicycle.traverse(o=>{if(o.isMesh)o.geometry.dispose();});
  return group;
}
