import * as T from 'three';
import {groundElevation,shorelineX} from '../server/shared/landscape.js';

export function terrainPatch(w,width,depth,x,z,offset,material){
  const geo=new T.PlaneGeometry(width,depth,Math.max(1,Math.ceil(width/8)),Math.max(1,Math.ceil(depth/8)));
  geo.rotateX(-Math.PI/2);const p=geo.attributes.position;
  for(let i=0;i<p.count;i++)p.setY(i,groundElevation(p.getX(i)+x,p.getZ(i)+z)+offset);
  geo.computeVertexNormals();w.mesh(geo,material,x,0,z);
}
export function elevated(w,x,z,fn){
  const old=w.elevationOffset||0;w.elevationOffset=groundElevation(x,z);
  try{fn();}finally{w.elevationOffset=old;}
}
export function curvedHarbor(w){
  const positions=[],uv=[],indices=[],wallPos=[],wallUV=[],wallIndex=[];
  for(let i=0;i<=190;i++){
    const z=-400+i*4,edge=shorelineX(z);
    positions.push(64,.06,z,edge,.06,z);uv.push(64/3,z/3,edge/3,z/3);
    wallPos.push(edge,-3,z,edge,.06,z);wallUV.push(z/3,0,z/3,1);
    if(i<190){const n=i*2;indices.push(n,n+2,n+1,n+1,n+2,n+3);wallIndex.push(n,n+1,n+2,n+1,n+3,n+2);}
  }
  function mesh(pos,tex,idx,mat){const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.setAttribute('uv',new T.Float32BufferAttribute(tex,2));g.setIndex(idx);g.computeVertexNormals();w.mesh(g,mat);}
  mesh(positions,uv,indices,w.m.pavement);mesh(wallPos,wallUV,wallIndex,w.m.cream);
  // Low stone parapets follow the curved promenade, with a wide pier opening.
  for(let z=-390;z<352;z+=4){
    if(z> -48&&z< -24)continue;
    const x=shorelineX(z),next=shorelineX(z+4),length=Math.hypot(next-x,4);
    w.box(.5,.65,length+.1,(x+next)/2,.325,z+2,w.m.cream,Math.atan2(next-x,4));
    w.box(.72,.15,length+.2,(x+next)/2,.72,z+2,w.m.trim,Math.atan2(next-x,4));
    w.obstacle((x+next)/2,z+2,Math.abs(next-x)+.7,4);
    if(z%28===-26||z%28===2){w.lamp(x-3,z);w.bench(x-6,z,Math.PI/2);}
  }
  // Broader north/south waterfront terraces retain a clear route along their inner edge.
  for(const z of [-248,-204,156,200,244,288]){
    const edge=shorelineX(z);
    if(edge<84)continue;
    w.palm(edge-7,z,7.5);
    w.table(edge-16,z);w.umbrella(edge-16,z,w.m.trim);
    w.table(edge-16,z+7);w.umbrella(edge-16,z+7,w.m.peach);
    w.planter(edge-7,z+5);
  }
  // Natural rock clusters soften the waterline without blocking the promenade.
  const rock=w.mat(0x9caa9c);
  for(let i=0;i<48;i++){
    const z=-380+i*15.2;if(z>-115&&z<15)continue;
    const g=new T.IcosahedronGeometry(1,1);g.setIndex(Array.from({length:g.attributes.position.count},(_,k)=>k));
    g.scale(2.5+(i%3),1.4+(i%4)*.35,3.2);w.mesh(g,rock,shorelineX(z)+2.5,-.7,z,i*.7);
  }
}

export function hillsideLandmarks(w){
  // Retaining cliff closes the raised western land surface down to sea level.
  const positions=[],uv=[],indices=[];
  const outline=[];
  for(let z=-400;z<=360;z+=8)outline.push([-480,z]);
  for(let x=-480;x<=64;x+=8)outline.push([x,360]);
  for(let x=64;x>=-480;x-=8)outline.push([x,-400]);
  outline.forEach(([x,z],i)=>{
    positions.push(x,-4,z,x,groundElevation(x,z),z);uv.push(i*2,0,i*2,8);
    if(i<outline.length-1&&Math.hypot(outline[i+1][0]-x,outline[i+1][1]-z)<20){const n=i*2;indices.push(n,n+2,n+1,n+1,n+2,n+3);}
  });
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(indices);g.computeVertexNormals();
  const cliff=w.mat(0xb6ae93);cliff.side=T.DoubleSide;w.mesh(g,cliff);
  // A real neighborhood landmark, reached along the upper village lanes.
  const x=-350,z=-365;
  elevated(w,x,z,()=>{
    w.box(24,5,28,x,-2.5,z,w.m.cream);
    w.building(x,z,20,24,13,w.m.cream,undefined,'south');
    w.box(6,28,6,x+8,14,z-7,w.m.cream);
    for(const y of [2,19,25,28])w.box(6.8,.5,6.8,x+8,y,z-7,w.m.trim);
    for(const side of [-1,1]){
      w.box(2,3.8,.15,x+8,23,z-7+side*3.1,w.m.dark);
      w.box(.15,3.8,2,x+8+side*3.1,23,z-7,w.m.dark);
    }
    w.mesh(new T.ConeGeometry(5,5,4),w.m.tile,x+8,30.7,z-7,Math.PI/4);
    w.box(.16,2,.16,x+8,34,z-7,w.m.dark);w.box(1.1,.16,.16,x+8,34.4,z-7,w.m.dark);
    w.obstacle(x+8,z-7,6,6);
  });
  terrainPatch(w,30,12,x,z+21,.09,w.m.pavement);
  for(const xx of [x-12,x+12])elevated(w,xx,z+21,()=>{w.bench(xx,z+21);w.planter(xx,z+25);});
}
