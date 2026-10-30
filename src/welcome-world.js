import * as T from 'three';
import {clone} from 'three/addons/utils/SkeletonUtils.js';
import {FootContact} from './foot-contact.js';
import {limb} from './cyclist.js';
import {SuitcasePhysics} from './suitcase-physics.js';
import {groundElevation} from './movement.js';
import {pitchedRoof} from './building-details.js';
export function buildFirstHome(w){
  w.interactionObjects?.push({id:'casa-bed',name:'Casa Aurora bed',type:'bed',x:16,y:.67,z:-85.1,yaw:0,approach:{x:19,z:-85},affordances:['lie_down']});
  const collider=(a,h,b,x,y,z)=>{const proxy=new T.Mesh(new T.BoxGeometry(a,h,b));proxy.position.set(x,y,z);proxy.updateMatrixWorld();w.cameraColliders.push(proxy);};
  const wall=(a,h,b,x,y,z,m=w.m.cream)=>{w.box(a,h,b,x,y,z,m);w.obstacle(x,z,a,b);collider(a,h,b,x,y,z);};
  const plaster=new T.MeshStandardMaterial({color:0xeadfcb,roughness:.95});
  const floor=new T.MeshStandardMaterial({color:0xa88057,roughness:.85});
  const linen=new T.MeshStandardMaterial({color:0xf2e9d5,roughness:1});
  const glass=new T.MeshStandardMaterial({color:0x9cc4ce,roughness:.3,transparent:true,opacity:.32,depthWrite:false});
  // A compact enclosed guesthouse, with a normal doorway on its east facade.
  w.box(9.5,.06,10,18.75,-.01,-83,floor);
  for(let x=14.2;x<23.4;x+=.38)w.box(.012,.006,9.8,x,.023,-83,w.m.wood);
  wall(.28,3.2,10,14,1.6,-83,plaster);
  for(const z of [-88,-78]){
    wall(9.5,.85,.28,18.75,.425,z,plaster);
    w.box(9.5,.65,.28,18.75,2.875,z,plaster);collider(9.5,.65,.28,18.75,2.875,z);
    for(const [x,width] of [[15.1,2.2],[21.35,4.3]])wall(width,1.7,.28,x,1.7,z,plaster);
    w.box(3,1.65,.04,17.7,1.7,z,glass);
    for(const x of [16.2,17.7,19.2])w.box(.075,1.8,.36,x,1.7,z,w.m.trim);
    for(const y of [.83,1.7,2.57])w.box(3.2,.075,.36,17.7,y,z,w.m.trim);
    w.box(3.4,.12,.65,17.7,.78,z,w.m.trim);
    for(const x of [16,19.4])w.box(.32,1.85,.12,x,1.65,z+(z===-88?.22:-.22),linen);
  }
  for(const z of [-86.15,-79.85])wall(.3,3.2,3.7,23.5,1.6,z,w.m.peach);
  w.box(.3,.65,2.6,23.5,2.875,-83,w.m.peach);collider(.3,.65,2.6,23.5,2.875,-83);
  for(const z of [-84.3,-81.7])w.box(.42,2.6,.12,23.5,1.3,z,w.m.trim);
  w.box(.42,.13,2.8,23.5,2.6,-83,w.m.trim);
  // Open timber door swings against the inside wall, leaving a clear entrance.
  wall(1.9,2.45,.1,22.5,1.225,-84.24,w.m.wood);
  w.box(.08,.08,.12,21.7,1.1,-84.14,w.m.chrome);
  // Continuous ceiling and tiled roof cover the entire room, including the entrance.
  w.box(9.9,.18,10.4,18.75,3.25,-83,plaster);collider(9.9,.18,10.4,18.75,3.25,-83);
  w.mesh(pitchedRoof(10.1,10.6,1.8),w.m.tile,18.75,3.35,-83);
  w.box(.6,1.5,.65,15.4,4.25,-86.8,w.m.cream);
  w.box(.8,.12,.85,15.4,5.02,-86.8,w.m.trim);
  w.sign('CASA AURORA',23.74,2.95,-83,2.5,.34,Math.PI/2);
  w.box(1.1,.035,1.9,24.15,.018,-83,w.m.wood);
  for(const z of [-86.2,-79.8]){
    w.box(.1,1.45,1.3,23.68,1.7,z,w.m.glass);
    for(const dz of [-.82,.82])w.box(.14,1.5,.25,23.76,1.7,z+dz,w.m.sage);
    w.box(.4,.12,1.9,23.8,.9,z,w.m.trim);
  }
  // Human-scale furniture and warm finishes, with room to walk beside the bed.
  wall(1.55,.38,2.25,16,.19,-86,w.m.wood);
  w.box(1.5,.2,2.2,16,.48,-86,linen);w.box(1.5,.055,1.5,16,.61,-85.7,w.m.sage);
  w.box(1.2,.16,.42,16,.66,-86.8,linen);wall(1.6,1,.12,16,.5,-87.2,w.m.wood);
  wall(.5,.6,.55,17.25,.3,-86.7,w.m.wood);
  w.box(.25,.03,.22,17.25,.62,-86.7,w.m.trim);
  wall(1.5,.78,.65,15.5,.39,-79,w.m.wood);
  w.box(.45,.025,.32,15.4,.8,-79,linen);
  wall(.5,.45,.5,15.6,.225,-79.9,w.m.wood);w.box(.5,.6,.08,15.6,.7,-80.1,w.m.wood);
  wall(.7,2,1.5,14.5,1,-82.7,w.m.wood);
  w.box(3,.012,2.1,19,.03,-82.5,w.m.sage);
  w.box(1,.05,.65,17,.025,-81,w.m.wood);
  w.box(.7,.5,.04,20.8,1.7,-87.82,w.m.wood);w.box(.56,.36,.025,20.8,1.7,-87.79,w.m.blue);
  w.box(.8,.08,.5,18.8,3.1,-83,linen);
  const light=new T.PointLight(0xffdfad,14,12,2);light.position.set(19,2.65,-83);w.scene.add(light);
}

