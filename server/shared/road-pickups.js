import {canOccupy,groundElevation} from './movement.js';
import {PORTO_ROADS} from './roads.js';
export function pickupLocations(obstacles=[],random=Math.random,count=64){
  const items=[];
  // Broad road corridors and the promenade, rather than fixed center-line rows.
  const routes=[...PORTO_ROADS,{x:49,z:-30,w:20,d:450}];
  const types=['coin','coin','nitro','coin','shield','nitro','coin','mystery'];
  for(let attempt=0;attempt<count*100&&items.length<count;attempt++){
    const route=random()<.28?routes.at(-1):routes[Math.min(routes.length-1,Math.floor(random()*routes.length))];
    const x=Math.round(route.x+(random()-.5)*(route.w-4));
    const z=Math.round(route.z+(random()-.5)*(route.d-4));
    if(!canOccupy(x,z,obstacles,1.5)||items.some(p=>Math.hypot(p.x-x,p.z-z)<8))continue;
    items.push({x,z,type:types[items.length%types.length]});
  }
  // Randomize rewards as well as positions while keeping a balanced supply.
  for(let i=items.length-1;i>0;i--){
    const j=Math.min(i,Math.floor(random()*(i+1)));
    [items[i].type,items[j].type]=[items[j].type,items[i].type];
  }
  return items;
}
export class RoadPickups {
  constructor(obstacles=[],random=Math.random){
    this.random=random;this.obstacles=obstacles;
    this.items=[];
    this.reset();
  }
  reset(){
    this.nitro=0;this.coins=0;this.shield=false;this.boosting=false;this.flash=0;this.time=0;
    this.collected={coin:0,nitro:0,shield:0,mystery:0};
    const positions=pickupLocations(this.obstacles,this.random,this.items.length||64);
    if(!this.items.length)this.items=positions.map(p=>({...p,cooldown:0}));
    else this.items.forEach((p,i)=>{
      // Keep types/model indices stable; a constrained map may exhaust candidates.
      if(positions.length===this.items.length){p.x=positions[i].x;p.z=positions[i].z;}
      p.cooldown=0;
    });
  }
  boost(dt,p,held,brake){
    this.boosting=dt>0&&held&&!brake&&p.mode!=='walking'&&p.speed>.5&&this.nitro>0;
    if(this.boosting)this.nitro=Math.max(0,this.nitro-dt*25);
    return this.boosting;
  }
  buyNitro(){if(this.coins<10||this.nitro>=100)return false;this.coins-=10;this.nitro=Math.min(100,this.nitro+50);return true;}
  absorbHit(){if(!this.shield)return false;this.shield=false;this.flash=.5;return true;}
  update(dt,p){
    const messages=[];this.time+=dt;this.flash=Math.max(0,this.flash-dt);
    for(const item of this.items){
      item.cooldown=Math.max(0,item.cooldown-dt);
      if(dt<=0||item.cooldown>0||(p.y||0)-groundElevation(item.x,item.z)>1.6||Math.hypot(item.x-p.x,item.z-p.z)>1.15)continue;
      this.collected[item.type]++;
      const type=item.type==='mystery'?['nitro','coin','shield'][Math.min(2,Math.floor(this.random()*3))]:item.type;
      if(type==='nitro'){this.nitro=Math.min(100,this.nitro+50);messages.push('Nitro +50% · Hold B while pedaling');}
      if(type==='coin'){this.coins+=item.type==='mystery'?10:1;messages.push(item.type==='mystery'?'Mystery reward · 10 coins':'+1 coin');}
      if(type==='shield'){this.shield=true;messages.push('Shield ready · Blocks one rival hit');}
      item.cooldown=item.type==='coin'?25:40;this.flash=.4;
    }
    return messages;
  }
}

