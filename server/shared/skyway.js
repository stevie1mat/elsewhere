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
