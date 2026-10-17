import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

// Small, repeating woven relief, generated locally without downloading textures.
function weave(){
  const size=64,data=new Uint8Array(size*size*4);
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){
    const i=(y*size+x)*4,v=140+Math.round(30*Math.sin(x*Math.PI/2)*Math.cos(y*Math.PI/2));
    data[i]=data[i+1]=data[i+2]=v;data[i+3]=255;
  }
  const texture=new T.DataTexture(data,size,size);texture.wrapS=texture.wrapT=T.RepeatWrapping;texture.repeat.set(4,8);texture.needsUpdate=true;return texture;
}
function mesh(group,geometry,material,x=0,y=0,z=0){const m=new T.Mesh(geometry,material);m.position.set(x,y,z);m.castShadow=m.receiveShadow=true;group.add(m);return m;}
function tube(group,points,radius,material){return mesh(group,new T.TubeGeometry(new T.CatmullRomCurve3(points),40,radius,5,false),material);}
const v=(x,y,z)=>new T.Vector3(x,y,z);
function burnerFire(group){
  const material=new T.ShaderMaterial({
    transparent:true,depthWrite:false,side:T.DoubleSide,blending:T.AdditiveBlending,
    uniforms:{time:{value:0}},
    vertexShader:`varying vec2 flameUv;uniform float time;void main(){flameUv=uv;vec3 p=position;p.x+=sin(uv.y*9.-time*13.)*.045*uv.y;p.z+=cos(uv.y*11.-time*9.)*.03*uv.y;gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);}`,
    fragmentShader:`varying vec2 flameUv;uniform float time;
      float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
      float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}
      void main(){vec2 uv=flameUv;float n=noise(vec2(uv.x*7.,uv.y*7.-time*6.));
        float width=(1.-uv.y)*.37*(.7+n*.5);float center=.5+sin(uv.y*12.-time*10.)*.045*uv.y;
        float edge=1.-smoothstep(width*.25,width,abs(uv.x-center));
        float alpha=edge*smoothstep(0.,.07,uv.y)*(1.-smoothstep(.7,.98,uv.y+n*.1));
        vec3 color=mix(vec3(.12,.35,1.),vec3(1.,.68,.12),smoothstep(.04,.3,uv.y));
        color=mix(color,vec3(1.,.12,.015),uv.y*.65);color=mix(color,vec3(1.,.96,.65),edge*.48*smoothstep(.1,.3,uv.y));
        gl_FragColor=vec4(color*1.6,alpha*.8);}`
  });
  for(const x of [-.25,.25])for(let i=0;i<3;i++){
    const plume=new T.Mesh(new T.PlaneGeometry(.62,1.25,1,12),material);plume.position.set(x,3.22,0);plume.rotation.y=i*Math.PI/3;group.add(plume);
  }
  const glow=new T.PointLight(0xff9a40,3,5,2);glow.position.set(0,2.95,0);group.add(glow);
  group.userData.fire={material,glow};
}
export function animateBurner(group,time){const fire=group.userData.fire;if(!fire)return;fire.material.uniforms.time.value=time;fire.glow.intensity=2.8+Math.sin(time*19)*.35+Math.sin(time*31)*.2;}
export function animateHelm(group,steering=0){
  const wheel=group.userData.helm;
  if(wheel)wheel.rotation.z=-Math.max(-1,Math.min(1,steering))*.65;
}
function addHelm(group,wood,metal){
  const brass=new T.MeshStandardMaterial({color:0xc99b50,metalness:.75,roughness:.28});
  // Raised pilot console, above the basket rim and within reach of the rider.
  mesh(group,new T.BoxGeometry(.58,.85,.3),wood,0,.48,-.88);
  mesh(group,new T.BoxGeometry(.76,.14,.42),metal,0,.95,-.86);
  const mount=new T.Group();mount.name='Pilot steering column';mount.position.set(0,1.17,-.65);mount.rotation.x=-.3;group.add(mount);
  mesh(mount,new T.CylinderGeometry(.065,.065,.3,12),brass,0,0,-.1).rotation.x=Math.PI/2;
  const wheel=new T.Group();wheel.name='Balloon steering wheel';mount.add(wheel);
  mesh(wheel,new T.TorusGeometry(.38,.045,12,48),wood);
  mesh(wheel,new T.TorusGeometry(.38,.012,8,48),brass,0,0,.038);
  mesh(wheel,new T.CylinderGeometry(.09,.09,.1,20),brass).rotation.x=Math.PI/2;
  for(let i=0;i<6;i++){
    const angle=i*Math.PI/3;
    mesh(wheel,new T.BoxGeometry(.035,.65,.035),brass).rotation.z=angle;
    mesh(wheel,new T.CapsuleGeometry(.035,.12,4,8),wood,Math.sin(angle)*.44,Math.cos(angle)*.44,0).rotation.z=-angle;
  }
  // Cream-faced instrument beside the wheel, with a visible needle.
  const dial=new T.Group();dial.position.set(.55,1.02,-.82);dial.rotation.x=-.3;group.add(dial);
  mesh(dial,new T.CylinderGeometry(.14,.14,.05,24),brass).rotation.x=Math.PI/2;
  mesh(dial,new T.CircleGeometry(.115,24),new T.MeshStandardMaterial({color:0xf5e9cd,roughness:.7}),0,0,.03);
  mesh(dial,new T.BoxGeometry(.012,.09,.01),metal,.02,.025,.04).rotation.z=-.6;
  group.userData.helm=wheel;
}
export function createBalloon(){
  const group=new T.Group();group.name='Woven basket and paneled hot-air balloon';
  const relief=weave();
  const colors=[0xc85e40,0xe7b978,0xf4e3bd,0x416e72];
  const cloth=colors.map(color=>new T.MeshStandardMaterial({color,roughness:.86,bumpMap:relief,bumpScale:.018,side:T.DoubleSide}));
  const seam=new T.MeshStandardMaterial({color:0xe6cda5,roughness:.96});
  const rope=new T.MeshStandardMaterial({color:0xdbc69a,roughness:1});
  const wicker=new T.MeshStandardMaterial({color:0x9b683b,roughness:.94,bumpMap:relief,bumpScale:.06});
  const trim=new T.MeshStandardMaterial({color:0x543b29,roughness:.82});
  const metal=new T.MeshStandardMaterial({color:0x68747a,metalness:.8,roughness:.3});
  // A narrow open throat expands into a broad shoulder and rounded crown.
  const profile=[new T.Vector2(.48,3.3),new T.Vector2(.7,3.7),new T.Vector2(1.15,4.25),new T.Vector2(1.85,4.95),new T.Vector2(2.55,5.85),new T.Vector2(2.9,6.8),new T.Vector2(2.85,7.55),new T.Vector2(2.45,8.35),new T.Vector2(1.7,8.95),new T.Vector2(.8,9.3),new T.Vector2(.02,9.45)];
  const curve=new T.SplineCurve(profile),points=curve.getPoints(64),panels=16;
  for(let i=0;i<panels;i++){
    const angle=i*Math.PI*2/panels;
    mesh(group,new T.LatheGeometry(points,8,angle,Math.PI*2/panels),cloth[i%4]);
    tube(group,points.map(p=>v(Math.sin(angle)*(p.x+.012),p.y,Math.cos(angle)*(p.x+.012))),.014,seam);
  }
  const throat=mesh(group,new T.TorusGeometry(.48,.035,8,40),trim,0,3.3,0);throat.rotation.x=Math.PI/2;
  mesh(group,new T.BoxGeometry(2.6,.16,2.6),wicker,0,-.08,0);
  const strands=[];
  for(const side of [-1,1]){
    mesh(group,new T.BoxGeometry(2.6,.85,.1),wicker,0,.35,side*1.25);
    mesh(group,new T.BoxGeometry(.1,.85,2.6),wicker,side*1.25,.35,0);
    for(let row=0;row<12;row++){
      strands.push(new T.BoxGeometry(2.6,.025,.025).translate(0,row*.068,side*1.31));
      strands.push(new T.BoxGeometry(.025,.025,2.6).translate(side*1.31,row*.068,0));
    }
    for(let col=0;col<24;col++){
      const n=-1.2+col*.104;
      strands.push(new T.BoxGeometry(.022,.8,.022).translate(n,.35,side*1.325));
      strands.push(new T.BoxGeometry(.022,.8,.022).translate(side*1.325,.35,n));
    }
    mesh(group,new T.CapsuleGeometry(.07,2.5,4,8),trim,0,.82,side*1.25).rotation.z=Math.PI/2;
    mesh(group,new T.CapsuleGeometry(.07,2.5,4,8),trim,side*1.25,.82,0).rotation.x=Math.PI/2;
  }
  mesh(group,mergeGeometries(strands),seam);strands.forEach(g=>g.dispose());
  for(const x of [-1.15,1.15])for(const z of [-1.15,1.15]){
    tube(group,[v(x,.7,z),v(x*.8,2.3,z*.8),v(x*.4,3.4,z*.4)],.026,rope);
    mesh(group,new T.CapsuleGeometry(.15,.24,5,10),wicker,x*.95,.18,z*.95);
  }
  for(const x of [-.25,.25]){mesh(group,new T.CylinderGeometry(.13,.13,.32,12),metal,x,2.55,0);}
  burnerFire(group);
  mesh(group,new T.BoxGeometry(1.25,.08,.45),metal,0,2.32,0);
  addHelm(group,trim,metal);
  return group;
}
export function createParachute(){
  const group=new T.Group();group.name='Stitched parachute canopy';
  const fabric=weave(),materials=[0xf3dfb2,0x397a80,0xe09b50,0x397a80].map(color=>new T.MeshStandardMaterial({color,side:T.DoubleSide,roughness:.88,bumpMap:fabric,bumpScale:.022}));
  const cord=new T.MeshStandardMaterial({color:0xf1e5c9,roughness:.9});
  const webbing=new T.MeshStandardMaterial({color:0x303c3e,roughness:.95});
  const point=(angle,t,bulge=0)=>{const theta=.09+t*1.44,r=3.15*Math.sin(theta);return v(Math.cos(angle)*r,3.9+1.7*Math.cos(theta)+bulge,Math.sin(angle)*r);};
  for(let i=0;i<16;i++){
    const angle=i*Math.PI/8,positions=[],uvs=[],indices=[];
    for(let row=0;row<=24;row++)for(let col=0;col<=8;col++){
      const t=row/24,u=col/8,p=point(angle+u*Math.PI/8,t,Math.sin(u*Math.PI)*Math.sin(t*Math.PI)*.13);
      positions.push(p.x,p.y,p.z);uvs.push(u,t);
      if(row<24&&col<8){const n=row*9+col;indices.push(n,n+9,n+1,n+1,n+9,n+10);}
    }
    const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));geometry.setAttribute('uv',new T.Float32BufferAttribute(uvs,2));geometry.setIndex(indices);geometry.computeVertexNormals();
    mesh(group,geometry,materials[i%4]).name='Inflated fabric panel';
    tube(group,Array.from({length:25},(_,j)=>point(angle,j/24)),.012,cord);
    const rim=point(angle,1),side=Math.cos(angle)>0?1:-1;
    tube(group,[v(side*.27,1.72,-.06),v(side*.48,2.15,Math.sin(angle)*.16),rim],.009,cord);
  }
  for(const t of [0,1]){const points=Array.from({length:65},(_,i)=>point(i*Math.PI/32,t));tube(group,points,.022,cord);}
  for(const side of [-1,1])mesh(group,new T.BoxGeometry(.045,.52,.028),webbing,side*.27,1.5,-.06).name='Harness riser';
  return group;
}
export function createParachutePack(){
  const group=new T.Group();group.name='Parachute pack and safety harness';
  const fabric=new T.MeshStandardMaterial({color:0x315957,roughness:.96,bumpMap:weave(),bumpScale:.012});
  const straps=new T.MeshStandardMaterial({color:0x252e30,roughness:.9});
  const metal=new T.MeshStandardMaterial({color:0xc2bca9,metalness:.65,roughness:.32});
  mesh(group,new T.CapsuleGeometry(.17,.22,8,16),fabric,0,0,-.19).scale.set(1,.95,.6);
  mesh(group,new T.BoxGeometry(.27,.16,.025),fabric,0,.09,-.30);
  for(const side of [-1,1]){
    tube(group,[v(side*.115,-.2,-.27),v(side*.14,.2,-.22),v(side*.15,.24,.02),v(side*.13,.08,.16),v(side*.11,-.21,.1)],.022,straps);
    mesh(group,new T.BoxGeometry(.055,.065,.018),metal,side*.12,-.09,.14);
  }
  tube(group,[v(-.17,-.19,-.15),v(-.18,-.21,.08),v(0,-.21,.17),v(.18,-.21,.08),v(.17,-.19,-.15)],.025,straps);
  mesh(group,new T.BoxGeometry(.26,.028,.02),straps,0,.04,.17);
  mesh(group,new T.TorusGeometry(.035,.009,6,16),new T.MeshStandardMaterial({color:0xe5a546}),.13,-.03,.19);
  return group;
}
