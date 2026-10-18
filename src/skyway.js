import {createHighlands} from './highland-terrain.js';
import * as T from 'three';
import {challengeGeometry} from './challenge-pickups.js';
export const SKYWAY_GATE={x:55,z:-380,radius:9};
export const SKYWAY_POINTS=[[55,.2,-380],[72,12,-450],[20,65,-650],[-120,150,-900],[-420,210,-1400],[-1100,250,-1750],[-1800,320,-1400],[-2200,260,-700],[-1800,180,-150],[-1200,130,-500],[-700,95,-750],[-330,80,-530],[-100,35,-460],[28,8,-420]];
export const CHECKPOINT_METERS=750;
export function rideDifficulty(checkpoint){const tier=Math.min(7,Math.max(0,Math.floor(checkpoint)));return {tier,speed:12+tier*2,spacing:Math.max(32,46-tier*2),doubleBarrierChance:Math.min(1,tier/4)};}
export function rideRegion(distance,length){const u=(distance%length)/length;return u<.16?'Sea crossing':u<.36?'Mountain ascent':u<.58?'Summit ridge':u<.8?'Highland descent':'Coastal return';}
export const SKYWAY_ENTRY_BLOCK={minX:44,maxX:66,minZ:-402,maxZ:-376};
export function keepOutsideRamp(p){if(p.x>SKYWAY_ENTRY_BLOCK.minX-1&&p.x<SKYWAY_ENTRY_BLOCK.maxX+1&&p.z>SKYWAY_ENTRY_BLOCK.minZ&&p.z<SKYWAY_ENTRY_BLOCK.maxZ+1){p.z=SKYWAY_ENTRY_BLOCK.maxZ+1.1;p.y=0;p.speed=0;p.vx=p.vz=p.vy=0;}}
export function createRide(random=Math.random,upgrades={}){const maxLives=upgrades.hearts===4?4:3;return {distance:0,lane:1,lanePosition:1,laneVelocity:0,speed:0,jump:0,vy:0,lives:maxLives,maxLives,coins:0,gems:0,score:0,shield:!!upgrades.shield,handling:!!upgrades.handling,bonusMultiplier:upgrades.bonus===2?2:1,checkpoint:0,bonusPoints:0,immune:0,items:[],next:32,running:true,random};}
export function rideInput(s,key){if(!s.running)return;if(['KeyA','ArrowLeft'].includes(key))s.lane=Math.max(0,s.lane-1);if(['KeyD','ArrowRight'].includes(key))s.lane=Math.min(2,s.lane+1);if(key==='Space'&&s.jump===0&&s.vy===0)s.vy=5.2;}
export function stepRide(s,delta,input={}){
  if(!s.running)return;
  const dt=Math.max(0,Math.min(.05,delta)),old=s.distance;
  const target=input.brake?4:rideDifficulty(s.checkpoint).speed,acceleration=input.brake?18:4;
  s.speed+=Math.sign(target-s.speed)*Math.min(Math.abs(target-s.speed),acceleration*dt);
  const steps=Math.max(1,Math.ceil(dt*120)),h=dt/steps;
  for(let i=0;i<steps;i++){
    s.distance+=s.speed*h;
    const acceleration=(s.lane-s.lanePosition)*(s.handling?70:55)-s.laneVelocity*(s.handling?17:15);
    s.laneVelocity+=acceleration*h;s.lanePosition+=s.laneVelocity*h;
    s.jump=Math.max(0,s.jump+s.vy*h-9.81*h*h/2);s.vy-=9.81*h;if(!s.jump&&s.vy<0)s.vy=0;
  }
  s.immune=Math.max(0,s.immune-dt);
  while(s.next<s.distance+190){
    const lane=Math.floor(s.random()*3),row=s.next,difficulty=rideDifficulty(Math.floor(row/CHECKPOINT_METERS));
    // Every row guarantees an unobstructed lane; rows remain >1s apart at top speed.
    const rest=row%CHECKPOINT_METERS<55;
    const double=s.random()<difficulty.doubleBarrierChance;
    for(let l=0;l<3;l++)if(!rest&&l!==lane&&(double||l===(lane+1)%3))s.items.push({type:'barrier',lane:l,d:row});
    for(let n=0;n<4;n++)s.items.push({type:'coin',lane,d:row+3+n*2});
    const kind=Math.floor(row/32)%5;
    if(kind===0||kind===2)s.items.push({type:kind===0?'shield':'gem',lane,d:row+14});
    s.next+=difficulty.spacing;
  }
  for(const item of s.items){
    if(item.hit||item.d<old-.8||item.d>s.distance+.8||Math.abs(item.lane-s.lanePosition)>.38)continue;
    item.hit=true;
    if(item.type==='coin')s.coins++;
    else if(item.type==='gem')s.gems++;
    else if(item.type==='shield')s.shield=true;
    else if(s.jump<1&&s.immune===0){if(s.shield)s.shield=false;else s.lives--;s.immune=1.5;if(!s.lives)s.running=false;}
  }
  s.items=s.items.filter(i=>i.d>s.distance-8);
  const checkpoint=Math.floor(s.distance/CHECKPOINT_METERS);
  if(s.running&&checkpoint>s.checkpoint){s.bonusPoints+=(checkpoint-s.checkpoint)*500*s.bonusMultiplier;s.checkpoint=checkpoint;s.lives=Math.min(s.maxLives,s.lives+1);s.shield=true;}
  s.score=Math.floor(s.distance*3)+s.coins*25+s.gems*200+s.bonusPoints;
}
export class Skyway {
  constructor(scene){
    this.curve=new T.CatmullRomCurve3(SKYWAY_POINTS.map(p=>new T.Vector3(...p)),true,'centripetal');this.length=this.curve.getLength();
    this.group=new T.Group();this.group.name='Skyway Ride: sea-to-mountain circuit';scene.add(this.group);
    const stone=new T.MeshStandardMaterial({color:0xb4a287,roughness:.93}),rail=new T.MeshStandardMaterial({color:0x376e6c,roughness:.55,metalness:.25});
    const positions=[],uv=[],indices=[],segments=512;
    for(let i=0;i<=segments;i++){const p=this.pose(i/segments*this.length,1);for(const side of [-1,1]){positions.push(p.x+Math.cos(p.yaw)*side*5.5,p.y-.08,p.z+Math.sin(p.yaw)*side*5.5);uv.push((side+1)*5.5/6,i/segments*this.length/6);}if(i<segments){const n=i*2;indices.push(n,n+1,n+2,n+1,n+3,n+2);}}
    const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(positions,3));geo.setAttribute('uv',new T.Float32BufferAttribute(uv,2));geo.setIndex(indices);geo.computeVertexNormals();
    const roadMaterial=new T.MeshStandardMaterial({color:0xc7c5b8,roughness:.92,side:T.DoubleSide});
    if(typeof document!=='undefined'){
      const surface=new T.TextureLoader().load('/assets/porto/plaster-color.jpg');surface.wrapS=surface.wrapT=T.RepeatWrapping;surface.colorSpace=T.SRGBColorSpace;surface.anisotropy=4;roadMaterial.map=surface;
    }
    stone.side=T.DoubleSide;const deck=new T.Mesh(geo,roadMaterial);deck.name='Skyway textured road';deck.receiveShadow=true;this.group.add(deck);
    for(const side of [-1,1]){
      // The circuit closes at the gate, but its railing must not: that closed
      // seam formed a fence across the pedestrian approach under the arch.
      const opening=30,points=[];
      for(let i=0;i<=segments;i++){const p=this.pose(opening+i/segments*(this.length-opening*2),1);points.push(new T.Vector3(p.x+Math.cos(p.yaw)*side*5.25,p.y+.65,p.z+Math.sin(p.yaw)*side*5.25));}
      const railing=new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3(points,false),segments,.12,4,false),rail);
      railing.name=`Skyway open entrance railing ${side}`;this.group.add(railing);
    }
    const supports=new T.InstancedMesh(new T.BoxGeometry(1,1,1),rail,56),dummy=new T.Object3D();
    supports.name='Skyway supports below deck';
    for(let i=0;i<56;i++){
      const distance=i/56*this.length,p=this.pose(distance,1);
      // The old column tops ended at centerline height, above the road skin.
      // Account for the full column footprint on slopes, plus deck clearance.
      const top=Math.min(p.y,this.pose(distance-2,1).y,this.pose(distance+2,1).y)-1;
      const height=Math.max(.1,top+4);dummy.position.set(p.x,-4+height/2,p.z);dummy.scale.set(1.2,height,1.2);dummy.updateMatrix();supports.setMatrixAt(i,dummy.matrix);
    }this.group.add(supports);
    const stripes=new T.InstancedMesh(new T.BoxGeometry(.09,.025,3),new T.MeshStandardMaterial({color:0xf4df9d}),1024);
    for(let i=0;i<512;i++)for(const side of [-1,1]){const p=this.pose(i/512*this.length,1);dummy.position.set(p.x+Math.cos(p.yaw)*side*1.65,p.y-.04,p.z+Math.sin(p.yaw)*side*1.65);dummy.rotation.set(0,-p.yaw,0);dummy.rotateX(p.slope);dummy.scale.set(1,1,1);dummy.updateMatrix();stripes.setMatrixAt(i*2+(side===1?1:0),dummy.matrix);}this.group.add(stripes);
    // Open semicircular portals, with no rectangular lintel across the sightline.
    const arches=new T.InstancedMesh(new T.TorusGeometry(5.5,.22,8,48,Math.PI),stone,9);
    const feet=new T.InstancedMesh(new T.CylinderGeometry(.22,.3,1.2,8),stone,18);
    arches.name='Open rounded Skyway arches';feet.name='Skyway arch feet';
    for(let i=0;i<9;i++){
      const p=this.pose((i===0?0:.18+i*.07)*this.length,1);
      if(i===0)p.yaw=0; // Face the city approach, not the loop's sideways seam.
      dummy.position.set(p.x,p.y+1.2,p.z);dummy.rotation.set(0,-p.yaw,0);dummy.scale.set(1,1,1);dummy.updateMatrix();arches.setMatrixAt(i,dummy.matrix);
      for(const [j,side] of [-1,1].entries()){dummy.position.set(p.x+Math.cos(p.yaw)*side*5.5,p.y+.6,p.z+Math.sin(p.yaw)*side*5.5);dummy.updateMatrix();feet.setMatrixAt(i*2+j,dummy.matrix);}
    }this.group.add(arches,feet);
    // The town keeps a visible entrance even while the elevated circuit is hidden.
    this.entrance=new T.Group();this.entrance.name='Skyway town entrance';scene.add(this.entrance);
    for(const [source,indices] of [[arches,[0]],[feet,[0,1]]])for(const index of indices){
      const mesh=new T.Mesh(source.geometry,stone);source.getMatrixAt(index,mesh.matrix);mesh.matrix.decompose(mesh.position,mesh.quaternion,mesh.scale);this.entrance.add(mesh);
    }

    this.group.add(createHighlands());
    const banners=new T.InstancedMesh(new T.BoxGeometry(1,1,1),new T.MeshStandardMaterial({roughness:.8}),60);
    banners.name='Route region pennants';const colors=[0x37a8b0,0xb28b50,0xe1e8e2,0x829866,0xe6a15b];
    for(let i=0;i<60;i++){const u=(i+.5)/60,p=this.pose(u*this.length,1),side=i%2?1:-1;dummy.position.set(p.x+Math.cos(p.yaw)*side*5.2,p.y+1.15,p.z+Math.sin(p.yaw)*side*5.2);dummy.rotation.set(0,-p.yaw,0);dummy.scale.set(.08,1.1,.75);dummy.updateMatrix();banners.setMatrixAt(i,dummy.matrix);banners.setColorAt(i,new T.Color(colors[u<.16?0:u<.36?1:u<.58?2:u<.8?3:4]));}this.group.add(banners);
    this.pools={};
    for(const type of ['coin','gem','shield','barrier']){
      const mesh=new T.InstancedMesh(challengeGeometry(type),new T.MeshStandardMaterial({vertexColors:true,roughness:.4,metalness:type==='coin'?.6:.1}),64);mesh.instanceMatrix.setUsage(T.DynamicDrawUsage);mesh.frustumCulled=false;mesh.count=0;this.group.add(mesh);this.pools[type]=mesh;
    }
    this.dummy=dummy;
  }
  pose(distance,lane){
    const u=((distance/this.length)%1+1)%1,p=this.curve.getPointAt(u),t=this.curve.getTangentAt(u),yaw=Math.atan2(t.x,-t.z),offset=(lane-1)*3.3;
    return {x:p.x+Math.cos(yaw)*offset,y:p.y,z:p.z+Math.sin(yaw)*offset,yaw,slope:Math.atan2(t.y,Math.hypot(t.x,t.z))};
  }
  update(s,time){
    for(const mesh of Object.values(this.pools))mesh.count=0;
    if(!s)return;
    for(const item of s.items){if(item.hit||item.d<s.distance-5)continue;const mesh=this.pools[item.type];if(mesh.count>=64)continue;
      const p=this.pose(item.d,item.lane),d=this.dummy;d.position.set(p.x,p.y+(item.type==='barrier'?.5:1.2+Math.sin(time*3+item.d)*.1),p.z);d.rotation.set(0,item.type==='barrier'?-p.yaw:time*2,0);if(item.type==='barrier')d.rotateX(p.slope);d.scale.setScalar(1);d.updateMatrix();mesh.setMatrixAt(mesh.count++,d.matrix);
    }
    for(const mesh of Object.values(this.pools))mesh.instanceMatrix.needsUpdate=true;
  }
}
