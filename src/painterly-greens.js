import {groundElevation} from './movement.js';
import * as T from 'three';

// Rounded, overlapping leaf masses give the scanned tree trunks a fuller,
// illustrated silhouette. Instances share geometry and retain existing paths.
export function addPainterlyGreens(w) {
  const points=w.treePositions;
  const geometry=new T.IcosahedronGeometry(1,3);
  const positions=geometry.attributes.position,colors=[];
  for(let i=0;i<positions.count;i++){
    const x=positions.getX(i),y=positions.getY(i),z=positions.getZ(i);
    const detail=Math.sin(x*23+y*13)*Math.sin(z*19-x*11);
    const scale=1+detail*.09;positions.setXYZ(i,x*scale,y*scale,z*scale);
    const shade=.78+detail*.09+Math.max(0,y)*.2;colors.push(shade,shade,shade);
  }
  geometry.setAttribute('color',new T.Float32BufferAttribute(colors,3));geometry.computeVertexNormals();
  const material=new T.MeshStandardMaterial({color:0xffffff,vertexColors:true,roughness:1});
  const foliage=new T.InstancedMesh(geometry,material,points.length*7);
  const dummy=new T.Object3D(),palette=[0x70934d,0x88a659,0x567e47,0x9bae62];
  points.forEach((p,i)=>{
    for(let j=0;j<7;j++){
      const a=j*2.39996+i,spread=j===0?0:p.scale*.24;
      dummy.position.set(p.x+Math.cos(a)*spread,groundElevation(p.x,p.z)+p.scale*(j===0?.78:.61)+Math.sin(a*2)*.3,p.z+Math.sin(a)*spread);
      dummy.scale.set(p.scale*.28,p.scale*(j===0?.34:.25),p.scale*.27);
      dummy.rotation.set(.1*Math.sin(a),a,.12*Math.cos(a));dummy.updateMatrix();
      foliage.setMatrixAt(i*7+j,dummy.matrix);foliage.setColorAt(i*7+j,new T.Color(palette[(i+j)%palette.length]));
    }
  });
  foliage.name='Layered illustrated tree canopies';foliage.castShadow=true;foliage.receiveShadow=true;w.scene.add(foliage);
}
