import {Vision,Vector3} from './vendor/yuka.module.js';
export function validateObjects(objects){
  return Array.isArray(objects)&&objects.length<=1000&&new Set(objects.map(o=>o?.id)).size===objects.length&&objects.every(o=>o&&typeof o.id==='string'&&o.id.length>0&&o.id.length<=120&&typeof o.name==='string'&&o.name.length<=100&&['bench','chair','bed','food','drink'].includes(o.type)&&['x','y','z','yaw'].every(k=>Number.isFinite(o[k])&&Math.abs(o[k])<10000)&&o.approach&&['x','z'].every(k=>Number.isFinite(o.approach[k])&&Math.abs(o.approach[k])<10000)&&Array.isArray(o.affordances)&&o.affordances.every(a=>['sit','lie_down','eat','drink'].includes(a)));
}
export function perceivedObjects(s){
  const owner={getWorldPosition:v=>v.set(s.player.x,1.6,s.player.z),getWorldDirection:v=>v.set(Math.sin(s.player.yaw||0),0,-Math.cos(s.player.yaw||0))};
  const vision=new Vision(owner);vision.range=30;vision.fieldOfView=Math.PI*1.2;
  return (s.objects||[]).filter(o=>{
    // Use the object's approach slot, rather than a point inside its collider.
    const point=new Vector3(o.approach.x,1.6,o.approach.z);
    if(!vision.visible(point))return false;
    const dx=point.x-s.player.x,dz=point.z-s.player.z,length=Math.hypot(dx,dz);
    for(let d=1;d<length-.5;d+=.5){const x=s.player.x+dx*d/length,z=s.player.z+dz*d/length;if((s.obstacles||[]).some(b=>x>b.minX&&x<b.maxX&&z>b.minZ&&z<b.maxZ))return false;}
    return true;
  }).map(o=>({id:o.id,name:o.name,type:o.type,metres:Math.round(Math.hypot(o.x-s.player.x,o.z-s.player.z)),affordances:o.affordances,source:'Yuka field of view + collision line of sight'})).sort((a,b)=>a.metres-b.metres).slice(0,6);
}
