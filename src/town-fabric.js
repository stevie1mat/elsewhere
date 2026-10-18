import * as T from 'three';
import {PORTO_ROADS} from './porto-expansion.js';
import {LANDMARKS} from './movement.js';

export function townFabric(w){
  const excluded=[{x:-69,z:83,w:70,d:66},{x:-179,z:88,w:82,d:73}];
  const clear=(x,z,width,depth)=>{
    const a={minX:x-width/2-3,maxX:x+width/2+3,minZ:z-depth/2-3,maxZ:z+depth/2+3};
    if(w.obstacles.some(b=>a.maxX>b.minX&&a.minX<b.maxX&&a.maxZ>b.minZ&&a.minZ<b.maxZ))return false;
    if([...PORTO_ROADS,...excluded].some(r=>a.maxX>r.x-r.w/2-2&&a.minX<r.x+r.w/2+2&&a.maxZ>r.z-r.d/2-2&&a.minZ<r.z+r.d/2+2))return false;
    return LANDMARKS.every(p=>Math.hypot(p.x-x,p.z-z)>p.radius+7);
  };
  // Small artisan houses occupy empty blocks but leave broad roads, gardens,
  // quest stops and at least six metres between adjacent building footprints.
  let count=0;
  for(let z=-215;z<=175;z+=26)for(let x=-199;x<20;x+=23){
    const width=9+(count%3),depth=12+(count%2)*2;
    if(!clear(x,z,width,depth))continue;
    w.building(x,z,width,depth,6.8+(count%3)*2.2,[w.m.cream,w.m.peach,w.m.sage][count%3],undefined,'south');count++;
  }
  const stone=w.m.trim;
  function arch(x,y,z,width,rotation){
    const outer=width/2,inner=outer-.23,s=new T.Shape();
    s.absarc(0,0,outer,0,Math.PI,false);s.lineTo(-inner,0);s.absarc(0,0,inner,Math.PI,0,true);s.closePath();
    let g=new T.ExtrudeGeometry(s,{depth:.25,bevelEnabled:false,curveSegments:16});
    if(!g.index)g.setIndex(Array.from({length:g.attributes.position.count},(_,i)=>i));
    w.mesh(g,stone,x,y,z,rotation);
  }
  // Arcaded shopfronts and flowering vines add architectural depth at eye level.
  for(const b of w.cityBuildings.filter(b=>b.shop)){
    w.elevationOffset=b.base||0;
    const east=b.front==='east',face=east?b.x+b.width/2+.5:b.z+b.depth/2+.5;
    for(const offset of [-3.6,0,3.6]){
      const x=east?face:b.x+offset,z=east?b.z+offset:face;
      arch(x,2.1,z,3.1,east?Math.PI/2:0);
      for(const side of [-1,1])w.box(east?.3:.24,2.1,east?.24:.3,x+(east?0:side*1.43),1.05,z+(east?side*1.43:0),stone);
    }
    for(let i=0;i<18;i++){
      const offset=Math.sin(i*2.4)*4,height=3.8+Math.cos(i*.7)*.5;
      const g=new T.IcosahedronGeometry(.35+(i%3)*.13,1);g.setIndex(Array.from({length:g.attributes.position.count},(_,j)=>j));
      w.mesh(g,i%3?w.m.flower:w.m.leaves,east?face+.1:b.x+offset,height,east?b.z+offset:face+.1);
    }
  }
  w.elevationOffset=0;
  // Waterfront café pergolas: clear interiors, substantial shade and grape vines.
  for(const z of [-105,88]){
    for(const x of [32,37])for(const dz of [-5,5]){w.box(.18,3.5,.18,x,1.75,z+dz,w.m.wood);w.obstacle(x,z+dz,.3,.3);}
    for(let dz=-5.3;dz<=5.3;dz+=.65)w.box(5.6,.15,.16,34.5,3.55,z+dz,w.m.teak);
    for(let i=0;i<18;i++){
      const g=new T.IcosahedronGeometry(.8,1);g.setIndex(Array.from({length:g.attributes.position.count},(_,j)=>j));g.scale(1,.23,1);
      w.mesh(g,i%4?w.m.leaves:w.m.flower,32+(i%3)*2.4,3.72,z-4+Math.floor(i/3)*1.6);
    }
    for(const dz of [-2.5,2.5])w.table(34.5,z+dz);
  }
}
