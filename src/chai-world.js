import * as T from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { MumbaiWorld } from './mumbai-world.js';
import { CHAI_ROADS,CHAI_POTHOLES,chaiTarget } from './chai.js';

export class ChaiWorld extends MumbaiWorld {
  constructor(scene,renderer,manager){
    super(scene,renderer,manager,'chai');
    this.traffic=[];this.animals=[];this.dynamicObstacles=[];this.streetTime=0;
    this.makeTraffic();this.makeAnimals();this.makeCup();
    const steamTexture=this.canvasTexture((c,w,h)=>{const g=c.createRadialGradient(w/2,h/2,0,w/2,h/2,w/2);g.addColorStop(0,'#ffffff75');g.addColorStop(1,'#ffffff00');c.fillStyle=g;c.fillRect(0,0,w,h);},64,64);
    this.steam=[];for(let i=0;i<8;i++){const puff=new T.Sprite(new T.SpriteMaterial({map:steamTexture,transparent:true,opacity:.25,depthWrite:false}));scene.add(puff);this.steam.push(puff);}
    this.marker=new T.Mesh(new T.TorusGeometry(.9,.045,8,40),new T.MeshBasicMaterial({color:0xffcf78}));
    this.marker.rotation.x=-Math.PI/2;this.marker.position.y=.08;scene.add(this.marker);
  }
  bake(){
    super.bake();
    // Camera collision uses solid footprints, avoiding raycasts through every shutter slat.
    const boxes=this.obstacles.map(b=>new T.BoxGeometry(b.maxX-b.minX,6,b.maxZ-b.minZ).translate((b.minX+b.maxX)/2,3,(b.minZ+b.maxZ)/2));
    const proxy=new T.Mesh(mergeGeometries(boxes),this.m.dark);boxes.forEach(g=>g.dispose());
    this.cameraColliders=[proxy];
  }
  materials(){
    super.materials();
    // Cracked, streaked render rather than flat painted blocks. Deterministic and local.
    const wall=this.canvasTexture((c,w,h)=>{
      c.fillStyle='#ccc4b2';c.fillRect(0,0,w,h);
      for(let i=0;i<18000;i++){const v=90+this.random()*130;c.fillStyle=`rgba(${v},${v-6},${v-14},.12)`;c.fillRect(this.random()*w,this.random()*h,2+this.random()*7,1+this.random()*5);}
      for(let i=0;i<130;i++){const x=this.random()*w,y=this.random()*h;c.fillStyle='#504a3b18';c.fillRect(x,y,1+this.random()*6,15+this.random()*100);}
      for(let i=0;i<22;i++){let x=this.random()*w,y=this.random()*h;c.beginPath();c.moveTo(x,y);for(let j=0;j<6;j++){x+=(this.random()-.5)*14;y+=this.random()*10;c.lineTo(x,y);}c.strokeStyle='#58534455';c.lineWidth=.7;c.stroke();}
      const damp=c.createLinearGradient(0,h*.7,0,h);damp.addColorStop(0,'#343b2700');damp.addColorStop(1,'#343b2770');c.fillStyle=damp;c.fillRect(0,0,w,h);
    },512,512);
    for(const key of ['cream','plaster','sage','peach','blue']){this.m[key].map=wall;this.m[key].roughness=.96;this.m[key].bumpMap=wall;this.m[key].bumpScale=.045;}
    this.m.wet=this.mat(0x62665f,.15,.2);this.m.rust=this.mat(0x785445,.85);this.m.orange=this.mat(0xc57735);
    this.m.tea=this.mat(0xa85c24,.22);this.m.dog=this.mat(0xa1835e);this.m.cow=this.mat(0xc3bfb0);
    this.m.road.color.set(0x99988f);this.m.pavement.color.set(0xb5b1a3);
  }
  ground(){
    this.box(184,3,260,-28,-1.53,-10,this.m.plaster);this.box(184,.06,260,-28,-.03,-10,this.m.pavement);
    for(const r of CHAI_ROADS)this.box(r.w,.05,r.d,r.x,.01,r.z,this.m.road);
    for(const [x,z,w,d] of [[-116,-10,1,255],[60,-10,1,255],[-28,-136,176,1],[-28,116,176,1]]){
      this.box(w,3,d,x,1.5,z,this.m.plaster);this.obstacle(x,z,w,d);
    }
    for(const p of CHAI_POTHOLES){
      const rim=new T.CircleGeometry(p.r,22);rim.rotateX(-Math.PI/2);this.mesh(rim,this.m.dark,p.x,.049,p.z);
      const puddle=new T.CircleGeometry(p.r*.8,22);puddle.rotateX(-Math.PI/2);this.mesh(puddle,this.m.wet,p.x,.053,p.z);
    }
    for(const x of [-90,-20,45])for(const z of [-108,-35,40,102]){
      for(let i=-4;i<=4;i++)this.box(.55,.008,3,x+i*.8,.046,z+5,this.m.stripe);
    }
  }
  neighborhood(){
    // Compact blocks leave wide boulevards, cross streets, and sidewalk space.
    for(const [x,w] of [[-56,48],[12,43]])for(const [z,d] of [[-73,51],[2,49],[71,40]]){
      this.home(x,z,w,d,9+this.random()*7,false);
      for(let zz=z-d/2+5;zz<z+d/2;zz+=10){
        for(const side of [-1,1]){
          const face=x+side*(w/2+.25);
          this.box(1.1,.12,4,face+side*.35,6,zz,this.m.rust);
          for(let q=-1.8;q<=1.8;q+=.3)this.box(.07,.8,.035,face+side*.8,6.45,zz+q,this.m.dark);
          // Hanging laundry and drainpipes, with individual awnings below.
          for(let k=0;k<3;k++)this.box(.035,.75,.5,face+side*.85,7,zz-1+k*.75,[this.m.peach,this.m.blue,this.m.trim][k]);
          this.cylinder(.045,.045,8,face,4,zz+2.5,this.m.rust,6);
          const awning=new T.BoxGeometry(2,.1,4.6);awning.rotateZ(side*.12);this.mesh(awning,this.m.sage,face+side*.7,3.2,zz);
        }
      }
      for(let i=0;i<3;i++){this.cylinder(.8,.8,1.6,x-5+i*5,10+1.7*i,z,this.m.dark,12);}
      // Street-facing end elevations break up the block into small businesses.
      for(let xx=x-w/2+4;xx<x+w/2-2;xx+=7){
        for(const side of [-1,1]){
          const face=z+side*(d/2+.12);
          this.box(4.8,2.5,.15,xx,1.3,face,this.m.shutter);
          for(let y=.2;y<2.6;y+=.18)this.box(4.8,.025,.18,xx,y,face,this.m.dark);
          this.box(5.3,.13,1.6,xx,3,face+side*.6,this.m.rust);
          this.box(1.5,1.8,.15,xx,5,face,this.m.glass);
          for(let k=-.6;k<=.6;k+=.3)this.box(.04,1.8,.18,xx+k,5,face+side*.06,this.m.dark);
        }
      }
    }
    // Dense background housing beyond the western sidewalk.
    for(let z=-114;z<108;z+=18)this.home(-109,z,11,15,7+this.random()*9,true);
    this.stall(-28,82);
    // Different colored shop panels give the main ride a readable street rhythm.
    for(let z=57;z<92;z+=9){
      this.box(.12,2.8,6,-32.05,1.45,z,z%2?this.m.turquoise:this.m.rose);
      this.box(.2,1.95,4.1,-31.9,1.2,z,this.m.shutter);
      for(let y=.3;y<2.2;y+=.17)this.box(.22,.02,4.1,-31.85,y,z,this.m.dark);
      this.box(1.6,.12,6.5,-31.5,3.1,z,this.m.orange);
    }
    this.sign('NIGHT SHIFT · MOTOR WORKS',35,3.7,-44,9,.8,0,'#2b494b');
    this.sign('PHOOL MARKET · FRESH FLOWERS',-81,3.3,-70,9,.8,-Math.PI/2,'#754353');
    // Recessed-looking open fronts with shelves, warm bulbs, and hanging signs.
    for(const [x,z] of [[12,96],[-56,49]]){
      this.box(9,2.7,.18,x,1.35,z-.85,this.m.dark);
      for(let y=.4;y<2.6;y+=.65){
        this.box(8,.1,.7,x,y,z-.6,this.m.wood);
        for(let k=0;k<12;k++)this.cylinder(.11,.12,.35,x-3.5+k*.6,y+.22,z-.4,[this.m.terra,this.m.marigold,this.m.sage][k%3],8);
      }
      this.box(9,.2,2,x,3,z,this.m.orange);
      for(const dx of [-3,0,3])this.mesh(new T.SphereGeometry(.08,10,6),this.m.lamp,x+dx,2.7,z+.7);
    }
    this.sign('IRANI BAKERY',12,3.6,96,11,.8,0,'#374f58');
    this.sign('APNA GENERAL STORES',-56,3.6,49,12,.75,0,'#6b473a');
    for(let i=0;i<7;i++){
      const z=-78+i*2.5;this.box(1.2,.65,1.9,-81,.4,z,this.m.wood);
      for(let k=0;k<5;k++)this.mesh(new T.SphereGeometry(.19,8,6),k%2?this.m.marigold:this.m.flower,-81+(k%2)*.35,.85,z-.65+k*.28);
    }
  }
  stall(x,z){
    this.box(2.8,1.1,4.5,x,.55,z,this.m.turquoise);this.box(3.1,.12,4.8,x,1.16,z,this.m.chrome);
    for(const dz of [-2.2,2.2])for(const dx of [-1.35,1.35])this.box(.06,3,.06,x+dx,1.5,z+dz,this.m.rust);
    this.box(3.8,.15,5.4,x,3,z,this.m.orange);
    for(let zz=z-2.5;zz<z+2.5;zz+=.35)this.box(3.8,.035,.05,x,3.1,zz,this.m.trim);
    this.sign('ASHA’S CHAI · चाय',x+1.95,2.55,z,4.8,.65,Math.PI/2,'#c87836','#fff4d4');
    this.sign('GINGER • MASALA • ₹10',x+1.47,.8,z,3.8,.4,Math.PI/2,'#155d53');
    this.cylinder(.45,.4,.65,x,1.53,z-1,this.m.chrome,24);
    this.cylinder(.5,.5,.05,x,1.9,z-1,this.m.dark,24);
    for(let i=0;i<8;i++)this.cylinder(.065,.05,.16,x+.7,1.3,z-.4+i*.23,this.m.terra,12);
    this.box(.7,1,.7,x,.5,z+3,this.m.marigold);this.obstacle(x,z,3,5);
  }
  garden(){
    for(const [x,z] of [[-99,84],[-99,12],[-99,-85],[-29,95],[-29,31],[-29,-45],[54,86],[54,10],[54,-79]]){
      this.treePositions.push({x,z,scale:11+this.random()*3});this.obstacle(x,z,1,1);
      this.box(2,.4,2,x,.2,z,this.m.plaster);
    }
  }
  details(){
    for(const [x,z] of [[-98,60],[-98,-15],[-28,55],[-28,-15],[53,60],[53,-20],[53,-95]])this.lamp(x,z);
    for(const x of [-98,53])for(let z=-108;z<100;z+=35){
      this.cylinder(.07,.11,7,x,3.5,z,this.m.plaster);
      for(const offset of [0,.18,.36])this.mesh(new T.TubeGeometry(new T.CatmullRomCurve3([new T.Vector3(x,7+offset,z),new T.Vector3(x,6.3+offset,z+17),new T.Vector3(x,7+offset,z+35)]),10,.018,4,false),this.m.wire);
    }
    for(let z=-96;z<98;z+=17){
      if(Math.abs(z-82)>8)this.scooter(-26,z,.2,this.m.shutter);
      this.scooter(51,z,-.35,z%2?this.m.rose:this.m.dark);
    }
    this.car(-96,-60,0xc1c5bd);this.car(51,-58,0xb5ae95);this.car(-96,73,0x646d68);
    for(let z=-95;z<100;z+=19){
      this.box(.7,.025,1.1,-24,.045,z,this.m.dark);
      for(let k=0;k<7;k++)this.box(.7,.026,.035,-24,.06,z-.45+k*.15,this.m.shutter);
      this.box(.65,.75,.65,-31,.4,z,this.m.wood);
    }
    // Pavement repairs and discarded paper stay flush with the ride surface.
    for(let i=0;i<70;i++){
      const x=[-90,-20,45][i%3]+(this.random()-.5)*9,z=-100+this.random()*200;
      this.box(.12+this.random()*.3,.008,.15+this.random()*.4,x,.052,z,this.m.trim,this.random()*3);
    }
  }
  actor(build){
    const batches=this.batches,obstacles=this.obstacles;this.batches=new Map();this.obstacles=[];
    build();const group=new T.Group();
    for(const [mat,geos] of this.batches){const mesh=new T.Mesh(mergeGeometries(geos),mat);mesh.castShadow=mesh.receiveShadow=true;group.add(mesh);geos.forEach(g=>g.dispose());}
    this.batches=batches;this.obstacles=obstacles;this.scene.add(group);return group;
  }
  car(x,z,color,rotation=0){
    const paint=this.mat(color,.3,.42);
    const part=(geo,mat,xx,y,zz)=>{geo.translate(xx,y,zz);geo.rotateY(rotation);this.mesh(geo,mat,x,0,z);};
    const rounded=(w,h,d,xx,y,zz,mat,r=.07)=>part(new RoundedBoxGeometry(w,h,d,2,r),mat,xx,y,zz);
    rounded(1.82,.55,4,0,.67,0,paint,.15);
    rounded(1.61,.64,2.15,0,1.22,.13,this.m.glass,.13);
    rounded(1.63,.12,2.12,0,1.56,.16,paint);
    rounded(1.78,.18,1.05,0,1,-1.39,paint,.06);
    for(const side of [-1,1]){
      for(const zz of [-.82,.15,1.07])rounded(.08,.65,.08,side*.8,1.23,zz,paint,.02);
      rounded(.035,.035,1.9,side*.91,.96,.12,this.m.chrome,.01);
      rounded(.04,.06,.22,side*.925,.87,.25,this.m.chrome,.01);
      rounded(.2,.13,.28,side*1.01,1.17,-.72,paint,.04);
      rounded(.52,.21,.09,side*.57,.85,-2.01,this.m.lamp,.035);
      rounded(.5,.16,.08,side*.6,.83,2.01,this.m.tile,.025);
      for(const zz of [-1.24,1.3]){
        const tire=new T.TorusGeometry(.3,.105,10,20);tire.rotateY(Math.PI/2);part(tire,this.m.tire,side*.88,.4,zz);
        const rim=new T.CylinderGeometry(.22,.22,.035,16);rim.rotateZ(Math.PI/2);part(rim,this.m.chrome,side*1.005,.4,zz);
        for(let k=0;k<5;k++){const spoke=new T.BoxGeometry(.04,.035,.38);spoke.rotateX(k*Math.PI/5);part(spoke,this.m.dark,side*1.025,.4,zz);}
      }
    }
    rounded(1.65,.13,.1,0,.48,-2.03,this.m.dark,.02);
    rounded(.62,.19,.045,0,.66,-2.075,this.m.trim,.015);
    for(let k=-3;k<=3;k++)rounded(.035,.12,.05,k*.1,.85,-2.055,this.m.chrome,.005);
    this.obstacle(x,z,rotation?4.3:2.1,rotation?2.1:4.3);
  }
  rickshaw(){
    const rounded=(w,h,d,x,y,z,mat)=>this.mesh(new RoundedBoxGeometry(w,h,d,2,.06),mat,x,y,z);
    rounded(1.5,.55,2.4,0,.65,.2,this.m.dark);
    rounded(1.5,.85,.18,0,1.2,-.85,this.m.marigold);
    rounded(1.38,.7,.07,0,1.55,-.96,this.m.glass);
    rounded(1.65,.22,2.55,0,2,.15,this.m.dark);
    rounded(1.48,.14,2.45,0,1.91,.15,this.m.marigold);
    rounded(1.5,.85,.14,0,1.2,1.35,this.m.dark);
    for(const x of [-.73,.73]){
      this.box(.06,1.25,.06,x,1.3,-.85,this.m.chrome);this.box(.06,1.25,.06,x,1.3,1.2,this.m.chrome);
      rounded(.1,.12,1.1,x,.55,.3,this.m.chrome);
    }
    rounded(1.25,.25,.7,0,.95,.8,this.m.tire);
    for(const [x,z] of [[0,-1],[-.76,.8],[.76,.8]]){const wheel=new T.TorusGeometry(.24,.09,8,18);wheel.rotateY(Math.PI/2);this.mesh(wheel,this.m.tire,x,.34,z);}
    for(const x of [-.48,.48])this.mesh(new T.SphereGeometry(.09,10,8),this.m.lamp,x,.95,-1.02);
  }
  makeTraffic(){
    const paths=[new T.CatmullRomCurve3([[-22,0,99],[-22,0,-105],[-87,0,-105],[-87,0,99]].map(p=>new T.Vector3(...p)),true,'catmullrom',.03),new T.CatmullRomCurve3([[42,0,-105],[42,0,99],[-16,0,99],[-16,0,-105]].map(p=>new T.Vector3(...p)),true,'catmullrom',.03)];
    for(let i=0;i<6;i++){
      const rickshaw=i%3===0;
      const group=this.actor(()=>{
        if(rickshaw)this.rickshaw();else this.car(0,0,[0xc6c6b9,0x495657,0xb2a99a][i%3]);
      });
      const path=paths[i%2];this.traffic.push({group,path,length:path.getLength(),progress:(i/6+.12)%1,speed:2.4+i*.27});
    }
  }
  animal(kind,x,z,index){
    const cow=kind==='cow',s=cow?1.6:.75,mat=cow?this.m.cow:this.m.dog;
    const group=this.actor(()=>{
      const ellipsoid=(rx,ry,rz,px,py,pz,material=mat)=>{const geo=new T.SphereGeometry(1,14,10);geo.scale(rx,ry,rz);this.mesh(geo,material,px,py,pz);};
      ellipsoid(.29*s,.37*s,.65*s,0,.83*s,0);ellipsoid(.2*s,.3*s,.26*s,0,1.12*s,-.63*s);
      ellipsoid(.14*s,.14*s,.24*s,0,1.03*s,-.86*s);ellipsoid(.12*s,.08*s,.07*s,0,1.02*s,-1.04*s,this.m.dark);
      for(const side of [-1,1]){
        ellipsoid(.16*s,.06*s,.13*s,side*.24*s,1.27*s,-.64*s);
        ellipsoid(.025*s,.027*s,.028*s,side*.16*s,1.22*s,-.82*s,this.m.dark);
        if(cow)this.cylinder(.015,.07,.23,side*.15*s,1.51*s,-.64*s,this.m.trim,8);
      }
      const tail=new T.CatmullRomCurve3([new T.Vector3(0,.9*s,.5*s),new T.Vector3(.1*s,.95*s,.8*s),new T.Vector3(.15*s,.7*s,1*s)]);
      this.mesh(new T.TubeGeometry(tail,8,.045*s,7,false),mat);
      if(cow){ellipsoid(.19,.28,.38,.34,1.3,.3,this.m.dark);ellipsoid(.2,.22,.28,-.35,1.1,-.25,this.m.dark);}
    });
    const legs=[];
    for(const side of [-1,1])for(const end of [-1,1]){
      const pivot=new T.Group();pivot.position.set(side*.18*s,.72*s,end*.4*s);group.add(pivot);
      const leg=new T.Mesh(new T.CapsuleGeometry(.06*s,.48*s,4,8),mat);leg.position.y=-.29*s;leg.castShadow=true;pivot.add(leg);legs.push(pivot);
      const hoof=new T.Mesh(new T.SphereGeometry(.075*s,8,6),this.m.dark);hoof.scale.set(1,.55,1.4);hoof.position.y=-.57*s;pivot.add(hoof);
    }
    this.animals.push({group,legs,x,z,s,kind,index});
  }
  makeAnimals(){
    this.animal('dog',-24,68,0);this.animal('dog',-91,-10,1);this.animal('cow',-96,20,2);this.animal('cow',49,-77,3);
    this.pigeons=[];
    for(let i=0;i<9;i++){
      const group=this.actor(()=>{const body=new T.SphereGeometry(.16,10,7);body.scale(.8,1,1.5);this.mesh(body,this.m.shutter,0,.22,0);this.mesh(new T.SphereGeometry(.09,8,6),this.m.dark,0,.39,-.15);this.mesh(new T.ConeGeometry(.03,.12,6),this.m.terra,0,.38,-.26);});
      this.pigeons.push({group,x:-17+(i%3)*.6,z:37+Math.floor(i/3)*.7,flight:0});
    }
  }
  makeCup(){
    this.cup=new T.Group();
    const glass=new T.MeshPhysicalMaterial({color:0xddd7bb,transparent:true,opacity:.32,roughness:.16,metalness:.05,side:T.DoubleSide,depthWrite:false});
    const shell=new T.Mesh(new T.CylinderGeometry(.12,.085,.28,24,1,true),glass);shell.position.y=.14;this.cup.add(shell);
    this.liquid=new T.Mesh(new T.CylinderGeometry(.108,.079,.22,24),this.m.tea);this.liquid.position.y=.12;this.cup.add(this.liquid);
    const rim=new T.Mesh(new T.TorusGeometry(.12,.008,8,24),this.m.chrome);rim.rotation.x=Math.PI/2;rim.position.y=.28;this.cup.add(rim);
    const tray=new T.Mesh(new T.BoxGeometry(.38,.025,.34),this.m.chrome);tray.position.y=-.02;this.cup.add(tray);
    this.cup.position.set(0,1.33,.52);this.cup.visible=false;
  }
  updateStreet(dt,player){
    this.streetTime+=dt;const time=this.streetTime;this.dynamicObstacles=[];
    const collider=(x,z,w,d)=>this.dynamicObstacles.push({minX:x-w/2,maxX:x+w/2,minZ:z-d/2,maxZ:z+d/2});
    for(const v of this.traffic){
      const pos=v.path.getPointAt(v.progress),tangent=v.path.getTangentAt(v.progress);
      const dx=player.x-pos.x,dz=player.z-pos.z,ahead=dx*tangent.x+dz*tangent.z;
      const close=ahead>-2&&ahead<9&&Math.abs(dx*tangent.z-dz*tangent.x)<3.2;
      const blocked=this.traffic.some(o=>o!==v&&o.group.position.distanceTo(pos)<6&&o.group.position.clone().sub(pos).dot(tangent)>0);
      if(!close&&!blocked)v.progress=(v.progress+dt*v.speed/v.length)%1;
      v.group.position.copy(v.path.getPointAt(v.progress));const dir=v.path.getTangentAt(v.progress);v.group.rotation.y=Math.atan2(-dir.x,-dir.z);
      const w=2.1*Math.abs(dir.z)+4.5*Math.abs(dir.x),d=4.5*Math.abs(dir.z)+2.1*Math.abs(dir.x);collider(v.group.position.x,v.group.position.z,w,d);
    }
    this.walkers.forEach((w,i)=>{
      // Sidewalk walkers and two slow crossings; all stay within the street corridors.
      const crossing=i%7===0;
      const x=crossing?-20+Math.sin(time*.13+i)*6:[-28.6,-81.5,36][i%3];
      const z=crossing?40+(i%2)*2:-78+((time*.65+i*15)%166);
      const near=Math.hypot(player.x-x,player.z-z)<2;
      if(!near){w.model.position.set(x,0,z);w.model.rotation.y=crossing?(Math.cos(time*.13+i)>0?Math.PI/2:-Math.PI/2):0;w.mixer.update(dt*.7);}
      collider(w.model.position.x,w.model.position.z,.55,.55);
    });
    for(const a of this.animals){
      const walking=a.kind==='dog',phase=time*.32+a.index;
      const x=a.x+(walking?Math.sin(phase)*1.3:Math.sin(time*.08)*.25),z=a.z+(walking?Math.cos(phase)*3:0);
      if(Math.hypot(player.x-x,player.z-z)>2.5){a.group.position.set(x,0,z);a.group.rotation.y=walking?Math.atan2(-Math.cos(phase)*1.3,Math.sin(phase)*3):.7;}
      a.legs.forEach((leg,i)=>leg.rotation.x=walking?Math.sin(time*4+(i%2)*Math.PI)*.28:0);
      collider(a.group.position.x,a.group.position.z,a.s*.9,a.s*1.5);
    }
    for(const b of this.pigeons){const near=Math.hypot(player.x-b.x,player.z-b.z)<5;b.flight+=((near?1:0)-b.flight)*Math.min(1,dt*2);b.group.position.set(b.x+Math.sin(time+b.x)*b.flight*2,b.flight*(2+Math.sin(time*2)*.3),b.z+b.flight*3);b.group.rotation.y=time*.3;}
  }
  update(time,dt,camera){
    // The base update supplies sky/shadows; street walkers are managed above.
    const walkers=this.walkers;this.walkers=[];super.update(time,dt,camera);this.walkers=walkers;
    if(this.cyclist&&this.cup.parent!==this.cyclist.group)this.cyclist.group.add(this.cup);
    this.steam?.forEach((puff,i)=>{const f=(time*.22+i/8)%1;puff.position.set(-28+Math.sin(f*6+i)*.2,1.95+f*1.3,81+Math.cos(f*5+i)*.2);puff.scale.setScalar(.15+f*.65);puff.material.opacity=(1-f)*.28;});
    if(this.delivery){
      const s=this.delivery,target=chaiTarget(s);this.marker.position.set(target.x,.09,target.z);this.marker.scale.setScalar(1+Math.sin(time*3)*.07);
      this.cup.visible=s.phase==='riding';this.liquid.scale.y=Math.max(.05,s.volume/100);this.liquid.position.y=.11*s.volume/100;
      this.liquid.rotation.z=Math.max(-.2,Math.min(.2,s.tilt));this.cup.rotation.z=s.tilt*.2;
    }
  }
  setNight(night){super.setNight(night);if(!night){this.sun.color.set(0xffebcd);this.sun.intensity=3;this.ambient.intensity=1.9;this.scene.fog.color.set(0xc7c5b9);}this.scene.fog.density=.0035;}
}
