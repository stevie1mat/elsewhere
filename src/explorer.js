import * as T from 'three';
import { clone } from 'three/addons/utils/SkeletonUtils.js';
import { Cyclist, limb } from './cyclist.js';
import {createParachutePack} from './flight-models.js';
import {PoseOverride} from './pose-override.js';
import {Locomotion} from './locomotion.js';
import {FootContact} from './foot-contact.js';
import runData from '../public/assets/people/run-neutral.json' with {type:'json'};
const RUN_CLIP=T.AnimationClip.parse(runData);

export const OUTFITS = { original: 0xffffff, ocean: 0x79afd1, terracotta: 0xd79976, sage: 0x9ab889, midnight: 0x66748b };
export const DEFAULT_LOOK = { outfit: 'original', helmet: true, backpack: false, sunglasses: false };
export function normalizeLook(value) {
  return { outfit: Object.hasOwn(OUTFITS,value?.outfit)?value.outfit:'original',
    helmet: typeof value?.helmet==='boolean'?value.helmet:true, backpack:value?.backpack===true, sunglasses:value?.sunglasses===true };
}

// Accessories are authored at human scale then attached to the animated rig.
function dress(model) {
  const clothing=[];
  model.updateWorldMatrix(true,true);
  model.traverse(o=>{
    if(!o.isMesh)return;
    const materials=Array.isArray(o.material)?o.material:[o.material];
    const hasShirt=materials.some(m=>m.name==='body');
    if(hasShirt){
      // The body atlas also contains bare arms, legs, shorts and shoes. Mask the
      // shirt islands in the neutral rig, before cycling or walking bends it.
      o.geometry=o.geometry.clone();
      const uv=o.geometry.attributes.uv, mask=new Uint8Array(uv.count);
      const joints=o.geometry.attributes.skinIndex, weights=o.geometry.attributes.skinWeight;
      for(let i=0;i<uv.count;i++){
        const u=uv.getX(i), imageY=1-uv.getY(i);
        let armWeight=0;
        for(let j=0;j<4;j++){
          const bone=o.skeleton?.bones[joints?.getComponent(i,j)];
          if(bone&&/UpperArm|Forearm|Clavicle/.test(bone.name))armWeight+=weights.getComponent(i,j);
        }
        const torso=u>.325&&u<.675&&imageY<.86;
        const sleeve=(u<.31||u>.69)&&imageY>.433&&imageY<.615&&armWeight>.5;
        mask[i]=torso||sleeve?1:0;
      }
      const colors=new T.Float32BufferAttribute(new Float32Array(uv.count*3).fill(1),3);
      o.geometry.setAttribute('color',colors);
      clothing.push({colors,mask});
    }
    const prepare=m=>{const own=m.clone();if(m.name==='body'){own.color.set(0xffffff);own.vertexColors=true;}return own;};
    o.material=Array.isArray(o.material)?o.material.map(prepare):prepare(o.material);
  });
  const gear={};
  const shell=new T.MeshStandardMaterial({color:0xe8e3d2,roughness:.42});
  const dark=new T.MeshStandardMaterial({color:0x253638,roughness:.8});
  const canvas=new T.MeshStandardMaterial({color:0x957a50,roughness:.95});
  function add(parent, geometry, material, x,y,z, scale) {
    const mesh=new T.Mesh(geometry,material);mesh.position.set(x,y,z);
    if(scale)mesh.scale.set(...scale);mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);return mesh;
  }
  function anchor(name,boneName,offset,build) {
    model.updateWorldMatrix(true,true);
    const bone=model.getObjectByName(boneName), group=new T.Group();group.name=name;
    const position=bone.getWorldPosition(new T.Vector3()).add(new T.Vector3(...offset));
    group.position.copy(position);build(group);group.updateMatrixWorld(true);bone.attach(group);gear[name]=group;
  }
  anchor('helmet','Bip01_Head',[0,.145,0],g=>{
    add(g,new T.SphereGeometry(1,24,16,0,Math.PI*2,0,Math.PI*.58),shell,0,0,0,[.118,.105,.15]);
    for(const x of [-.06,0,.06])add(g,new T.BoxGeometry(.014,.006,.14),dark,x,.098,.01);
  });
  anchor('backpack','Bip01_Spine1',[0,.1,-.16],g=>{
    add(g,new T.CapsuleGeometry(.13,.16,6,12),canvas,0,0,0,[1,.95,.55]);
    add(g,new T.BoxGeometry(.17,.11,.035),dark,0,-.055,-.075);
    for(const x of [-.095,.095])add(g,new T.TorusGeometry(.15,.012,6,24),dark,x,.015,.105,[.24,1,1]);
  });
  anchor('sunglasses','Bip01_Head',[0,.06,.094],g=>{
    const lens=new T.MeshStandardMaterial({color:0x182a2b,metalness:.45,roughness:.15});
    for(const x of [-.047,.047])add(g,new T.BoxGeometry(.075,.042,.017),lens,x,0,0);
    add(g,new T.BoxGeometry(.027,.008,.018),dark,0,.008,0);
    for(const x of [-.09,.09])add(g,new T.BoxGeometry(.008,.008,.105),dark,x,.01,-.045);
  });
  return look=>{
    const tint=new T.Color(OUTFITS[look.outfit]);
    clothing.forEach(({colors,mask})=>{
      for(let i=0;i<mask.length;i++)colors.setXYZ(i,mask[i]?tint.r:1,mask[i]?tint.g:1,mask[i]?tint.b:1);
      colors.needsUpdate=true;
    });
    for(const key of ['helmet','backpack','sunglasses'])gear[key].visible=look[key];
  };
}

