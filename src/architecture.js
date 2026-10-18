import * as T from 'three';
import {pitchedRoof} from './building-details.js';

export function buildingStyle(x,z,shop=''){
  if(x===-350&&z===-365)return 'chapel';
  if(/CAFÉ|PADARIA/.test(shop))return 'cafe';
  if(/CYCLE|OFICINA|MERCADO/.test(shop))return 'workshop';
  if(shop)return 'terrace';
  let hash=2166136261;
  for(const c of `${x}:${z}`)hash=Math.imul(hash^c.charCodeAt(0),16777619);
  return ['townhouses','villa','courtyard','workshop','terrace','gable'][Math.abs(hash)%6];
}
function hipRoof(width,depth,rise){
  const a=width/2,b=depth/2,r=Math.max(0,b-a*.6);
  const points=[[-a,0,-b],[a,0,-b],[a,0,b],[-a,0,b],[0,rise,-r],[0,rise,r]];
  const faces=[[0,4,1],[1,4,5],[1,5,2],[2,5,3],[3,5,4],[3,4,0]];
  const positions=[],uv=[];
  for(const face of faces)for(const i of face){const p=points[i];positions.push(...p);uv.push((p[0]+a)/3,(p[2]+b)/3);}
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(Array.from({length:positions.length/3},(_,i)=>i));g.computeVertexNormals();return g;
}

