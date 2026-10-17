import * as T from 'three';

// Six triangles per roof; the tiles are pixels, not thousands of meshes.
export function pitchedRoof(width,depth,rise){
  const x=width/2,z=depth/2;
  const points=[[-x,0,-z],[x,0,-z],[0,rise,-z],[-x,0,z],[x,0,z],[0,rise,z]];
  const faces=[[0,3,5],[0,5,2],[2,5,4],[2,4,1],[0,2,1],[3,4,5]];
  const pos=[],uv=[];
  for(const face of faces)for(const i of face){const p=points[i];pos.push(...p);uv.push(p[2]/4,(p[0]+x)/4);}
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(Array.from({length:pos.length/3},(_,i)=>i));g.computeVertexNormals();return g;
}
export function drawRoofTiles(c,w,h){
  c.fillStyle='#b67350';c.fillRect(0,0,w,h);
  const cols=8,rows=8,cw=w/cols,ch=h/rows;
  for(let y=0;y<rows;y++)for(let x=0;x<cols;x++){
    const shade=(x*17+y*31)%19;
    const grad=c.createLinearGradient(x*cw,0,(x+1)*cw,0);
    grad.addColorStop(0,`rgb(${118+shade},${64+shade},${42+shade})`);grad.addColorStop(.45,`rgb(${195+shade},${121+shade},${81+shade})`);grad.addColorStop(1,'#9a563a');
    c.fillStyle=grad;c.fillRect(x*cw,y*ch,cw,ch);
    c.fillStyle='rgba(59,32,24,.35)';c.fillRect(x*cw,y*ch,cw,3);
    c.fillStyle='rgba(255,224,174,.25)';c.fillRect(x*cw,y*ch+3,cw,2);
  }
}
export function drawWindow(c,w,h){
  const sky=c.createLinearGradient(0,0,w,h);sky.addColorStop(0,'#a3b5b3');sky.addColorStop(.48,'#4b666d');sky.addColorStop(1,'#182c34');c.fillStyle=sky;c.fillRect(0,0,w,h);
  c.fillStyle='rgba(229,215,181,.35)';c.fillRect(w*.08,0,w*.23,h);c.fillRect(w*.74,0,w*.18,h);
  c.fillStyle='rgba(17,34,38,.25)';for(let i=0;i<6;i++)c.fillRect(i*w/5,h*.55,w*.1,h*.45);
  c.fillStyle='#d6d0b8';c.fillRect(w*.48,0,w*.035,h);c.fillRect(0,h*.45,w,h*.025);
  c.strokeStyle='#344342';c.lineWidth=12;c.strokeRect(0,0,w,h);
}

export function buildingDetails(world,x,z,w,d,h){
  const variant=Math.abs(Math.round(x*7+z*11))%3;
  // Keep every detail in existing material batches, and leave collision footprints alone.
  for(const sx of [-1,1])for(const sz of [-1,1])world.box(.34,h,.34,x+sx*(w/2-.04),h/2,z+sz*(d/2-.04),world.m.trim);
  if(variant!==0){
    const rise=Math.min(w*.16,3.4);
    world.mesh(pitchedRoof(w+.8,d+.8,rise),world.m.tile,x,h+.3,z);
    world.box(.22,.18,d+1,x,h+.3+rise,z,world.m.tile);
    world.box(.85,1.6,.85,x-w*.26,h+rise*.7+1,z+d*.18,world.m.cream);
    world.box(1.05,.17,1.05,x-w*.26,h+rise*.7+1.85,z+d*.18,world.m.trim);
  }else{
    for(const s of [-1,1]){world.box(w+.3,.65,.18,x,h+.55,z+s*d/2,world.m.trim);world.box(.18,.65,d,x+s*w/2,h+.55,z,world.m.trim);}
  }
  return variant;
}
