// Keep animation state independent of tiny speed changes and position corrections.
export class Locomotion {
  constructor(){this.phase=0;this.runWeight=0;this.running=false;this.lastDistance=null;}
  update(p,delta){
    const dt=Math.min(.05,Math.max(0,delta));
    const distance=this.lastDistance===null?0:p.walked-this.lastDistance;
    this.lastDistance=p.walked;
    if(p.mode!=='walking'||(p.arrival&&p.arrival.phase!=='landed')){
      this.running=false;this.runWeight=0;return this;
    }
    // Hysteresis prevents walk/run flicker at the crossover. Preserve the gait
    // in the air instead of blending into a walk halfway through a running jump.
    if(p.grounded!==false){
      if(p.speed>3)this.running=true;
      else if(p.speed<2.3)this.running=false;
    }
    this.runWeight+=(Number(this.running)-this.runWeight)*(1-Math.exp(-9*dt));
    if(this.runWeight<.0001)this.runWeight=0;
    if(this.runWeight>.9999)this.runWeight=1;
    // Spawn/remount/network corrections are not strides. Ignore discontinuities.
    if(dt>0&&Math.abs(distance)<=Math.max(.35,8*dt)&&p.grounded!==false)
      this.phase=(this.phase+distance/(1.5+1.75*this.runWeight)+1)%1;
    return this;
  }
}