export class Explorer {
  constructor(template,walkClip) {
    this.group=new T.Group();this.group.name='Explorer and bicycle';
    // Dress the neutral rig before the cyclist bends it into a seated pose.
    const ridingTemplate=clone(template);ridingTemplate.scale.setScalar(.01);
    this.applyRidingLook=dress(ridingTemplate);
    this.cycle=new Cyclist(ridingTemplate);
    // SkeletonUtils clones meshes but shares materials, so the wardrobe controls this rider only.
    this.walker=clone(template);this.walker.scale.setScalar(.01);
    this.applyWalkingLook=dress(this.walker);
    this.footContact=new FootContact(this.walker);
    this.walker.updateWorldMatrix(true,true);
    const spine=this.walker.getObjectByName('Bip01_Spine1');
    this.parachutePack=createParachutePack();
    this.parachutePack.position.copy(spine.getWorldPosition(new T.Vector3()));
    this.parachutePack.updateMatrixWorld(true);spine.attach(this.parachutePack);this.parachutePack.visible=false;
    this.idleLegs=[];
    this.walker.traverse(b=>{if(b.isBone&&/_(Thigh|Calf|Foot|Toe\d*)$/.test(b.name))this.idleLegs.push({bone:b,rotation:b.quaternion.clone()});});
    this.strideDuration=walkClip?.duration||1;this.lastWalked=null;
    this.locomotion=new Locomotion();
    this.mixer=new T.AnimationMixer(this.walker);
    this.walkAction=walkClip?this.mixer.clipAction(walkClip).play():null;
    this.runAction=this.mixer.clipAction(RUN_CLIP).setEffectiveWeight(0).play();
    this.flightPose=new PoseOverride(this.walker);
    this.group.add(this.cycle.group,this.walker);this.walker.visible=false;
    this.applyLook(DEFAULT_LOOK);
  }
  applyLook(value) { this.look=normalizeLook(value);this.applyRidingLook(this.look);this.applyWalkingLook(this.look);for(const key of ['helmet','backpack','sunglasses'])this.cycle.rider.getObjectByName(key).visible=this.look[key]; }
  set baseColor(value) {this.cycle.baseColor=value;}
  setQuestStage(stage,carry=true) {this.cycle.setQuestStage(stage,carry);}
  parachutePose(flight,active){
    this.parachutePack.visible=active;
    this.walker.getObjectByName('backpack').visible=active?false:this.look.backpack;
    if(!active)return;
    this.flightPose.capture();
    this.walker.updateWorldMatrix(true,true);flight.updateWorldMatrix(true,true);
    for(const side of ['L','R']){
      const bone=name=>this.walker.getObjectByName(`Bip01_${side}_${name}`);
      const x=Math.sign(flight.worldToLocal(bone('UpperArm').getWorldPosition(new T.Vector3())).x)*.27;
      limb(bone('UpperArm'),bone('Forearm'),bone('Hand'),flight.localToWorld(new T.Vector3(x,1.72,-.06)),flight.localToWorld(new T.Vector3(x*2,1.4,.15)));
    }
  }
  holdBalloonWheel(balloon){
    const wheel=balloon.userData.helm;if(!wheel)return;
    this.flightPose.capture();
    this.walker.updateWorldMatrix(true,true);wheel.updateWorldMatrix(true,true);
    for(const side of ['L','R']){
      const bone=name=>this.walker.getObjectByName(`Bip01_${side}_${name}`);
      const upper=bone('UpperArm'),lower=bone('Forearm'),hand=bone('Hand');
      if(!upper||!lower||!hand)continue;
      const x=Math.sign(balloon.worldToLocal(upper.getWorldPosition(new T.Vector3())).x)*.34;
      const target=wheel.localToWorld(new T.Vector3(x,.12,.035));
      const pole=balloon.localToWorld(new T.Vector3(x*2,.9,.1));
      limb(upper,lower,hand,target,pole);
      for(let finger=1;finger<=4;finger++)for(const joint of ['', '1','2']){
        const b=bone(`Finger${finger}${joint}`);if(b)b.rotation.z=.65;
      }
    }
  }
  update(p,dt=0) {
    // Solve bicycle IK in its ground-level frame, then the challenge applies
    // elevation/slope to the completed rider and bicycle together.
    this.group.position.y=0;
    this.flightPose.restore();
    const walking=p.mode==='walking';
    const gait=this.locomotion.update(p,dt);
    if(!walking||p.bike)this.cycle.update(walking?{...p.bike,speed:0}:p,dt);
    this.cycle.rider.visible=!walking;
    this.cycle.group.visible=!walking||!!p.bike;
    this.walker.visible=!!walking;
    if(walking) {
      // Distance-driven strides avoid skating; restore overrides before evaluating tracks.
      if(this.walkAction){this.walkAction.time=gait.phase*this.strideDuration;this.walkAction.setEffectiveWeight(1-gait.runWeight);}
      this.runAction.time=gait.phase*RUN_CLIP.duration;this.runAction.setEffectiveWeight(gait.runWeight);
      this.mixer.update(0);
      this.flightPose.capture();
      const idle=1-Math.min(1,Math.abs(p.speed)/.5);
      for(const {bone,rotation} of this.idleLegs)bone.quaternion.slerp(rotation,idle);
      this.walker.position.set(p.x,p.y||0,p.z);this.walker.rotation.set(0,Math.PI-p.yaw,0,'YXZ');
      this.footContact.align(p);
      if(p.swimming){
        this.swimClock=(this.swimClock||0)+Math.min(.1,dt);
        const effort=Math.min(1,Math.abs(p.speed)/1.6),stroke=this.swimClock*(2+effort*2);
        this.walker.rotation.x=.15+effort*.55;
        for(const {bone,rotation} of this.idleLegs){bone.quaternion.copy(rotation);if(bone.name.endsWith('_Thigh'))bone.rotation.y+=Math.sin(stroke*2+(bone.name.includes('_L_')?0:Math.PI))*.14*effort;}
        this.walker.updateWorldMatrix(true,true);
        for(const side of ['L','R']){
          const bone=name=>this.walker.getObjectByName(`Bip01_${side}_${name}`),upper=bone('UpperArm');
          const sign=Math.sign(this.walker.worldToLocal(upper.getWorldPosition(new T.Vector3())).x)||1;
          const reach=(Math.sin(stroke)+1)*.5;
          limb(upper,bone('Forearm'),bone('Hand'),this.walker.localToWorld(new T.Vector3(sign*(28+reach*26),120+reach*15,25+(1-reach)*30)),this.walker.localToWorld(new T.Vector3(sign*65,125,5)));
        }
      }
    }
  }
}
