import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
// Baked colored details: one instanced draw per collectible type.
export function challengeGeometry(type){
  const parts=[];
  const add=(g,color,x=0,y=0,z=0)=>{if(!g.index)g.setIndex(Array.from({length:g.attributes.position.count},(_,i)=>i));g.translate(x,y,z);const c=new T.Color(color),colors=[];for(let i=0;i<g.attributes.position.count;i++)colors.push(c.r,c.g,c.b);g.setAttribute('color',new T.Float32BufferAttribute(colors,3));parts.push(g);};
  if(type==='coin'){
    add(new T.CylinderGeometry(.38,.38,.11,24).rotateX(Math.PI/2),0xd99b27);
    for(const z of [-.065,.065]){add(new T.TorusGeometry(.33,.025,6,24),0xffdf77,0,0,z);add(new T.BoxGeometry(.055,.36,.025),0xffedab,0,0,z);add(new T.BoxGeometry(.19,.045,.025),0xffedab,0,.14,z);}
  }else if(type==='barrier'){
    for(const x of [-1,1]){add(new T.BoxGeometry(.18,.85,.15),0x334446,x,-.05,0);add(new T.BoxGeometry(.45,.1,.95),0x26393b,x,-.45,0);}
    add(new T.BoxGeometry(2.6,.48,.3),0xf0b440,0,.18,0);
    for(const z of [-.16,.16])for(let x=-1.08;x<1.2;x+=.45)add(new T.BoxGeometry(.18,.43,.02).rotateZ(-.3),0x26393b,x,.18,z);
    for(const x of [-1.15,1.15])add(new T.SphereGeometry(.09,8,6),0xffe4a1,x,.51,0);
  }else if(type==='gem'){
    add(new T.OctahedronGeometry(.48),0x5ce3ee);
    add(new T.TorusGeometry(.31,.025,6,16).rotateX(Math.PI/2),0xbafaff);
  }else{
    const shape=new T.Shape();shape.moveTo(-.35,.4);shape.lineTo(.35,.4);shape.lineTo(.3,-.1);shape.quadraticCurveTo(.18,-.4,0,-.52);shape.quadraticCurveTo(-.18,-.4,-.3,-.1);shape.closePath();
    // Convert to indexed geometry so it can share the same merge path as primitives.
    const face=new T.ExtrudeGeometry(shape,{depth:.1,bevelEnabled:false,curveSegments:5});face.setIndex(Array.from({length:face.attributes.position.count},(_,i)=>i));add(face,0x67c997);
    add(new T.BoxGeometry(.1,.48,.04),0xe9ffce,0,.02,.12);add(new T.BoxGeometry(.35,.1,.04),0xe9ffce,0,.04,.12);
  }
  const geometry=mergeGeometries(parts,false);parts.forEach(g=>g.dispose());return geometry;
}
