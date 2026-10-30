// Smooth server snapshots before the distance-driven gait reads walked distance.
// Applying a whole 400ms jump in one frame causes Locomotion to reject it as a
// teleport, leaving the legs stationary while the body slides across the city.
export class ResidentMotion {
  constructor(player,now=0){this.from={...player};this.to={...player};this.at=now;this.duration=400;}
  receive(player,now,{snap=false}={}){
    const current=this.sample(now);
    if(snap||Math.hypot(player.x-current.x,player.z-current.z)>3){this.from={...player};this.to={...player};this.at=now;return;}
    this.from=current;this.to={...player};this.at=now;
  }
  sample(now){
    const t=Math.max(0,Math.min(1,(now-this.at)/this.duration));
    const p={...this.to};
    for(const key of ['x','y','z','walked'])p[key]=(this.from[key]||0)+((this.to[key]||0)-(this.from[key]||0))*t;
    const angle=Math.atan2(Math.sin(this.to.yaw-this.from.yaw),Math.cos(this.to.yaw-this.from.yaw));p.yaw=this.from.yaw+angle*t;
    const distance=Math.max(0,(this.to.walked||0)-(this.from.walked||0));
    p.speed=t<1?distance/(this.duration/1000):this.to.speed;p.moving=p.speed>.01;
    return p;
  }
}