function suitcase(){
  const g=new T.Group(),leather=new T.MeshStandardMaterial({color:0xb77a43,roughness:.7}),dark=new T.MeshStandardMaterial({color:0x293637});
  const part=(geo,mat,x,y,z)=>{const m=new T.Mesh(geo,mat);m.position.set(x,y,z);m.castShadow=true;g.add(m);return m;};
  part(new T.BoxGeometry(.46,.62,.25),leather,0,.37,0);
  g.userData.rails=[];g.userData.wheels=[];
  for(const x of [-.17,.17]){
    part(new T.BoxGeometry(.035,.65,.27),dark,x,.37,0);
    const wheel=part(new T.CylinderGeometry(.055,.055,.045,12),dark,x,.055,0);wheel.rotation.z=Math.PI/2;g.userData.wheels.push(wheel);
    g.userData.rails.push(part(new T.BoxGeometry(.025,1,.025),dark,x*.6,.86,0));
  }
  g.userData.grip=part(new T.BoxGeometry(.23,.035,.04),dark,0,1.06,0);
  for(const child of g.children)child.position.y-=.055;
  return g;
}
export class WelcomeWorld{
  constructor(scene){
    this.scene=scene;this.physics=new SuitcasePhysics();this.bag=suitcase();scene.add(this.bag);this.bag.visible=false;
    const mat=new T.MeshStandardMaterial({color:0xffd795,emissive:0xae7424,emissiveIntensity:.35});
    this.marker=new T.Mesh(new T.OctahedronGeometry(.1),mat);scene.add(this.marker);this.marker.visible=false;
  }
  setHandle(length){
    const height=Math.max(.7,length);
    this.bag.userData.grip.position.y=height;
    for(const rail of this.bag.userData.rails){rail.scale.y=height-.6;rail.position.y=(height+.6)/2;}
  }
  addCharacter(template,clip,variant){
    if(variant!=='f001')return;
    this.guide=clone(template);this.guide.scale.setScalar(.01);this.guide.name='Mara · Welcome guide';this.guide.visible=false;
    this.idleLegs=[];this.guide.traverse(b=>{if(b.isBone&&/_(Thigh|Calf|Foot|Toe\d*)$/.test(b.name))this.idleLegs.push({bone:b,rotation:b.quaternion.clone()});});
    this.mixer=new T.AnimationMixer(this.guide);if(clip){this.clip=clip;this.mixer.clipAction(clip).play();this.mixer.update(0);}
    this.feet=new FootContact(this.guide);this.scene.add(this.guide);
  }
  update(s,p,active,dt=0,explorer=null,obstacles=[]){
    this.bag.visible=active||s.phase==='settled';
    if(s.phase==='settled'){
      this.bag.position.set(17,.095,-81);this.bag.rotation.set(0,.3,0);this.setHandle(.78);
    }else if(active&&explorer?.walker&&p.mode==='walking'&&!p.swimming){
      const model=explorer.walker;
      model.updateWorldMatrix(true,true);
      const upper=model.getObjectByName('Bip01_R_UpperArm'),lower=model.getObjectByName('Bip01_R_Forearm'),hand=model.getObjectByName('Bip01_R_Hand');
      if(upper&&lower&&hand){
        // The grip is measured from the actual shoulder, not a detached world offset.
        const right=new T.Vector3(Math.cos(p.yaw),0,Math.sin(p.yaw));
        const back=new T.Vector3(-Math.sin(p.yaw),0,Math.cos(p.yaw));
        const shoulder=upper.getWorldPosition(new T.Vector3());
        const reach=shoulder.distanceTo(lower.getWorldPosition(new T.Vector3()))+lower.getWorldPosition(new T.Vector3()).distanceTo(hand.getWorldPosition(new T.Vector3()));
        const grip=shoulder.clone().addScaledVector(right,.12).addScaledVector(back,.1);grip.y-=reach*.83;
        this.physics.update(p,grip,dt,obstacles);
        this.bag.position.copy(this.physics.position);this.bag.quaternion.copy(this.physics.rotation);this.setHandle(this.physics.handleLength);
        for(const wheel of this.bag.userData.wheels)wheel.rotation.x=this.physics.roll;
        if(this.physics.connected){
        explorer.flightPose.capture();
        const wrist=grip.clone();wrist.y+=.075;
        limb(upper,lower,hand,wrist,shoulder.clone().addScaledVector(right,.5).addScaledVector(back,.25));
        // Curl the fingers around the crossbar, leaving the other arm's gait untouched.
        for(let finger=1;finger<=4;finger++)for(const joint of ['', '1','2']){
          const bone=model.getObjectByName(`Bip01_R_Finger${finger}${joint}`);if(bone)bone.rotation.z=.8;
        }
        }
      }
    }else if(active){
      // Set the bag down while swimming or cycling instead of towing it without a hand.
      this.setHandle(.78);this.bag.rotation.set(0,-p.yaw,0);
      this.bag.position.y=groundElevation(this.bag.position.x,this.bag.position.z)+.1;
      this.physics.connected=false;
    }
    this.marker.visible=active&&!!s.guide&&s.phase!=='settled';
    if(s.guide){
      this.marker.position.set(s.guide.x,s.guide.y+2.3,s.guide.z);
      if(this.guide){
        this.guide.visible=active&&s.phase!=='settled';this.guide.position.set(s.guide.x,s.guide.y,s.guide.z);this.guide.rotation.y=Math.PI-s.guide.yaw;
        if(this.clip)this.mixer.setTime(s.speed?(s.walked/1.5%1)*this.clip.duration:0);
        if(!s.speed)for(const {bone,rotation} of this.idleLegs)bone.quaternion.copy(rotation);
        this.feet.align({...s.guide,grounded:true});
      }
    }
  }
}
