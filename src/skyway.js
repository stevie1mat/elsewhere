import * as T from 'three';
export const SKYWAY_GATE={x:55,z:-380,radius:9};
export const SKYWAY_POINTS=[[55,.2,-380],[72,12,-450],[20,65,-550],[-120,150,-650],[-240,210,-760],[-380,190,-830],[-460,135,-680],[-330,80,-530],[-100,35,-460],[28,8,-420]];
export function createRide(random=Math.random){return {distance:0,lane:1,lanePosition:1,speed:12,jump:0,vy:0,lives:3,coins:0,gems:0,score:0,shield:false,immune:0,items:[],next:32,running:true,random};}
export function rideInput(s,key){if(!s.running)return;if(['KeyA','ArrowLeft'].includes(key))s.lane=Math.max(0,s.lane-1);if(['KeyD','ArrowRight'].includes(key))s.lane=Math.min(2,s.lane+1);if(key==='Space'&&s.jump===0&&s.vy===0)s.vy=7;}
export function stepRide(s,delta){
  if(!s.running)return;
  const dt=Math.max(0,Math.min(.05,delta)),old=s.distance;
  s.speed=Math.min(26,12+s.distance/500);s.distance+=s.speed*dt;
  s.lanePosition+=(s.lane-s.lanePosition)*(1-Math.exp(-15*dt));
  s.jump=Math.max(0,s.jump+s.vy*dt-9*dt*dt);s.vy-=18*dt;if(!s.jump&&s.vy<0)s.vy=0;
  s.immune=Math.max(0,s.immune-dt);
  while(s.next<s.distance+190){
    const lane=Math.floor(s.random()*3),row=s.next;
    // Every row guarantees an unobstructed lane; rows remain >1s apart at top speed.
    for(let l=0;l<3;l++)if(l!==lane)s.items.push({type:'barrier',lane:l,d:row});
    for(let n=0;n<4;n++)s.items.push({type:'coin',lane,d:row+3+n*2});
    const kind=Math.floor(row/32)%5;
    if(kind===0||kind===2)s.items.push({type:kind===0?'shield':'gem',lane,d:row+14});
    s.next+=32;
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
  s.score=Math.floor(s.distance*3)+s.coins*25+s.gems*200;
}
export class Skyway {
  constructor(scene){
    this.curve=new T.CatmullRomCurve3(SKYWAY_POINTS.map(p=>new T.Vector3(...p)),true,'centripetal');this.length=this.curve.getLength();
    this.group=new T.Group();this.group.name='Skyway Ride: sea-to-mountain circuit';scene.add(this.group);
    const stone=new T.MeshStandardMaterial({color:0xb4a287,roughness:.93}),rail=new T.MeshStandardMaterial({color:0x376e6c,roughness:.55,metalness:.25});
    const positions=[],indices=[],segments=320;
    for(let i=0;i<=segments;i++){const p=this.pose(i/segments*this.length,1);for(const side of [-1,1])positions.push(p.x+Math.cos(p.yaw)*side*5.5,p.y-.08,p.z+Math.sin(p.yaw)*side*5.5);if(i<segments){const n=i*2;indices.push(n,n+1,n+2,n+1,n+3,n+2);}}
    const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(positions,3));geo.setIndex(indices);geo.computeVertexNormals();
    stone.side=T.DoubleSide;const deck=new T.Mesh(geo,stone);deck.receiveShadow=true;this.group.add(deck);
    for(const side of [-1,1]){
      const points=[];for(let i=0;i<segments;i++){const p=this.pose(i/segments*this.length,1);points.push(new T.Vector3(p.x+Math.cos(p.yaw)*side*5.25,p.y+.65,p.z+Math.sin(p.yaw)*side*5.25));}
      this.group.add(new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3(points,true),segments,.12,4,true),rail));
    }
    const supports=new T.InstancedMesh(new T.BoxGeometry(1,1,1),rail,56),dummy=new T.Object3D();
    for(let i=0;i<56;i++){const p=this.pose(i/56*this.length,1);dummy.position.set(p.x,p.y/2-2,p.z);dummy.scale.set(1.2,p.y+4,1.2);dummy.updateMatrix();supports.setMatrixAt(i,dummy.matrix);}this.group.add(supports);
    const stripes=new T.InstancedMesh(new T.BoxGeometry(.09,.025,2),new T.MeshStandardMaterial({color:0xf4df9d}),320);
    for(let i=0;i<160;i++)for(const side of [-1,1]){const p=this.pose(i/160*this.length,1);dummy.position.set(p.x+Math.cos(p.yaw)*side*1.65,p.y-.04,p.z+Math.sin(p.yaw)*side*1.65);dummy.rotation.set(0,-p.yaw,0);dummy.rotateX(p.slope);dummy.scale.set(1,1,1);dummy.updateMatrix();stripes.setMatrixAt(i*2+(side===1?1:0),dummy.matrix);}this.group.add(stripes);
    const arches=new T.InstancedMesh(new T.BoxGeometry(1,1,1),stone,27);
    for(let i=0;i<9;i++){const p=this.pose((i===0?0:.18+i*.07)*this.length,1);for(let j=0;j<3;j++){const offset=j===2?0:(j===0?-4.8:4.8);dummy.position.set(p.x+Math.cos(p.yaw)*offset,p.y+(j===2?4.8:2.4),p.z+Math.sin(p.yaw)*offset);dummy.rotation.set(0,-p.yaw,0);dummy.scale.set(j===2?10.8:.7,j===2?.65:4.8,.8);dummy.updateMatrix();arches.setMatrixAt(i*3+j,dummy.matrix);}}this.group.add(arches);
    this.pools={};
    for(const [type,color,geometry] of [['coin',0xffce53,new T.TorusGeometry(.38,.1,6,12)],['gem',0x65ebed,new T.OctahedronGeometry(.5)],['shield',0x8be49b,new T.IcosahedronGeometry(.5,0)],['barrier',0xc66b42,new T.BoxGeometry(2.5,1,.65)]]){
      const mesh=new T.InstancedMesh(geometry,new T.MeshStandardMaterial({color,roughness:.5,metalness:type==='coin'?.5:0}),64);mesh.instanceMatrix.setUsage(T.DynamicDrawUsage);mesh.frustumCulled=false;mesh.count=0;this.group.add(mesh);this.pools[type]=mesh;
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
      const p=this.pose(item.d,item.lane),d=this.dummy;d.position.set(p.x,p.y+(item.type==='barrier'?.5:1.2),p.z);d.rotation.set(0,item.type==='barrier'?p.yaw:time*2,0);d.scale.setScalar(1);d.updateMatrix();mesh.setMatrixAt(mesh.count++,d.matrix);
    }
    for(const mesh of Object.values(this.pools))mesh.instanceMatrix.needsUpdate=true;
  }
}
