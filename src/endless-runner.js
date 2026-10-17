import * as T from 'three';

export const ENDLESS_LANES = Object.freeze([-28.2, -24, -19.8]);
const START_Z = 168;
const WRAP_Z = -218;

function makePattern(start, random) {
  const items=[];
  let distance=start;
  while(items.length<24){
    distance+=10+random()*7;
    const safeLane=Math.floor(random()*3);
    const double=random()>.58;
    for(let lane=0;lane<3;lane++){
      if(lane===safeLane)continue;
      if(!double&&lane!==((safeLane+1)%3))continue;
      items.push({id:`h-${distance.toFixed(2)}-${lane}`,type:'barrier',lane,distance,hit:false});
    }
    for(let n=0;n<3;n++)items.push({id:`c-${distance.toFixed(2)}-${n}`,type:'coin',lane:safeLane,distance:distance+n*2.1,hit:false});
  }
  return items;
}

export function createEndlessRunner(random=Math.random){
  return {
    distance:0, score:0, coins:0, lives:3, lane:1, lanePosition:1,
    speed:9, jump:0, jumpVelocity:0, invulnerable:0, running:true,
    items:makePattern(18,random), random, nextSpawn:155, event:null,
  };
}

export function moveLane(state,direction){
  if(!state.running)return false;
  const next=Math.max(0,Math.min(2,state.lane+Math.sign(direction)));
  if(next===state.lane)return false;
  state.lane=next;return true;
}

export function jumpRunner(state){
  if(!state.running||state.jump>.03)return false;
  state.jumpVelocity=7.4;return true;
}

export function stepEndless(state,dt){
  dt=Math.max(0,Math.min(.05,dt));state.event=null;
  if(!state.running||dt===0)return state;
  state.speed=Math.min(22,9+state.distance/260);
  state.distance+=state.speed*dt;
  state.score=Math.floor(state.distance*5+state.coins*75);
  state.lanePosition+=(state.lane-state.lanePosition)*(1-Math.exp(-13*dt));
  state.invulnerable=Math.max(0,state.invulnerable-dt);
  state.jumpVelocity-=19*dt;state.jump=Math.max(0,state.jump+state.jumpVelocity*dt);
  if(state.jump===0&&state.jumpVelocity<0)state.jumpVelocity=0;

  for(const item of state.items){
    const gap=item.distance-state.distance;
    if(item.hit||gap>1.25||gap<-.9||Math.abs(item.lane-state.lanePosition)>.34)continue;
    item.hit=true;
    if(item.type==='coin'){
      state.coins++;state.score+=75;state.event={type:'coin',message:'+1 coin'};
    }else if(state.jump<.72&&state.invulnerable===0){
      state.lives--;state.invulnerable=1.8;state.speed=Math.max(7,state.speed-3);
      state.event={type:'crash',message:state.lives?`${state.lives} lives left`:'Run over'};
      if(state.lives===0)state.running=false;
    }
  }
  state.items=state.items.filter(item=>item.distance>state.distance-8);
  if(state.distance+150>state.nextSpawn){
    const more=makePattern(state.nextSpawn,state.random);
    state.items.push(...more);state.nextSpawn=more.reduce((m,item)=>Math.max(m,item.distance),state.nextSpawn)+18;
  }
  return state;
}

export function endlessPlayerPose(state){
  const lap=Math.floor(state.distance/(START_Z-WRAP_Z));
  const z=START_Z-(state.distance-lap*(START_Z-WRAP_Z));
  const a=Math.max(0,Math.min(2,state.lanePosition)),left=Math.floor(a),right=Math.ceil(a),mix=a-left;
  return {x:ENDLESS_LANES[left]*(1-mix)+ENDLESS_LANES[right]*mix,z,y:state.jump,yaw:Math.PI,speed:state.speed};
}

export class EndlessDisplay{
  constructor(scene,state){
    this.scene=scene;this.state=state;this.models=new Map();
    this.coinGeometry=new T.TorusGeometry(.27,.09,8,16);
    this.coinMaterial=new T.MeshStandardMaterial({color:0xffd25a,emissive:0xffa51f,emissiveIntensity:.8,metalness:.65,roughness:.24});
    this.barrierMaterial=new T.MeshStandardMaterial({color:0xf06d4f,emissive:0x651407,emissiveIntensity:.25,roughness:.6});
  }
  add(item){
    let object;
    if(item.type==='coin')object=new T.Mesh(this.coinGeometry,this.coinMaterial);
    else{
      object=new T.Group();
      const beam=new T.Mesh(new T.BoxGeometry(3.15,.72,.35),this.barrierMaterial);beam.position.y=.58;object.add(beam);
      const white=new T.MeshStandardMaterial({color:0xfff2d8,roughness:.8});
      for(const x of [-1.15,1.15]){const leg=new T.Mesh(new T.BoxGeometry(.22,1.18,.28),white);leg.position.set(x,.36,0);object.add(leg);}
    }
    this.scene.add(object);this.models.set(item.id,object);return object;
  }
  update(player,time){
    const active=new Set();
    for(const item of this.state.items){
      if(item.hit)continue;active.add(item.id);const object=this.models.get(item.id)||this.add(item);
      object.visible=true;object.position.set(ENDLESS_LANES[item.lane],0,player.z-(item.distance-this.state.distance));
      if(item.type==='coin'){object.position.y=.9+Math.sin(time*4+item.distance)*.12;object.rotation.y=time*2.6;}
    }
    for(const [id,object] of this.models)if(!active.has(id)){this.scene.remove(object);this.models.delete(id);}
  }
}
