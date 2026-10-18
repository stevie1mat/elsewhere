import * as T from 'three';
import {canOccupy,groundElevation} from './movement.js';

// A constrained rolling body: spring/damper towing, collision, and floor support.
export class SuitcasePhysics {
  constructor(){this.position=new T.Vector3();this.velocity=new T.Vector3();this.rotation=new T.Quaternion();this.initialized=false;this.roll=0;this.connected=true;this.verticalSpeed=0;this.lastPlayer=null;}
  update(player,grip,delta,obstacles=[]){
    const right=new T.Vector3(Math.cos(player.yaw),0,Math.sin(player.yaw));
    const back=new T.Vector3(-Math.sin(player.yaw),0,Math.cos(player.yaw));
    let target=new T.Vector3(player.x,0,player.z).addScaledVector(right,.42).addScaledVector(back,Math.min(.42,Math.abs(player.speed||0)*.12));
    const teleported=this.lastPlayer&&Math.hypot(player.x-this.lastPlayer.x,player.z-this.lastPlayer.z)>4;
    if(!this.initialized||teleported){this.position.copy(target);this.position.y=groundElevation(target.x,target.z)+.1;this.velocity.set(0,0,0);this.verticalSpeed=0;this.initialized=true;this.connected=true;}
    this.lastPlayer={x:player.x,z:player.z};
    const handDistance=Math.hypot(grip.x-this.position.x,grip.z-this.position.z);
    if(!this.connected&&handDistance<.45)this.connected=true;
    if(!this.connected)target=this.position.clone();
    const total=Math.min(.1,Math.max(0,delta)),steps=Math.max(1,Math.ceil(total*120)),dt=total/steps;
    for(let i=0;i<steps;i++){
      this.velocity.x+=((target.x-this.position.x)*65-this.velocity.x*15)*dt;
      this.velocity.z+=((target.z-this.position.z)*65-this.velocity.z*15)*dt;
      const old=this.position.clone();
      for(const axis of ['x','z']){
        const next=this.position.clone();next[axis]+=this.velocity[axis]*dt;
        if(canOccupy(next.x,next.z,obstacles,.28)){this.position[axis]=next[axis];}else this.velocity[axis]=0;
      }
      // The handle cannot trail arbitrarily far behind its fixed hand grip.
      const offset=new T.Vector3(this.position.x-grip.x,0,this.position.z-grip.z);
      if(this.connected&&offset.length()>.48){offset.setLength(.48);const x=grip.x+offset.x,z=grip.z+offset.z;if(canOccupy(x,z,obstacles,.28)){this.position.x=x;this.position.z=z;}}
      this.roll+=old.distanceTo(this.position)/.055;
    }
    this.verticalSpeed-=9.81*total;
    this.position.y+=this.verticalSpeed*total;
    if(Math.hypot(grip.x-this.position.x,grip.z-this.position.z)>.7)this.connected=false;
    const anchor=this.connected?grip:new T.Vector3(this.position.x,groundElevation(this.position.x,this.position.z)+.9,this.position.z);
    const tetherFloor=this.connected?anchor.y-Math.sqrt(Math.max(.1,1.05**2-(anchor.x-this.position.x)**2-(anchor.z-this.position.z)**2)):-Infinity;
    const airborneFloor=Math.max(groundElevation(this.position.x,this.position.z)+.1,tetherFloor);
    if(this.position.y<airborneFloor){this.position.y=airborneFloor;this.verticalSpeed=0;}
    const suspendedY=this.position.y;
    const direction=anchor.clone().sub(this.position).normalize();
    // Keep the axle across the direction of travel while the case tilts toward the hand.
    const yaw=new T.Quaternion().setFromAxisAngle(new T.Vector3(0,1,0),-player.yaw);
    const tilt=new T.Quaternion().setFromUnitVectors(new T.Vector3(0,1,0),direction.clone().applyQuaternion(yaw.clone().invert()));
    this.rotation.copy(yaw).multiply(tilt);
    for(let iteration=0;iteration<6;iteration++){
    let floor=-Infinity;
    // Support the wheels and all bottom case corners on hills; never bury the case.
    for(const x of [-.23,.23])for(const z of [-.135,.135]){
      const p=new T.Vector3(x,.005,z).applyQuaternion(this.rotation);
      floor=Math.max(floor,groundElevation(this.position.x+p.x,this.position.z+p.z)+.045-p.y);
    }
    for(const x of [-.17,.17]){
      const p=new T.Vector3(x,0,0).applyQuaternion(this.rotation);
      floor=Math.max(floor,groundElevation(this.position.x+p.x,this.position.z+p.z)+.1-p.y);
    }
    this.position.y=Math.max(floor,suspendedY);
    this.handleLength=anchor.distanceTo(this.position);
    // Re-solve after floor projection so the hand and crossbar remain connected.
    const up=anchor.clone().sub(this.position).normalize().applyQuaternion(yaw.clone().invert());
    this.rotation.copy(yaw).multiply(new T.Quaternion().setFromUnitVectors(new T.Vector3(0,1,0),up));
    }
    return this;
  }
}
