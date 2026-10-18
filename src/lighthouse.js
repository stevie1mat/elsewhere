import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

// Static details are merged by material: detailed silhouette, few draw calls.
export function createLighthouse(){
  const group=new T.Group();group.name='Porto lighthouse';group.position.set(188,0,-161);
  const mats={stone:new T.MeshStandardMaterial({color:0x777d70,roughness:1}),white:new T.MeshStandardMaterial({color:0xe2dbbe,roughness:.85}),red:new T.MeshStandardMaterial({color:0x9e4b35,roughness:.8}),metal:new T.MeshStandardMaterial({color:0x263c3b,roughness:.45,metalness:.55}),glass:new T.MeshStandardMaterial({color:0x96c4c7,roughness:.18,metalness:.3}),light:new T.MeshStandardMaterial({color:0xffe2a3,emissive:0xffba51,emissiveIntensity:2})};
  const parts=new Map(),matrix=new T.Matrix4(),object=new T.Object3D();
  function add(geometry,material,x,y,z,sx=1,sy=1,sz=1,ry=0){if(geometry.index){const original=geometry;geometry=geometry.toNonIndexed();original.dispose();}object.position.set(x,y,z);object.scale.set(sx,sy,sz);object.rotation.set(0,ry,0);object.updateMatrix();matrix.copy(object.matrix);geometry.applyMatrix4(matrix);if(!parts.has(material))parts.set(material,[]);parts.get(material).push(geometry);}
  const cylinder=(r1,r2,h,y,mat)=>add(new T.CylinderGeometry(r1,r2,h,32),mat,0,y,0);
  // A low rocky shore and irregular boulders, not a smooth hemispherical island.
  cylinder(18,28,5,0,mats.stone);
  for(let i=0;i<18;i++){const a=i*Math.PI*2/18,r=20+Math.sin(i*3)*2;add(new T.IcosahedronGeometry(1,1),mats.stone,Math.cos(a)*r,Math.sin(i)*.7,Math.sin(a)*r,5+Math.sin(i)*1.5,3.4,5, i);}
  cylinder(8,10,1,3,mats.white);cylinder(3,4.7,22,14.5,mats.white);
  for(const y of [8,16,23]){const r=4.7-(y-3.5)/22*1.7;cylinder(r,r+.15,.7,y,mats.red);}
  cylinder(5,5,.65,25.8,mats.white);cylinder(4.6,4.6,.22,26.3,mats.metal);
  for(const y of [26.6,27.7]){const ring=new T.TorusGeometry(4.5,.07,6,48);ring.rotateX(Math.PI/2);add(ring,mats.metal,0,y,0);}
  for(let i=0;i<24;i++){const a=i*Math.PI/12;add(new T.CylinderGeometry(.045,.045,1.2,6),mats.metal,Math.sin(a)*4.5,27.1,Math.cos(a)*4.5);}
  cylinder(2.8,2.8,3.2,28.1,mats.glass);
  for(let i=0;i<8;i++){const a=i*Math.PI/4;add(new T.CylinderGeometry(.09,.09,3.4,8),mats.metal,Math.sin(a)*2.85,28.1,Math.cos(a)*2.85);}
  cylinder(3.25,3.25,.35,29.9,mats.metal);cylinder(0,3.8,3,31.5,mats.red);cylinder(.09,.12,1.5,33.5,mats.metal);
  // Lit front lenses remain visible without expensive dynamic lights/shadows.
  for(let i=0;i<8;i++){const a=i*Math.PI/4;add(new T.SphereGeometry(.38,10,8),mats.light,Math.sin(a)*2.83,28.1,Math.cos(a)*2.83,1,1.4,1);}
  add(new T.BoxGeometry(1.4,2.5,.3),mats.metal,0,4.8,4.65);
  for(const y of [10.5,18.5])for(const side of [-1,1])add(new T.BoxGeometry(.85,1.6,.25),mats.metal,side*2,y,Math.sqrt((4.7-(y-3.5)*1.7/22)**2-4));
  for(let i=0;i<6;i++)add(new T.BoxGeometry(2.4,.3,1),mats.white,0,3-i*.3,5.5+i*.8);
  for(const [material,geometries] of parts){const mesh=new T.Mesh(mergeGeometries(geometries),material);mesh.castShadow=true;mesh.receiveShadow=true;group.add(mesh);geometries.forEach(g=>g.dispose());}
  return group;
}
