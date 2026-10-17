import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

export const OUTSKIRT_ROADS=[
  {x:-280,z:-20,w:12,d:740},{x:-410,z:-20,w:12,d:740},
  {x:-208,z:-330,w:540,d:12},{x:-208,z:280,w:540,d:12},
  {x:-350,z:-158,w:240,d:14},{x:-350,z:136,w:240,d:14},
  {x:-24,z:-325,w:15,d:150},{x:-24,z:275,w:15,d:170},
];
export function expandOutskirts(w){
  // New land borders the old city without covering its streets or gardens.
  for(const [x,z,width,depth] of [[-360,-20,240,760],[-88,-330,304,140],[-88,280,304,160]]){
    w.box(width,3,depth,x,-1.53,z,w.m.sand);
    w.box(width,.05,depth,x,-.04,z,w.m.grass);
  }
  for(const r of OUTSKIRT_ROADS){
    w.box(r.w+5,.06,r.d+2,r.x,-.005,r.z,w.m.pavement);
    w.box(r.w,.04,r.d,r.x,.035,r.z,w.m.road);
    const vertical=r.d>r.w,length=vertical?r.d:r.w;
    for(let n=-length/2+8;n<length/2-4;n+=12)w.box(vertical?.12:4,.015,vertical?4:.12,r.x+(vertical?0:n),.063,r.z+(vertical?n:0),w.m.stripe);
  }
  const colors=[w.m.cream,w.m.peach,w.m.sage,w.m.blue];
  for(const [i,z] of [-280,-220,-100,-45,200,235].entries())for(const [j,x] of [-450,-360,-315].entries()){
    const width=14+(i%3)*3,depth=16+(j%2)*4,height=7.5+((i+j)%3)*3.25;
    w.box(width+7,.05,depth+7,x,.01,z,w.m.pavement);
    w.building(x,z,width,depth,height,colors[(i+j)%4],i===2&&j===1?'VILA POENTE':undefined,'south');
  }
  for(const [i,x] of [-175,-110,-62,20].entries()){
    w.building(x,-365,18,18,7.5+(i%2)*3.25,colors[i],i===0?'CASA DAS OLIVEIRAS':undefined,'south');
    w.building(x,320,20,21,7.5+(i%3)*3.25,colors[3-i],i===3?'CAFÉ DA COSTA':undefined,'south');
  }
  w.box(116,.05,5,-350,.03,78,w.m.pavement);w.box(5,.05,140,-350,.03,58,w.m.pavement);
  for(const z of [28,78,122])for(const x of [-365,-335])w.bench(x,z);
  for(let z=215;z<350;z+=25){w.palm(43,z,7+w.random()*2);w.lamp(59,z);w.bench(55,z,Math.PI/2);}
  w.box(24,.06,150,52,.01,280,w.m.pavement);
  for(const r of OUTSKIRT_ROADS.filter(r=>r.d>r.w))for(let z=-370;z<345;z+=52)w.lamp(r.x-9,z);
  addVegetation(w);
}

function addVegetation(w){
  const atlas=w.loader.load('/assets/generated/coastal-vegetation.png');atlas.colorSpace=T.SRGBColorSpace;atlas.anisotropy=4;
  // Atlas regions are taken from the generated silhouettes, not assumed equal cells.
  const regions=[[0,.46,.57,.54],[.57,.46,.43,.54],[0,0,.51,.46],[.51,0,.49,.46]];
  const groups=[[],[],[],[]];
  // A planted grove gives the park a recognizable canopy, with clear footpaths.
  for(let x=-394;x<=-306;x+=16)for(let z=0;z<=120;z+=18){
    if(Math.abs(x+350)<7||Math.abs(z-78)<8)continue;
    const px=x+w.random()*3,pz=z+w.random()*3;
    groups[0].push({x:px,z:pz,height:6+w.random()*2,rotation:w.random()*Math.PI});w.obstacle(px,pz,.7,.7);
  }
  for(let z=214;z<349;z+=6)groups[2].push({x:34,z,height:1.4+w.random()*.4,rotation:0});
  for(let i=0;i<360;i++){
    const x=-467+w.random()*510,z=-387+w.random()*730;
    const newLand=x< -246||z< -268||z>208;
    if(!newLand||OUTSKIRT_ROADS.some(r=>Math.abs(x-r.x)<r.w/2+5&&Math.abs(z-r.z)<r.d/2+5))continue;
    if(w.obstacles.some(b=>x>b.minX-4&&x<b.maxX+4&&z>b.minZ-4&&z<b.maxZ+4))continue;
    const type=i%4,height=[7,10,2.2,1.3][type]*(.8+w.random()*.5);
    groups[type].push({x,z,height,rotation:w.random()*Math.PI});
    if(type<2)w.obstacle(x,z,.7,.7);
  }
  groups.forEach((plants,type)=>{
    const [u,v,width,height]=regions[type],planes=[];
    for(let i=0;i<3;i++){
      const geo=new T.PlaneGeometry(type===1?.65:1,1);geo.translate(0,.5,0);geo.rotateY(i*Math.PI/3);
      const uv=geo.attributes.uv;for(let j=0;j<uv.count;j++)uv.setXY(j,u+uv.getX(j)*width,v+uv.getY(j)*height);
      planes.push(geo);
    }
    const geometry=mergeGeometries(planes);planes.forEach(g=>g.dispose());
    const material=new T.MeshStandardMaterial({map:atlas,alphaTest:.5,side:T.DoubleSide,roughness:1,color:0xc8d0bd});
    const mesh=new T.InstancedMesh(geometry,material,plants.length),dummy=new T.Object3D();
    plants.forEach((p,i)=>{dummy.position.set(p.x,0,p.z);dummy.scale.setScalar(p.height);dummy.rotation.y=p.rotation;dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);});
    mesh.name='AI coastal vegetation';mesh.receiveShadow=true;mesh.castShadow=true;
    mesh.customDepthMaterial=new T.MeshDepthMaterial({depthPacking:T.RGBADepthPacking,map:atlas,alphaTest:.5});
    w.scene.add(mesh);
  });
}
