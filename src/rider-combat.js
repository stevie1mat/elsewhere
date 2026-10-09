import { canOccupy } from './movement.js';

export const ATTACK_KEYS = { KeyJ: ['kick', 1], KeyL: ['kick', -1], KeyU: ['punch', 1], KeyO: ['punch', -1] };
export class RiderCombat {
  constructor() { this.reset(); }
  reset() {
    this.attack = null; this.cooldown = 0; this.hits = 0;
    // Separate encounters: northern seafront and the western neighborhood road.
    this.rivals = [ { x:48,z:-185,yaw:Math.PI,walked:0,speed:2.8 }, { x:-142,z:90,yaw:0,walked:0,speed:2.8 } ]
      .map((p,i)=>({...p,lane:p.x,stagger:0,knock:0,id:i}));
  }
  start(type, side, player) {
    if (!['kick','punch'].includes(type) || ![1,-1].includes(side) || this.cooldown>0 || player.mode==='walking' || Math.abs(player.speed)<.65) return false;
    this.attack={type,side,time:0,resolved:false}; this.cooldown=type==='kick'?.7:.5; return true;
  }
  update(dt, player, obstacles) {
    dt=Math.max(0,Math.min(dt,.05));
    this.cooldown=Math.max(0,this.cooldown-dt);
    let hit=false;
    for (const rival of this.rivals) {
      const nearby=Math.hypot(player.x-rival.x,player.z-rival.z)<16;
      // Patrol separate lanes across the expanded town, joining nearby riders.
      const heading=nearby&&Math.abs(Math.cos(player.yaw))>.65 ? (Math.cos(player.yaw)>0?0:Math.PI) : rival.yaw;
      rival.yaw=heading;
      rival.stagger=Math.max(0,rival.stagger-dt);
      const target=rival.stagger>0?.7:nearby?Math.max(0,Math.abs(player.speed)) : 2.8;
      rival.speed+=(target-rival.speed)*(1-Math.exp(-4*dt));
      let nextZ=rival.z-Math.cos(rival.yaw)*rival.speed*dt;
      if (nextZ < -246 || nextZ > 186 || !canOccupy(rival.x,nextZ,obstacles,.65)) {rival.yaw+=Math.PI;nextZ=rival.z;}
      const nextX=rival.x+(rival.knock+(rival.lane-rival.x)*.6)*dt;
      if(canOccupy(nextX,nextZ,obstacles,.65))rival.x=nextX;
      rival.walked+=Math.abs(nextZ-rival.z);rival.z=nextZ;
      rival.knock*=Math.exp(-5*dt);
    }
    const attack=this.attack;
    if (player.mode==='walking') this.attack=null;
    else if(attack) {
      attack.time+=dt;
      const duration=attack.type==='kick'?.44:.34;
      if(!attack.resolved && attack.time>=duration*.45) {
        attack.resolved=true;
        const targets=this.rivals.filter(r=>{
          const dx=r.x-player.x,dz=r.z-player.z;
          const side=(-dx*Math.cos(player.yaw)-dz*Math.sin(player.yaw))*attack.side;
          const forward=dx*Math.sin(player.yaw)-dz*Math.cos(player.yaw);
          return side>.35 && side<(attack.type==='kick'?2.1:1.65) && Math.abs(forward)<.95;
        }).sort((a,b)=>Math.hypot(a.x-player.x,a.z-player.z)-Math.hypot(b.x-player.x,b.z-player.z));
        if(targets.length) {
          const rival=targets[0];rival.stagger=.85;
          rival.knock=-Math.cos(player.yaw)*attack.side*(attack.type==='kick'?2.5:1.5);
          this.hits++;hit=true;
        }
      }
      if(attack.time>=duration)this.attack=null;
    }
    player.attack=this.attack?{type:this.attack.type,side:this.attack.side,weight:Math.sin(Math.PI*this.attack.time/(this.attack.type==='kick'?.44:.34))}:null;
    return hit;
  }
}