export function buildPortoBuilding(w,x,z,width,depth,height,material,shop,front){
  const style=buildingStyle(x,z,shop),east=front==='east',rotation=east?Math.PI/2:0;
  const span=east?depth:width,deep=east?width:depth,base=w.elevationOffset||0;
  const point=(u,v)=>({x:x+(east?v:u),z:z+(east?-u:v)});
  const box=(a,h,b,u,y,v,m)=>{const p=point(u,v);w.box(east?b:a,h,east?a:b,p.x,y,p.z,m);};
  const mesh=(g,m,u,y,v)=>{const p=point(u,v);w.mesh(g,m,p.x,y,p.z,rotation);};
  const colors=[material,w.m.cream,w.m.peach,w.m.sage,w.m.blue];
  function window(u,y,v,wide=1.3,tall=1.8,shutters=true){
    box(wide,tall,.14,u,y,v,w.m.glass);
    box(wide+.32,.15,.35,u,y-tall/2-.08,v+.1,w.m.trim);
    if(shutters)for(const side of [-1,1])box(.32,tall,.16,u+side*(wide/2+.24),y,v,w.m.sage);
    else box(.065,tall,.18,u,y,v+.03,w.m.trim);
  }
  function plants(u,y,v,length){
    box(length,.3,.45,u,y,v,w.m.terra);
    for(let i=0;i<3;i++){
      const g=new T.SphereGeometry(.24,6,4);g.scale(1,.65,1);
      mesh(g,i%2?w.m.flower:w.m.leaves,u+(i-1)*length*.28,y+.25,v);
    }
  }
  function volume(u,v,a,b,h,paint,roof='hip',spacing=4.4){
    box(a,h,b,u,h/2,v,paint);
    box(a+.15,.42,b+.15,u,.21,v,w.m.cream);
    box(a+.3,.22,b+.3,u,h,v,w.m.trim);
    const p=point(u,v);w.obstacle(p.x,p.z,east?b+.05:a+.05,east?a+.05:b+.05);
    const proxy=new T.Mesh(new T.BoxGeometry(east?b+.5:a+.5,h+3,east?a+.5:b+.5));
    proxy.position.set(p.x,base+(h+3)/2,p.z);proxy.updateMatrixWorld(true);w.cameraColliders.push(proxy);
    if(roof==='hip')mesh(hipRoof(a+.8,b+.8,Math.min(a*.23,3.4)),w.m.tile,u,h+.12,v);
    if(roof==='gable')mesh(pitchedRoof(a+.7,b+.7,Math.min(a*.38,4.3)),w.m.tile,u,h+.12,v);
    if(roof==='flat'){
      box(a-.2,.15,b-.2,u,h+.18,v,w.m.pavement);
      for(const side of [-1,1]){box(a+.2,.7,.17,u,h+.5,v+side*b/2,w.m.trim);box(.17,.7,b,u+side*a/2,h+.5,v,w.m.trim);}
    }
    // Dress both side elevations, which are especially visible from the balloon.
    const sideCount=Math.max(1,Math.floor((b-1)/5));
    for(let y=style==='workshop'?3.6:1.7;y<h-1;y+=3.3){
      for(let i=0;i<sideCount;i++)for(const side of [-1,1]){
        const zz=v+(i-(sideCount-1)/2)*5;
        const xx=u+side*(a/2+.1);
        const pane=new T.PlaneGeometry(1.2,style==='workshop'?.8:1.65);
        pane.rotateY(side*Math.PI/2);
        mesh(pane,w.m.glass,xx,y,zz);
        box(.36,.14,1.55,xx+side*.08,y-(style==='workshop'?.5:.93),zz,w.m.trim);
      }
    }
    for(let y=4.5;y<h-1;y+=style==='workshop'?4.8:3.3){
      const count=Math.max(1,Math.floor((a-1)/spacing));
      for(let i=0;i<count;i++){
        const xx=u+(i-(count-1)/2)*spacing;
        window(xx,y,v+b/2+.12,style==='villa'?1.7:1.2,style==='gable'?2.1:1.7,style!=='workshop');
        // Rear windows follow the specific volume, so courtyards remain open.
        box(1.1,1.65,.13,xx,y,v-b/2-.1,w.m.glass);
        if(y<5&&i%2===0&&style!=='workshop')plants(xx,y-1.2,v+b/2+.4,1.7);
      }
    }
    return h;
  }
  let actualHeight=height;
  if(style==='townhouses'){
    const count=span>17?3:2,a=span/count;
    for(let i=0;i<count;i++){
      const h=height*[.78,1.03,.89][i];actualHeight=Math.max(actualHeight,h);
      volume((i-(count-1)/2)*a,0,a-.25,deep,h,colors[i],'gable',3.5);
      const u=(i-(count-1)/2)*a;
      box(1.3,2.6,.2,u,1.3,deep/2+.12,w.m.wood);
      box(1.6,.2,.8,u,2.8,deep/2+.35,w.m.trim);
    }
  }else if(style==='villa'){
    actualHeight=Math.max(6,height*.72);
    volume(-span*.18,-deep*.12,span*.64,deep*.76,actualHeight,material,'hip',5.4);
    volume(span*.32,deep*.13,span*.36,deep*.74,actualHeight*.65,w.m.cream,'hip',4);
    // Covered veranda has columns and a broad timber canopy.
    box(span*.6,.22,2.5,-span*.18,3.05,deep*.38,w.m.tile);
    for(const u of [-span*.44,0,span*.1]){box(.22,3,.22,u,1.5,deep*.46,w.m.trim);const p=point(u,deep*.46);w.obstacle(p.x,p.z,.25,.25);}
  }else if(style==='courtyard'){
    actualHeight=Math.max(6,height*.7);
    volume(0,-deep*.31,span,deep*.38,actualHeight,material,'hip',4.6);
    for(const side of [-1,1])volume(side*span*.36,deep*.19,span*.28,deep*.62,actualHeight*.82,w.m.cream,'flat',3.7);
    box(span*.4,.08,deep*.6,0,.04,deep*.19,w.m.pavement);
    plants(0,.35,deep*.18,2.6);const p=point(0,deep*.18);w.obstacle(p.x,p.z,east?.5:2.6,east?2.6:.5);
  }else if(style==='workshop'){
    actualHeight=Math.max(5.5,height*.52);
    // A low warehouse with a sawtooth roof and wide timber loading doors.
    volume(0,0,span,deep,actualHeight,material,'none',6);
    const count=3,a=span/count;
    for(let i=0;i<count;i++)mesh(pitchedRoof(a+.12,deep+.7,1.8),w.m.tile,(i-1)*a,actualHeight+.15,0);
    for(const u of [-span*.27,span*.27]){
      box(span*.32,3.2,.2,u,1.6,deep/2+.12,w.m.wood);
      for(let j=-2;j<=2;j++)box(.055,3.1,.25,u+j*span*.055,1.6,deep/2+.15,w.m.dark);
      window(u,actualHeight-.8,deep/2+.18,span*.3,.7,false);
    }
  }else if(style==='cafe'||style==='terrace'){
    actualHeight=style==='cafe'?Math.min(height,8):Math.max(7,height*.78);
    volume(0,0,span,deep,actualHeight,material,'flat',5);
    if(style==='terrace')volume(-span*.2,-deep*.16,span*.56,deep*.55,actualHeight+3.5,w.m.peach,'hip',4.4);
    for(let u=-span/2+2;u<span/2-1;u+=3.6){
      window(u,1.5,deep/2+.12,2.6,2.6,false);
      box(3.1,.15,1.8,u,3,deep/2+.7,w.m.sage);
      for(const dx of [-1,0,1])box(.3,.025,1.85,u+dx,3.1,deep/2+.7,w.m.trim);
    }
    if(style==='cafe'){
      for(const u of [-span*.27,span*.27])plants(u,actualHeight+.35,deep*.28,3);
      for(const u of [-2,2])box(.13,2.1,.13,u,actualHeight+1.1,-1,w.m.wood);
      for(let u=-2.3;u<2.4;u+=.55)box(.15,.15,3,u,actualHeight+2.2,0,w.m.teak);
    }
  }else{
    actualHeight=style==='chapel'?13:Math.max(7,height*.85);
    volume(0,0,span,deep,actualHeight,material,'gable',style==='chapel'?7:4.8);
    box(2.2,3.6,.22,0,1.8,deep/2+.12,w.m.wood);
    mesh(new T.TorusGeometry(.75,.14,6,20),w.m.trim,0,actualHeight+1.2,deep/2+.2);
    mesh(new T.CircleGeometry(.65,20),w.m.glass,0,actualHeight+1.2,deep/2+.18);
  }
  if(shop){
    const p=point(0,deep/2+.32);w.sign?.(shop,p.x,3.65,p.z,Math.min(span-1,9),.6,rotation);
  }
  w.cityBuildings?.push({x,z,width,depth,height:actualHeight,shop,front,base,architecture:style});
  return style;
}
