import * as T from 'three';
import { clone } from 'three/addons/utils/SkeletonUtils.js';
import { Cyclist } from './cyclist.js';

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
    this.mixer=new T.AnimationMixer(this.walker);
    if(walkClip)this.mixer.clipAction(walkClip).play();
    this.group.add(this.cycle.group,this.walker);this.walker.visible=false;
    this.applyLook(DEFAULT_LOOK);
  }
  applyLook(value) { this.look=normalizeLook(value);this.applyRidingLook(this.look);this.applyWalkingLook(this.look);for(const key of ['helmet','backpack','sunglasses'])this.cycle.rider.getObjectByName(key).visible=this.look[key]; }
  set baseColor(value) {this.cycle.baseColor=value;}
  setQuestStage(stage,carry=true) {this.cycle.setQuestStage(stage,carry);}
  update(p,dt=0) {
    const walking=p.mode==='walking'&&p.bike;
    this.cycle.update(walking?{...p.bike,speed:0}:p,dt);this.cycle.rider.visible=!walking;
    this.walker.visible=!!walking;
    if(walking) {
      // Drive the walk cycle by distance, so feet stop when the controller stops.
      this.mixer.setTime(Math.abs(p.walked)*.72);
      this.walker.position.set(p.x,0,p.z);this.walker.rotation.y=Math.PI-p.yaw;
    }
  }
}
