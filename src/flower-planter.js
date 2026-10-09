import * as T from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// A branching bougainvillea shrub, with folded leaves and papery flower bracts.
export function flowerPlanterGeometry(seed=1){
  let state=seed>>>0;
  const random=()=>((state=(state*1664525+1013904223)>>>0)/4294967296);
  const v=(x,y,z)=>new T.Vector3(x,y,z), parts={pot:[],soil:[],wood:[],leaves:[],flowers:[]};
  function colorize(g,color,variation=.1){
    if(!g.index)g.setIndex(Array.from({length:g.attributes.position.count},(_,i)=>i));
    const c=new T.Color(color),colors=[];
    for(let i=0;i<g.attributes.position.count;i++){
      const shade=1-variation/2+random()*variation;
      colors.push(c.r*shade,c.g*shade,c.b*shade);
    }
    g.setAttribute('color',new T.Float32BufferAttribute(colors,3));return g;
  }
  function branch(points,radius,segments=8){
    parts.wood.push(colorize(new T.TubeGeometry(new T.CatmullRomCurve3(points),segments,radius,5,false),0x716046,.15));
  }
  function blade(length,width,curl){
    const positions=[],uv=[],indices=[];
    for(let j=0;j<=6;j++){
      const t=j/6,spread=Math.pow(Math.sin(Math.PI*t),.85)*width;
      for(const edge of [-1,0,1]){
        positions.push(edge*spread,t*length,curl*t*t+(edge===0?.018*Math.sin(t*Math.PI):0));
        uv.push((edge+1)/2,t);
      }
    }
    for(let j=0;j<6;j++)for(let edge=0;edge<2;edge++){
      const k=j*3+edge;indices.push(k,k+1,k+3,k+1,k+4,k+3);
    }
    const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(indices);g.computeVertexNormals();return g;
  }
  function place(g,point,direction,roll=0){
    g.rotateY(roll);g.applyQuaternion(new T.Quaternion().setFromUnitVectors(v(0,1,0),direction.clone().normalize()));g.translate(point.x,point.y,point.z);return g;
  }
  // Hollow pot: shaped foot, gently tapered walls, thick rolled lip and inner rim.
  const profile=[new T.Vector2(.43,.025),new T.Vector2(.49,.025),new T.Vector2(.505,.055),new T.Vector2(.495,.1)];
  for(let i=0;i<=38;i++){const y=.1+i*.015;profile.push(new T.Vector2(.49+(y-.1)*.215+.0018*Math.sin(i*2.5),y));}
  profile.push(...[[.64,.68],[.659,.695],[.67,.725],[.666,.758],[.65,.777],[.61,.777],[.594,.757],[.593,.71],[.565,.62],[.46,.12],[.43,.1],[.43,.025]].map(p=>new T.Vector2(...p)));
  const pot=colorize(new T.LatheGeometry(profile,48),0xb77753,.08);
  const colors=pot.attributes.color,pos=pot.attributes.position;
  for(let i=0;i<pos.count;i++){
    const y=pos.getY(i),a=Math.atan2(pos.getZ(i),pos.getX(i));
    const patina=.035*Math.sin(a*7+y*35)+.025*Math.sin(a*17-y*11);
    const shade=.9+.1*y/.78;
    colors.setXYZ(i,colors.getX(i)*shade+patina,colors.getY(i)*shade+patina*.75,colors.getZ(i)*shade+patina*.5);
  }
  parts.pot.push(pot);
  const soil=new T.CircleGeometry(.58,48);soil.rotateX(-Math.PI/2);soil.translate(0,.689,0);parts.soil.push(colorize(soil,0x3b3023,.3));
  for(let i=0;i<45;i++){
    const a=random()*Math.PI*2,r=Math.sqrt(random())*.54;
    const pebble=new T.IcosahedronGeometry(.008+random()*.014,0);pebble.scale(1,.45,1);pebble.translate(Math.cos(a)*r,.698,Math.sin(a)*r);parts.soil.push(colorize(pebble,i%4?0x51402c:0xbfa581));
  }
  branch([v(0,.68,0),v(.025,.85,.015),v(0,1.12,0)],.033);
  const phase=random()*Math.PI*2;
  for(let stem=0;stem<22;stem++){
    const angle=phase+stem*2.39996,radial=v(Math.cos(angle),0,Math.sin(angle));
    const across=v(-Math.sin(angle),0,Math.cos(angle));
    const reach=.32+random()*.29,height=1.3+random()*.42;
    const start=v(.025,.78+random()*.23,.015);
    const tip=radial.clone().multiplyScalar(reach).add(v(0,height,0));
    const curve=new T.CatmullRomCurve3([start,start.clone().lerp(tip,.45).add(v(0,.09,0)),tip]);
    branch(curve.getPoints(5),.008+random()*.006);
    for(let n=1;n<=8;n++)for(const side of [-1,1]){
      const t=.18+n*.095,point=curve.getPoint(t);
      const direction=radial.clone().multiplyScalar(.35).addScaledVector(across,side*(.6+random()*.5)).add(v(0,.1+random()*.65,0));
      const base=point.clone().addScaledVector(direction,.025);
      branch([point,base],.0025,1);
      const leaf=blade(.14+random()*.1,.047+random()*.022,-.035-random()*.025);
      parts.leaves.push(place(colorize(leaf,[0x345d2e,0x456e34,0x588143,0x294d29][n%4],.14),base,direction,random()*.8));
      // Fine central midrib, kept slightly above the folded blade surface.
      const vein=new T.CylinderGeometry(.0006,.0013,.13,3,1,true);vein.translate(0,.065,.004);
      parts.leaves.push(place(colorize(vein,0x78915a),base,direction));
    }
    if(stem%4===0)continue;
    for(let bloom=0;bloom<3;bloom++){
      const point=tip.clone().addScaledVector(across,(bloom-1)*.07).add(v(0,random()*.06,random()*.025));
      const outward=radial.clone().add(v(0,.55+random()*.4,0)).normalize();
      for(let petal=0;petal<3;petal++){
        const a=petal*Math.PI*2/3+stem;
        const direction=outward.clone().addScaledVector(across,Math.cos(a)*.9).add(v(0,Math.sin(a)*.8,0));
        const bract=blade(.095+random()*.045,.045+random()*.012,.035);
        parts.flowers.push(place(colorize(bract,[0xcc4c7d,0xe4759c,0xb94072,0xf29fba][(stem+bloom)%4],.12),point,direction,petal*1.8));
      }
      for(let stamen=0;stamen<3;stamen++){
        const p=point.clone().addScaledVector(outward,.027).addScaledVector(across,(stamen-1)*.009);
        const flower=new T.SphereGeometry(.008,6,3);flower.translate(p.x,p.y,p.z);parts.flowers.push(colorize(flower,0xffedc8));
      }
    }
  }
  return Object.fromEntries(Object.entries(parts).map(([name,list])=>{
    const merged=mergeGeometries(list,false);list.forEach(g=>g.dispose());return [name,merged];
  }));
}
