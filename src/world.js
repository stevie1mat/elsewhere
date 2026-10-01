import * as T from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { HDRLoader } from 'three/addons/loaders/HDRLoader.js';
import { clone } from 'three/addons/utils/SkeletonUtils.js';
import { Cyclist } from './cyclist.js';
import { QuestWorld } from './quest-world.js';

const ROOT = '/assets/';
export class World {
  constructor(scene, renderer, manager, location = 'porto') {
    this.location = location;
    this.scene = scene; this.renderer = renderer; this.manager = manager;
    this.obstacles = []; this.cameraColliders = []; this.batches = new Map(); this.walkers = []; this.birds = []; this.lights = [];
    this.night = false; this.treePositions = []; this.seed = 427;
    this.loader = new T.TextureLoader(manager);
    this.materials(); this.environment(); this.ground(); this.neighborhood(); this.waterfront(); this.garden(); this.details(); this.bake();
    this.questWorld=location === 'mumbai' ? {addCharacter(){},update(){}} : new QuestWorld(scene);this.questStage=0;this.coopMode=false;this.carryParcel=true;this.remoteState=null;
    this.loadTrees(); this.loadPeople();
  }
  random() { this.seed = (this.seed * 1664525 + 1013904223) >>> 0; return this.seed / 4294967296; }
  mat(color, roughness = .8, metalness = 0) { return new T.MeshStandardMaterial({ color, roughness, metalness }); }
  canvasTexture(draw, width = 512, height = 512) {
    const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height;
    draw(canvas.getContext('2d'), width, height);
    const texture = new T.CanvasTexture(canvas); texture.colorSpace = T.SRGBColorSpace; texture.anisotropy = 8;
    return texture;
  }
  materials() {
    const noise = this.canvasTexture((c, w, h) => {
      c.fillStyle = '#ddd9ce'; c.fillRect(0, 0, w, h);
      for (let i = 0; i < 18000; i++) { const v = Math.floor(100 + this.random() * 110); c.fillStyle = `rgba(${v},${v},${v},0.12)`; c.fillRect(this.random()*w, this.random()*h, 1.5, 1.5); }
    }); noise.wrapS = noise.wrapT = T.RepeatWrapping; noise.repeat.set(3, 3);
    const paving = this.canvasTexture((c,w,h) => {
      c.fillStyle='#b7b3a7';c.fillRect(0,0,w,h);
      for(let y=0;y<8;y++) for(let x=-1;x<8;x++) { const v=167+this.random()*25;c.fillStyle=`rgb(${v+14},${v+11},${v})`;c.fillRect(x*64+(y%2)*32+1,y*64+1,62,62); }
      for(let i=0;i<22000;i++){c.fillStyle=this.random()>.5?'#ffffff09':'#00000009';c.fillRect(this.random()*w,this.random()*h,1,1);}
    }); paving.wrapS=paving.wrapT=T.RepeatWrapping;paving.repeat.set(44,62);
    const groundMap=this.loader.load(ROOT+'hd/grass-color-4k.jpg');groundMap.colorSpace=T.SRGBColorSpace;groundMap.wrapS=groundMap.wrapT=T.RepeatWrapping;groundMap.repeat.set(8,8);groundMap.anisotropy=8;
    const asphalt=this.loader.load(ROOT+'hd/asphalt-color-4k.jpg');asphalt.colorSpace=T.SRGBColorSpace;asphalt.wrapS=asphalt.wrapT=T.RepeatWrapping;asphalt.repeat.set(4,30);asphalt.anisotropy=8;
    const asphaltNormal=this.loader.load(ROOT+'hd/asphalt-normal-2k.jpg');asphaltNormal.wrapS=asphaltNormal.wrapT=T.RepeatWrapping;asphaltNormal.repeat.set(4,30);
    this.m = {
      pavement: new T.MeshStandardMaterial({map:paving,roughness:.88,color:0xf1e5ce}),
      grass: new T.MeshStandardMaterial({map:groundMap,roughness:1,color:0x90a566}),
      road: new T.MeshStandardMaterial({map:asphalt,normalMap:asphaltNormal,normalScale:new T.Vector2(.3,.3),roughness:.91,color:0xb3b0a9}),
      cream: new T.MeshStandardMaterial({map:noise,color:0xf1e5ca,roughness:.88}),
      peach: new T.MeshStandardMaterial({map:noise,color:0xd9a58b,roughness:.88}),
      sage: new T.MeshStandardMaterial({map:noise,color:0x93b0a5,roughness:.88}),
      blue: new T.MeshStandardMaterial({map:noise,color:0x91adb8,roughness:.88}),
      trim:this.mat(0xf6edd9), dark:this.mat(0x263e3f,.7,.2), wood:this.mat(0x826046), teak:this.mat(0xaa8260),
      tile:this.mat(0x9a5b43), terra:this.mat(0xb87853), leaves:this.mat(0x526c36), palm:this.mat(0x4f764b),
      glass:new T.MeshStandardMaterial({color:0x294b53,metalness:.45,roughness:.17}),
      stripe:this.mat(0xe4ddd0), sand:this.mat(0xc9bb96), flower:this.mat(0xc36886), white:this.mat(0xdfe8df),
      lamp:new T.MeshStandardMaterial({color:0xffdeb1,emissive:0xffcf86,emissiveIntensity:1.5}),
      car:this.mat(0x728b86,.3,.35), tire:this.mat(0x202629), chrome:this.mat(0xabb5b2,.22,.85),
    };
  }
  mesh(geometry, material, x=0, y=0, z=0, rotation=0) {
    const matrix = new T.Matrix4().compose(new T.Vector3(x,y,z),new T.Quaternion().setFromAxisAngle(new T.Vector3(0,1,0),rotation),new T.Vector3(1,1,1));
    geometry.applyMatrix4(matrix);
    if(!this.batches.has(material))this.batches.set(material,[]);
    this.batches.get(material).push(geometry);
  }
  box(w,h,d,x,y,z,mat=this.m.trim,rotation=0) { this.mesh(new T.BoxGeometry(w,h,d),mat,x,y,z,rotation); }
  cylinder(top,bottom,height,x,y,z,mat=this.m.dark,segments=10) { this.mesh(new T.CylinderGeometry(top,bottom,height,segments),mat,x,y,z); }
  obstacle(x,z,w,d) { this.obstacles.push({minX:x-w/2,maxX:x+w/2,minZ:z-d/2,maxZ:z+d/2}); }
  bake() {
    for(const [material,geometries] of this.batches){
      const merged=mergeGeometries(geometries,false); const mesh=new T.Mesh(merged,material);
      mesh.castShadow=material!==this.m.pavement && material!==this.m.road && material!==this.m.grass;
      mesh.receiveShadow=true;this.scene.add(mesh);this.cameraColliders.push(mesh);geometries.forEach(g=>g.dispose());
    }
    this.batches.clear();
  }
  environment() {
    this.scene.fog=new T.FogExp2(0xd3bca0,.0026);
    this.sun=new T.DirectionalLight(0xffdeb0,3.2);this.sun.position.set(95,80,-65);
    this.sun.castShadow=true;this.sun.shadow.mapSize.set(2048,2048);
    Object.assign(this.sun.shadow.camera,{left:-72,right:72,top:72,bottom:-72,near:1,far:290});
    this.sun.shadow.normalBias=.045;this.sun.shadow.bias=-.00015;this.sun.shadow.blurSamples=8;
    this.scene.add(this.sun,this.sun.target);
    this.ambient=new T.HemisphereLight(0xcbdcde,0x74604b,1.65);this.scene.add(this.ambient);
    this.skyTexture=this.loader.load(ROOT+'hd/sky-8k.jpg');this.skyTexture.colorSpace=T.SRGBColorSpace;
    this.skyMaterial=new T.ShaderMaterial({side:T.BackSide,depthWrite:false,uniforms:{panorama:{value:this.skyTexture},night:{value:0}},
      vertexShader:'varying vec2 vUv;varying vec3 vPos;void main(){vUv=uv;vPos=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
      fragmentShader:`uniform sampler2D panorama;uniform float night;varying vec2 vUv;varying vec3 vPos;
      void main(){vec3 dir=normalize(vPos);vec3 photo=texture2D(panorama,vUv).rgb;
        float h=smoothstep(-.05,.65,dir.y);vec3 dusk=mix(vec3(.86,.62,.43),vec3(.29,.49,.62),h);
        vec3 col=mix(dusk,photo*vec3(1.08,.89,.73),.42);
        float sun=pow(max(dot(dir,normalize(vec3(.85,.22,-.55))),0.),1400.);col+=vec3(1.,.75,.38)*sun*3.;
        col=mix(col,vec3(.025,.06,.12)+photo*.045,night);gl_FragColor=vec4(col,1.);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`});
    this.sky=new T.Mesh(new T.SphereGeometry(1900,40,24),this.skyMaterial);this.scene.add(this.sky);
    new HDRLoader(this.manager).load(ROOT+'hd/lighting.hdr',texture=>{texture.mapping=T.EquirectangularReflectionMapping;this.scene.environment=texture;this.scene.environmentIntensity=.38;});
    this.oceanMaterial=new T.ShaderMaterial({uniforms:{time:{value:0},night:{value:0}},
      vertexShader:`varying vec3 vWorld;void main(){vec4 p=modelMatrix*vec4(position,1.);vWorld=p.xyz;gl_Position=projectionMatrix*viewMatrix*p;}`,
      fragmentShader:`uniform float time;uniform float night;varying vec3 vWorld;
      float wave(vec2 p){return sin(p.x*.72+time*.65)*.28+sin(p.y*.43-time*.42)*.24+sin((p.x+p.y)*1.8+time*.8)*.075;}
      void main(){vec2 p=vWorld.xz;float w=wave(p);vec3 n=normalize(vec3((w-wave(p+vec2(.12,0.)))/.12,1.,(w-wave(p+vec2(0.,.12)))/.12));
      vec3 view=normalize(cameraPosition-vWorld);float f=pow(1.-max(dot(n,view),0.),3.);
      vec3 col=mix(vec3(.035,.27,.29),vec3(.50,.62,.59),f);
      vec3 halfV=normalize(view+normalize(vec3(.85,.32,-.55)));float spec=pow(max(dot(n,halfV),0.),190.);
      col+=vec3(1.,.77,.45)*spec*1.6;col+=sin(p.y*2.5+time*.7)*.008;
      float fog=1.-exp(-length(cameraPosition-vWorld)*.0018);col=mix(col,vec3(.60,.65,.63),fog);
      col=mix(col,col*vec3(.15,.23,.35),night);gl_FragColor=vec4(col,1.);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
      }`});
    if(this.location === 'mumbai') return;
    const ocean=new T.Mesh(new T.PlaneGeometry(3600,3600),this.oceanMaterial);ocean.rotation.x=-Math.PI/2;ocean.position.y=-1.15;this.scene.add(ocean);
    // A layered headland and a small lighthouse across the water.
    const rock=this.mat(0x7c8980);const hill=this.mat(0x657661);
    const terrain=new T.PlaneGeometry(1100,460,100,45);terrain.rotateX(-Math.PI/2);
    const vertices=terrain.attributes.position;
    for(let i=0;i<vertices.count;i++){
      const x=vertices.getX(i),z=vertices.getZ(i),ridge=Math.exp(-Math.pow((z+20)/140,2));
      const peaks=48+35*Math.sin(x*.012+.9)+25*Math.sin(x*.025+1.3)+17*Math.cos(x*.044);
      const edge=Math.max(0,1-Math.pow(Math.abs(x)/570,6));
      const h=peaks*ridge*edge+(Math.sin(x*.07+z*.021)*Math.cos(z*.057)*7+Math.sin(x*.15-z*.04)*3)*ridge;
      vertices.setY(i,Math.max(-5,h-8));
    }
    terrain.computeVertexNormals();this.mesh(terrain,hill,-140,0,-485);
    this.mesh(new T.SphereGeometry(30,14,8),rock,188,-15,-161);
    this.cylinder(2,3.8,23,188,12,-161,this.m.trim,16);this.cylinder(3,3,2,188,25,-161,this.m.dark,16);
    this.cylinder(1.8,1.8,3,188,27,-161,this.m.glass,16);this.cylinder(0,3.3,3,188,30,-161,this.m.tile,16);
    this.cylinder(3.4,3.4,.3,188,25,-161,this.m.trim,16);
  }
  ground() {
    this.box(184,3,260,-28,-1.53,-10,this.m.sand);
    this.box(184,.06,260,-28,-.03,-10,this.m.pavement);
    this.box(15,.04,258,-24,.008,-10,this.m.road);
    this.box(181,.04,14,-28,.01,40,this.m.road);
    for(let z=-134;z<116;z+=9){if(Math.abs(z-40)>12)this.box(.13,.01,4,-24,.035,z,this.m.stripe);}
    for(let x=-115;x<63;x+=9){if(Math.abs(x+24)>10)this.box(4,.01,.13,x,.04,40,this.m.stripe);}
    for(const z of [28,51])for(let x=-30;x<-17;x+=1.6)this.box(.8,.012,3.4,x,.04,z,this.m.stripe);
    for(const x of [-36,-12])for(let z=35;z<46;z+=1.6)this.box(3.4,.012,.8,x,.04,z,this.m.stripe);
    for(const x of [-32.2,-15.8]){this.box(.25,.18,166,x,.05,-56,this.m.trim);this.box(.25,.18,67,x,.05,85,this.m.trim);}
    this.box(.4,1.25,260,64,-.6,-10,this.m.cream);
    // Fine paving joints along the pedestrian waterfront.
    for(let x=38;x<=63;x+=3.5)this.box(.018,.006,259,x,.009,-10,this.m.sand);
    for(let z=-139;z<120;z+=3.5)this.box(26,.006,.018,51,.01,z,this.m.sand);
  }
  sign(text, x,y,z,w=5,h=.85,rotation=0,background='#254544',color='#f4e8cf') {
    const tex=this.canvasTexture((c,cw,ch)=>{c.fillStyle=background;c.fillRect(0,0,cw,ch);c.fillStyle=color;c.textAlign='center';c.textBaseline='middle';c.font=`500 ${Math.min(ch*.46,cw/(text.length*.72))}px Georgia`;c.fillText(text,cw/2,ch/2);},1024,192);
    const mat=new T.MeshStandardMaterial({map:tex,roughness:.8});
    this.box(w,h,.08,x,y,z,mat,rotation);
  }
  building(x,z,w,d,h,material,shop,front='east') {
    this.box(w,h,d,x,h/2,z,material);this.obstacle(x,z,w+.05,d+.05);
    this.box(w+.4,.35,d+.4,x,h-.2,z,this.m.trim);
    this.box(w+.1,.65,d+.1,x,.33,z,this.m.cream);
    this.box(w+.25,.25,d+.25,x,3.5,z,this.m.trim);
    this.box(w+.45,.25,d+.45,x,h+.14,z,this.m.trim);
    this.box(w-.7,.15,d-.7,x,h+.28,z,this.m.tile);
    const east=x+w/2, south=z+d/2;
    for(let level=4.7;level<h-1.4;level+=3.25){
      for(let zz=z-d/2+2.2;zz<z+d/2-1;zz+=3.6){
        this.box(.15,2,1.55,east+.08,level,zz,this.m.dark);this.box(.17,1.8,1.36,east+.17,level,zz,this.m.glass);
        this.box(.2,1.88,.06,east+.28,level,zz,this.m.trim);
        for(const side of [-1,1])this.box(.18,2,.43,east+.18,level,zz+side*1.03,this.m.sage);
        this.box(.58,.15,2.1,east+.18,level-1.1,zz,this.m.trim);
        if(level<8){this.box(1.4,.16,2.25,east+.6,level-1.15,zz,this.m.cream);this.box(.08,.08,2.2,east+1.25,level-.35,zz,this.m.dark);
          for(let j=-1;j<=1;j+=.25)this.box(.05,.8,.035,east+1.25,level-.77,zz+j,this.m.dark);}
      }
      for(let xx=x-w/2+2;xx<x+w/2-1;xx+=3.6){
        this.box(1.65,2,.15,xx,level,south+.09,this.m.dark);this.box(1.43,1.8,.15,xx,level,south+.18,this.m.glass);
        this.box(.065,1.85,.08,xx,level,south+.3,this.m.trim);this.box(2,.13,.5,xx,level-1.1,south+.13,this.m.trim);
      }
    }
    if(front==='east'){
      for(let zz=z-d/2+2;zz<z+d/2;zz+=3.6){this.box(.12,2.7,2.5,east+.08,1.55,zz,this.m.dark);this.box(.14,2.4,2.24,east+.17,1.58,zz,this.m.glass);this.box(.18,2.5,.07,east+.26,1.57,zz,this.m.trim);}
      if(shop){this.sign(shop,east+.28,3,z,Math.min(d-1,9),.64,Math.PI/2);this.awning(east+1.2,z,d-1);}
    }else{
      for(let xx=x-w/2+2;xx<x+w/2;xx+=3.8){this.box(2.6,2.75,.12,xx,1.5,south+.12,this.m.dark);this.box(2.3,2.45,.14,xx,1.5,south+.22,this.m.glass);}
      if(shop)this.sign(shop,x,3,south+.3,Math.min(w-1,9),.64);
    }
    this.box(2.8,1.2,2.4,x-2,h+.85,z-2,this.m.cream);
    for(let i=0;i<3;i++)this.box(2.5,.05,.12,x-2,h+.7+i*.2,z-.76,this.m.dark);
    this.cylinder(.08,.08,3,x+2,h+1.6,z+1,this.m.dark);
  }
  awning(x,z,width) {
    this.box(2.5,.12,width,x,2.65,z,this.m.sage);
    for(let zz=z-width/2;zz<z+width/2;zz+=.8){this.box(2.55,.04,.35,x,2.73,zz+.2,this.m.trim);this.box(.08,.3,.35,x+1.25,2.52,zz+.2,this.m.trim);}
    this.box(.1,.32,width,x+1.24,2.49,z,this.m.sage);
    for(const zz of [z-width/2,z+width/2])this.cylinder(.035,.035,2.65,x+1.2,1.32,zz,this.m.dark,6);
  }
  neighborhood() {
    this.building(14,14,20,19,10.7,this.m.cream,'CAFÉ LUMA');
    this.building(13,-15,22,21,14,this.m.peach,'CASA AZUL');
    this.building(14,-48,20,23,10.7,this.m.sage,'LIVRARIA');
    this.building(11,-83,25,22,17.3,this.m.cream,'PORTO SOL');
    this.building(9,-118,27,18,14,this.m.blue,'ATELIER');
    this.building(12,77,22,31,14,this.m.peach,'MERCADO');
    this.building(-53,10,25,25,14,this.m.sage,'FLORISTA','south');
    this.building(-85,11,25,22,10.7,this.m.peach,'PADARIA','south');
    this.building(-52,-31,25,29,20.5,this.m.cream);
    this.building(-87,-32,25,28,17.2,this.m.blue);
    this.building(-53,-76,25,30,14,this.m.peach);
    this.building(-87,-80,25,34,20.5,this.m.cream);
    this.building(-53,-121,25,25,17.2,this.m.sage);
    this.building(-88,-121,25,25,14,this.m.peach);
    // Café tables and parasols face the sea, leaving the promenade clear.
    for(const z of [7,16,24]){this.table(30,z);this.umbrella(31.2,z+1.3,z===16?this.m.sage:this.m.trim);}
    for(const z of [-26,-7,31,58,97])this.planter(28,z);
    this.sign('PORTO SOL',38,2.4,54,3.3,.6,0,'#294442');
    this.box(.12,2.7,.12,36.5,1.35,54,this.m.dark);this.box(.12,2.7,.12,39.5,1.35,54,this.m.dark);
  }
  table(x,z) {
    this.cylinder(.7,.7,.09,x,.79,z,this.m.teak,20);this.cylinder(.05,.08,.76,x,.38,z,this.m.dark,8);
    this.cylinder(.34,.34,.06,x,.035,z,this.m.dark,12);
    for(const dz of [-1.2,1.2]){this.box(.62,.08,.6,x,.48,z+dz,this.m.teak);this.box(.64,.7,.065,x,.8,z+dz+Math.sign(dz)*.25,this.m.teak);
      for(const dx of [-.23,.23])for(const q of [-.2,.2])this.box(.045,.47,.045,x+dx,.23,z+dz+q,this.m.dark);this.obstacle(x,z+dz,.65,.6);}
    this.cylinder(.07,.09,.2,x,.93,z,this.m.trim,8);this.obstacle(x,z,1.4,1.4);
  }
  umbrella(x,z,mat) {
    this.cylinder(.035,.035,2.8,x,1.4,z,this.m.teak,8);
    const cone=new T.ConeGeometry(2,.55,8,1,true);this.mesh(cone,mat,x,2.85,z);
    this.cylinder(.07,.07,.16,x,3.2,z,this.m.teak,8);
  }
  planter(x,z) {
    this.cylinder(.65,.5,.75,x,.375,z,this.m.terra,12);
    this.mesh(new T.SphereGeometry(.7,10,7),this.m.leaves,x,1.15,z);
    for(let i=0;i<9;i++){const angle=i*2.4;this.mesh(new T.IcosahedronGeometry(.16,0),this.m.flower,x+Math.cos(angle)*.55,1.4+Math.sin(i)*.2,z+Math.sin(angle)*.55);}
    this.obstacle(x,z,1.15,1.15);
  }
  bench(x,z,rotation=0) {
    const group=new T.Group();
    const add=(w,h,d,xx,y,zz,mat)=>{const g=new T.BoxGeometry(w,h,d);g.translate(xx,y,zz);g.rotateY(rotation);this.mesh(g,mat,x,0,z);};
    for(let i=0;i<5;i++)add(2.8,.08,.11,0,.55,-.27+i*.14,this.m.teak);
    for(let i=0;i<3;i++)add(2.8,.13,.07,0,.85+i*.18,.36,this.m.teak);
    for(const xx of [-1,1]){add(.09,.6,.62,xx,.3,0,this.m.dark);add(.07,1.1,.07,xx,.65,.37,this.m.dark);}
    this.obstacle(x,z,rotation? .85:2.8,rotation?2.8:.85);
  }
  palm(x,z,height=7) {
    this.cylinder(.18,.32,height,x,height/2,z,this.m.wood,9);
    for(let i=0;i<12;i++){
      const angle=i*Math.PI*2/12;const points=[];
      for(let j=0;j<=7;j++){const t=j/7;points.push(new T.Vector3(Math.sin(angle)*t*3.5,height+Math.sin(t*Math.PI)*1.2-t*.8,Math.cos(angle)*t*3.5));}
      const positions=[],uvs=[];
      for(let j=0;j<points.length;j++){const width=Math.sin(j/7*Math.PI)*.48;for(const side of [-1,1]){positions.push(points[j].x+Math.cos(angle)*width*side,points[j].y,points[j].z-Math.sin(angle)*width*side);uvs.push(j/7,(side+1)/2);}}
      const indices=[];for(let j=0;j<7;j++){const k=j*2;indices.push(k,k+1,k+2,k+1,k+3,k+2);}
      const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(positions,3));geo.setAttribute('uv',new T.Float32BufferAttribute(uvs,2));geo.setIndex(indices);geo.computeVertexNormals();this.m.palm.side=T.DoubleSide;this.mesh(geo,this.m.palm,x,0,z);
    }
    this.obstacle(x,z,.65,.65);
  }
  lamp(x,z) {
    this.cylinder(.055,.12,4.4,x,2.2,z,this.m.dark,8);this.box(.55,.08,.55,x,4.45,z,this.m.dark);
    this.box(.3,.55,.3,x,4.1,z,this.m.lamp);this.cylinder(.2,.28,.12,x,.08,z,this.m.dark,8);
    const light=new T.PointLight(0xffd5a1,0,12,2);light.position.set(x,3.8,z);light.visible=false;this.scene.add(light);this.lights.push(light);
    this.obstacle(x,z,.3,.3);
  }
  waterfront() {
    for(let z=-127;z<114;z+=19){if(Math.abs(z-40)>9){this.palm(40,z,6.5+this.random()*1.8);this.box(2.5,.07,2.5,40,.025,z,this.m.sand);}this.lamp(60,z);}
    for(let z=-120;z<112;z+=26){if(Math.abs(z+36)>12)this.bench(58,z,Math.PI/2);}
    for(let z=-137;z<120;z+=4){if(z>-45&&z<-28)continue;this.cylinder(.035,.035,.9,63.5,.45,z,this.m.dark,6);this.box(.035,.04,3.9,63.5,.9,z+1.95,this.m.dark);}
    // Pier sits at the same walking elevation as the promenade.
    this.box(53,.48,12,90.5,-.26,-36,this.m.wood);
    for(let x=65;x<117;x+=.6)this.box(.54,.06,11.7,x,-.01,-36,this.m.teak);
    for(let x=68;x<=116;x+=6){for(const z of [-41.5,-30.5]){this.cylinder(.12,.14,2.6,x,-.45,z,this.m.wood,8);this.box(5.9,.07,.07,x-3,.77,z,this.m.trim);}}
    this.bench(105,-39.8);this.bench(114,-36,Math.PI/2);
    this.lamp(87,-40);this.lamp(110,-31.4);
    this.sign('THE OLD PIER',69,1.25,-30.3,3.4,.5);this.box(.08,1.3,.08,67.5,.65,-30.3,this.m.dark);
    // Sailboats, moored beyond the walking boundary.
    for(let i=0;i<5;i++){
      const x=85+i*15,z=-64-i%2*12;
      const hull=new T.SphereGeometry(1,16,8);hull.scale(2,.85,5.7);this.mesh(hull,this.m.trim,x,-.75,z,.15*i);
      this.box(2,.8,3.4,x,.2,z,this.m.teak);this.cylinder(.055,.07,9,x,4.5,z,this.m.trim,8);
      const sail=new T.BufferGeometry();sail.setAttribute('position',new T.Float32BufferAttribute([0,1,0,0,8.7,0,0,1,4.3],3));sail.setAttribute('uv',new T.Float32BufferAttribute([0,0,0,1,1,0],2));sail.computeVertexNormals();this.m.white.side=T.DoubleSide;this.mesh(sail,this.m.white,x,0,z);
    }
  }
  garden() {
    this.box(65,.045,60,-69,.007,83,this.m.grass);
    this.box(5,.05,60,-57,.015,83,this.m.pavement);this.box(65,.05,5,-69,.017,70,this.m.pavement);
    for(const [x,z] of [[-43,61],[-43,90],[-73,60],[-87,62],[-78,90],[-94,94],[-42,106],[-91,110],[-73,109],[-107,76],[-103,55],[-104,106],[-6,105],[33,-119],[33,-81]]){
      this.treePositions.push({x,z,scale:5+this.random()*3});this.obstacle(x,z,.8,.8);
    }
    this.bench(-62,62,Math.PI/2);this.bench(-52,83,-Math.PI/2);this.bench(-80,73);
    this.sign('JARDIM DO SOL',-57,1.9,54.5,5,.8);this.box(.12,2,.12,-59.2,1,54.5,this.m.dark);this.box(.12,2,.12,-54.8,1,54.5,this.m.dark);
    this.lamp(-53,58);this.lamp(-61,98);
    // Shallow ornamental fountain, kept outside the pedestrian path.
    this.cylinder(3.5,3.7,.5,-80,.25,83,this.m.cream,32);this.cylinder(3.15,3.15,.05,-80,.53,83,this.m.glass,32);
    this.cylinder(.3,.55,1.8,-80,1,83,this.m.trim,16);this.cylinder(1.5,.2,.35,-80,1.8,83,this.m.trim,24);this.obstacle(-80,83,7.4,7.4);
  }
  car(x,z,color,rotation=0) {
    const paint=this.mat(color,.28,.4);
    const add=(w,h,d,xx,y,zz,mat)=>{const geo=new T.BoxGeometry(w,h,d);geo.translate(xx,y,zz);geo.rotateY(rotation);this.mesh(geo,mat,x,0,z);};
    add(1.8,.55,4,0,.64,0,paint);add(1.64,.65,2.05,0,1.19,-.2,this.m.glass);add(1.76,.12,2.1,0,1.55,-.2,paint);
    for(const xx of [-.83,.83]){add(.08,.75,.13,xx,1.13,-1.2,paint);add(.08,.75,.13,xx,1.13,.75,paint);add(.09,.65,.12,xx,1.16,-.1,paint);}
    add(1.72,.13,.15,0,.47,2.06,this.m.chrome);add(1.72,.13,.15,0,.47,-2.06,this.m.chrome);
    for(const xx of [-.62,.62]){add(.4,.18,.08,xx,.78,-2.02,this.m.lamp);add(.35,.13,.08,xx,.77,2.03,this.m.tile);}
    for(const xx of [-.9,.9])for(const zz of [-1.3,1.3]){
      const geo=new T.CylinderGeometry(.39,.39,.22,16);geo.rotateZ(Math.PI/2);geo.translate(xx,.39,zz);geo.rotateY(rotation);this.mesh(geo,this.m.tire,x,0,z);
      const hub=new T.CylinderGeometry(.21,.21,.24,12);hub.rotateZ(Math.PI/2);hub.translate(xx,.39,zz);hub.rotateY(rotation);this.mesh(hub,this.m.chrome,x,0,z);
    }
    this.obstacle(x,z,rotation?4.3:2,rotation?2:4.3);
  }
  details() {
    this.car(-29,13,0xb6c9c0);this.car(-29,-5,0xd9b889);this.car(-19,-54,0x849ba8);this.car(-19,82,0xcc795a,Math.PI);this.car(-80,35,0xeee6d3,Math.PI/2);
    for(const [x,z] of [[-13,15],[-13,-49],[-36,-70],[-36,89]])this.lamp(x,z);
    for(let z=-116;z<100;z+=28){this.box(.45,.9,.45,35,.45,z,this.m.dark);this.box(.48,.07,.48,35,.93,z,this.m.teak);}
    for(let i=0;i<9;i++){
      const bird=new T.Group();const material=new T.MeshBasicMaterial({color:0xe1dcd0,side:T.DoubleSide});
      for(const side of [-1,1]){const wing=new T.Mesh(new T.PlaneGeometry(1.05,.25),material);wing.rotation.x=-Math.PI/2;wing.position.x=side*.5;bird.add(wing);}
      this.scene.add(bird);this.birds.push({bird,phase:i*1.9,radius:30+i*4});
    }
  }
  async loadTrees() {
    try{
      const [gltf,alpha]=await Promise.all([new GLTFLoader(this.manager).loadAsync(ROOT+'hd/tree/tree-optimized.gltf'),this.loader.loadAsync(ROOT+'hd/tree/textures/island_tree_01_leaves_alpha_1k.png')]);
      gltf.scene.updateMatrixWorld(true);const bounds=new T.Box3().setFromObject(gltf.scene);const size=bounds.getSize(new T.Vector3()),center=bounds.getCenter(new T.Vector3());
      const normal=new T.Matrix4().makeScale(1/size.y,1/size.y,1/size.y).multiply(new T.Matrix4().makeTranslation(-center.x,-bounds.min.y,-center.z));
      gltf.scene.traverse(o=>{if(!o.isMesh)return;const geo=o.geometry.clone().applyMatrix4(new T.Matrix4().multiplyMatrices(normal,o.matrixWorld));
        const prepare=m=>{m=m.clone();m.side=T.DoubleSide;if(m.name.includes('leaves')){m.alphaMap=alpha;m.alphaTest=.45;m.transparent=false;}m.roughness=.9;return m;};
        const materials=Array.isArray(o.material)?o.material.map(prepare):prepare(o.material);
        const mesh=new T.InstancedMesh(geo,materials,this.treePositions.length);const obj=new T.Object3D();
        this.treePositions.forEach((p,i)=>{obj.position.set(p.x,0,p.z);obj.scale.setScalar(p.scale);obj.rotation.y=i*1.8;obj.updateMatrix();mesh.setMatrixAt(i,obj.matrix);});
        mesh.castShadow=true;mesh.receiveShadow=true;this.scene.add(mesh);
      });
    }catch(error){console.warn('Detailed trees unavailable:',error.message);}
  }
  loadPeople() {
    for(const [variant,prefix] of [['traveler-man','m002'],['traveler-woman','f001']]){
      const textures={};for(const part of ['body','head','opacity']){const t=this.loader.load(`${ROOT}people/${prefix}_${part}_color.webp`);t.flipY=true;t.colorSpace=T.SRGBColorSpace;t.anisotropy=4;textures[part]=t;}
      new GLTFLoader(this.manager).load(`${ROOT}people/${variant}.glb`,gltf=>{
        gltf.scene.traverse(o=>{if(!o.isMesh)return;const prep=old=>{const part=old.name.includes('opacity')?'opacity':old.name.includes('head')?'head':'body';return new T.MeshStandardMaterial({map:textures[part],roughness:.88,side:part==='opacity'?T.DoubleSide:T.FrontSide,alphaTest:part==='opacity'?.45:0});};o.material=Array.isArray(o.material)?o.material.map(prep):prep(o.material);o.castShadow=true;o.receiveShadow=true;o.frustumCulled=false;});
        const clip=gltf.animations.find(a=>a.name==='Walk');
        this.questWorld.addCharacter(gltf.scene,clip,prefix);
        if(prefix==='m002') { this.cyclist=new Cyclist(gltf.scene);this.remoteCyclist=new Cyclist(gltf.scene);this.remoteCyclist.baseColor=0x6e83bd;this.remoteCyclist.group.visible=false;this.scene.add(this.cyclist.group,this.remoteCyclist.group); }
        for(let i=0;i<3;i++){const model=clone(gltf.scene);model.scale.setScalar(.01);this.scene.add(model);const mixer=new T.AnimationMixer(model);if(clip)mixer.clipAction(clip).play();mixer.setTime(i*.4);
          this.walkers.push({model,mixer,phase:i*1.7+(prefix==='f001'?2.2:0),lane:prefix==='f001'?49:45,range:40+i*12});}
      },undefined,error=>console.warn('Pedestrian model unavailable:',error.message));
    }
  }
  setRemote(state,carrier) {
    this.remoteCarrier=carrier;
    if(!state){this.remoteState=null;this.remotePose=null;if(this.remoteCyclist)this.remoteCyclist.group.visible=false;return;}
    this.remoteState=state;if(!this.remotePose)this.remotePose={...state};
  }
  updateRemote(dt) {
    if(!this.remoteCyclist||!this.remoteState)return;
    const target=this.remoteState,p=this.remotePose,k=1-Math.exp(-14*dt);
    if(Math.hypot(p.x-target.x,p.z-target.z)>15)Object.assign(p,target);
    else{p.x+=(target.x-p.x)*k;p.z+=(target.z-p.z)*k;p.yaw+=Math.atan2(Math.sin(target.yaw-p.yaw),Math.cos(target.yaw-p.yaw))*k;p.walked+=(target.walked-p.walked)*k;}
    this.remoteCyclist.group.visible=true;this.remoteCyclist.update(p);this.remoteCyclist.setQuestStage(this.questStage,this.remoteCarrier===target.id);
  }
  setNight(night) {
    this.night=night;this.skyMaterial.uniforms.night.value=night?1:0;this.oceanMaterial.uniforms.night.value=night?1:0;
    this.sun.intensity=night?.25:3.2;this.sun.color.set(night?0x9ab9eb:0xffdeb0);this.ambient.intensity=night?.48:1.65;
    this.scene.environmentIntensity=night?.1:.38;this.scene.fog.color.set(night?0x192b41:0xd3bca0);
    this.m.lamp.emissiveIntensity=night?4:1.5;this.lights.forEach(l=>{l.intensity=night?35:0;l.visible=false;});
    this.m.glass.emissive.set(night?0xb27c3b:0);this.m.glass.emissiveIntensity=night?.3:0;
  }
  update(time,dt,camera) {
    this.questWorld.update(time,this.questStage);
    this.cyclist?.setQuestStage(this.questStage,this.carryParcel);
    
    this.oceanMaterial.uniforms.time.value=time;this.sky.position.copy(camera.position);
    // Stabilize the moving shadow frustum to avoid shimmering at walking speed.
    const sx=Math.round(camera.position.x/2)*2,sz=Math.round(camera.position.z/2)*2;
    this.sun.position.set(sx+95,100,sz-65);this.sun.target.position.set(sx,0,sz);this.sun.target.updateMatrixWorld();
    if(this.night){const nearest=this.lights.map(light=>({light,d:light.position.distanceToSquared(camera.position)})).sort((a,b)=>a.d-b.d).slice(0,5);const active=new Set(nearest.map(item=>item.light));this.lights.forEach(light=>{light.visible=active.has(light);});}
    for(const w of this.walkers){w.phase+=dt*.016;const angle=w.phase;const x=w.lane+Math.cos(angle)*1.5,z=-10+Math.sin(angle)*w.range;
      w.model.position.set(this.location==='mumbai'?2.8+Math.cos(angle)*.25:x,0,z);w.model.rotation.y=Math.atan2(-Math.sin(angle)*1.5,Math.cos(angle)*w.range);w.mixer.update(dt*.85);}
    for(const {bird,phase,radius} of this.birds){const a=time*.065+phase;bird.position.set(95+Math.cos(a)*radius,16+Math.sin(a*2)*3+phase,Math.sin(a)*radius-25);bird.rotation.y=-a;
      bird.children[0].rotation.z=Math.sin(time*3+phase)*.2;bird.children[1].rotation.z=-Math.sin(time*3+phase)*.2;}
  }
}
