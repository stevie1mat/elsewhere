// AnimationMixer skips unchanged tracks. Restore the evaluated animation pose
// before the next evaluation so procedural IK cannot leak into idle/walking.
export class PoseOverride {
  constructor(root){this.bones=[];root.traverse(o=>{if(o.isBone)this.bones.push(o);});this.saved=null;this.buffer=this.bones.map(b=>({position:b.position.clone(),quaternion:b.quaternion.clone(),scale:b.scale.clone()}));}
  capture(){
    if(this.saved)return;
    this.saved=this.buffer;
    this.bones.forEach((b,i)=>{const p=this.saved[i];p.position.copy(b.position);p.quaternion.copy(b.quaternion);p.scale.copy(b.scale);});
  }
  restore(){
    if(!this.saved)return;
    this.bones.forEach((b,i)=>{const p=this.saved[i];b.position.copy(p.position);b.quaternion.copy(p.quaternion);b.scale.copy(p.scale);});
    this.saved=null;
  }
}
