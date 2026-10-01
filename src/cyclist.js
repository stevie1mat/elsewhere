import * as T from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { clone } from 'three/addons/utils/SkeletonUtils.js';

const v = (x, y, z) => new T.Vector3(x, y, z);
const up = v(0, 1, 0);

// Aim a bone in world space, preserving the imported rig's local axes.
function aim(bone, child, target) {
  const origin = bone.getWorldPosition(new T.Vector3());
  const from = child.getWorldPosition(new T.Vector3()).sub(origin).normalize();
  const to = target.clone().sub(origin).normalize();
  const rotation = new T.Quaternion().setFromUnitVectors(from, to)
    .multiply(bone.getWorldQuaternion(new T.Quaternion()));
  bone.quaternion.copy(bone.parent.getWorldQuaternion(new T.Quaternion()).invert().multiply(rotation));
  bone.updateWorldMatrix(false, true);
}

function limb(root, middle, tip, target, pole) {
  const a = root.getWorldPosition(new T.Vector3());
  const b = middle.getWorldPosition(new T.Vector3());
  const c = tip.getWorldPosition(new T.Vector3());
  const l1 = a.distanceTo(b), l2 = b.distanceTo(c);
  const direction = target.clone().sub(a);
  const distance = T.MathUtils.clamp(direction.length(), Math.abs(l1-l2)+.001, l1+l2-.001);
  direction.normalize();
  const bend = pole.clone().sub(a);
  bend.addScaledVector(direction, -bend.dot(direction)).normalize();
  const along = (l1*l1-l2*l2+distance*distance)/(2*distance);
  const joint = a.clone().addScaledVector(direction, along)
    .addScaledVector(bend, Math.sqrt(Math.max(0, l1*l1-along*along)));
  aim(root, middle, joint);
  aim(middle, tip, target);
}

export class Cyclist {
  constructor(template) {
    this.group = new T.Group();
    this.group.name = 'Player cyclist';
    this.distance = 0;
    this.wheels = [];
    const frame = new T.MeshStandardMaterial({color:0x278e86,metalness:.55,roughness:.3});
    const metal = new T.MeshStandardMaterial({color:0xbcc8c5,metalness:.85,roughness:.27});
    const rubber = new T.MeshStandardMaterial({color:0x20292b,roughness:.85});
    const add = (geo, mat, position, parent=this.group) => {
      const mesh = new T.Mesh(geo, mat);mesh.position.copy(position);
      mesh.castShadow = mesh.receiveShadow = true;parent.add(mesh);return mesh;
    };
    const tube = (a,b,r=.025,mat=frame,parent=this.group) => {
      const delta=b.clone().sub(a);
      const mesh=add(new T.CylinderGeometry(r,r,delta.length(),12),mat,a.clone().add(b).multiplyScalar(.5),parent);
      mesh.quaternion.setFromUnitVectors(up,delta.normalize());return mesh;
    };
    const amber = new T.MeshStandardMaterial({color:0xf2a531,roughness:.35});
    const red = new T.MeshStandardMaterial({color:0xc83232,roughness:.3});
    const light = new T.MeshStandardMaterial({color:0xfff1ce,emissive:0xffe1a0,emissiveIntensity:.6});
    const cable = (points,r=.008,mat=rubber,parent=this.group) => add(new T.TubeGeometry(new T.CatmullRomCurve3(points),24,r,6,false),mat,v(0,0,0),parent);
    const ring = (radius,width,position,mat,parent=this.group) => {
      const mesh=add(new T.TorusGeometry(radius,width,10,48),mat,position,parent);mesh.rotation.y=Math.PI/2;return mesh;
    };
    for(const z of [-.62,.62]) {
      const wheel=new T.Group();wheel.position.set(0,.35,z);this.group.add(wheel);this.wheels.push(wheel);
      ring(.318,.032,v(0,0,0),rubber,wheel);
      ring(.287,.015,v(0,0,0),metal,wheel);
      // Fine sidewall lines, crossed spokes, hub flanges and a valve stem.
      for(const side of [-1,1]) {
        ring(.312,.003,v(side*.028,0,0),metal,wheel);
        ring(.047,.008,v(side*.044,0,0),metal,wheel);
        for(let i=0;i<16;i++){
          const a=i*Math.PI/8+side*.07,b=a+side*.45;
          tube(v(side*.04,Math.sin(a)*.043,Math.cos(a)*.043),v(side*.006,Math.sin(b)*.283,Math.cos(b)*.283),.0018,metal,wheel);
        }
      }
      tube(v(-.08,0,0),v(.08,0,0),.022,metal,wheel);
      tube(v(0,.257,0),v(0,.284,0),.006,rubber,wheel);
      for(const a of [0,Math.PI]){const reflector=add(new T.BoxGeometry(.016,.065,.018),amber,v(0,Math.cos(a)*.19,0),wheel);reflector.rotation.x=a;}
      // Perforated disc brake on the left side of each wheel.
      ring(.083,.009,v(-.055,0,0),metal,wheel);
      for(let i=0;i<6;i++){const a=i*Math.PI/3;tube(v(-.055,0,0),v(-.055,Math.sin(a)*.08,Math.cos(a)*.08),.004,metal,wheel);}
      add(new T.BoxGeometry(.045,.07,.05),rubber,v(-.065,.42,z+.035));
      // Slim mudguards follow the wheel without spinning with it.
      const mudguard=add(new T.TorusGeometry(.368,.018,8,36,Math.PI*1.05),frame,v(0,.35,z));
      mudguard.rotation.set(0,Math.PI/2,-.08);
    }
    const rear=v(0,.35,-.62),front=v(0,.35,.62),crank=v(0,.36,-.05),seat=v(0,.91,-.25),head=v(0,.94,.43);
    tube(crank,seat,.03);tube(seat,head,.028);tube(crank,head,.037);
    // Paired stays and fork blades straddle the tires.
    for(const side of [-1,1]) {
      const axle=v(side*.065,.35,-.62);
      tube(axle,v(side*.045,.89,-.25),.016);tube(axle,v(side*.065,.36,-.05),.019);
      cable([v(side*.05,.94,.43),v(side*.065,.67,.46),v(side*.065,.35,.62)],.022,frame);
      tube(v(side*.065,.35,.62),v(side*.055,.7,.6),.006,metal);
    }
    tube(v(0,.85,.45),v(0,1.02,.41),.041); // head tube
    tube(seat,v(0,.96,-.27),.02,metal);
    // Shaped saddle with a wider rear, tapered nose and twin support rails.
    const saddle=add(new T.SphereGeometry(1,24,12),rubber,v(0,.968,-.31));saddle.scale.set(.145,.047,.145);
    const nose=add(new T.SphereGeometry(1,20,10),rubber,v(0,.963,-.18));nose.scale.set(.055,.034,.13);
    for(const side of [-1,1])cable([v(side*.055,.935,-.39),v(side*.04,.907,-.26),v(side*.035,.933,-.12)],.006,metal);
    // Raised swept-back bars support an upright city-bike posture.
    tube(head,v(0,1.27,.36),.022,metal);tube(v(0,1.27,.36),v(0,1.32,.27),.026,frame);
    cable([v(-.33,1.32,.18),v(-.18,1.32,.24),v(0,1.32,.27),v(.18,1.32,.24),v(.33,1.32,.18)],.018,metal);
    for(const side of [-1,1]) {
      tube(v(side*.22,1.32,.2),v(side*.34,1.32,.17),.025,rubber);
      for(let i=0;i<6;i++)tube(v(side*(.235+i*.017),1.32,.191-i*.004),v(side*(.24+i*.017),1.32,.19-i*.004),.026,metal);
      tube(v(side*.2,1.3,.23),v(side*.3,1.285,.245),.009,metal); // brake lever
      cable([v(side*.2,1.3,.24),v(side*.23,1.05,.5),v(side*.06,.82,.48),v(-.065,.43,side>0?.62:-.62)],.005,rubber);
    }
    const bell=add(new T.SphereGeometry(.032,16,8),metal,v(-.17,1.346,.245));bell.scale.y=.55;
    add(new T.BoxGeometry(.072,.06,.055),rubber,v(0,1.05,.46));
    add(new T.SphereGeometry(.027,16,10),light,v(0,1.05,.495));
    add(new T.BoxGeometry(.07,.04,.025),red,v(0,.91,-.44));
    // Chainring, cassette and a closed chain loop on the drive side.
    ring(.095,.012,v(.10,.36,-.05),metal);
    for(let i=0;i<4;i++)ring(.043+i*.007,.005,v(.07+i*.008,.35,-.62),metal);
    cable([v(.10,.45,-.05),v(.10,.405,-.62),v(.10,.35,-.68),v(.10,.29,-.62),v(.10,.265,-.05),v(.10,.36,.045),v(.10,.45,-.05)],.008,metal);
    tube(v(.1,.34,-.62),v(.13,.22,-.56),.016,rubber);ring(.025,.006,v(.13,.22,-.56),metal);
    // Bottle and cage on the down tube, plus small polished frame collars.
    tube(v(0,.51,.10),v(0,.73,.25),.035,light);tube(v(0,.73,.25),v(0,.765,.272),.022,rubber);
    for(const side of [-1,1])cable([v(side*.025,.5,.1),v(side*.047,.55,.16),v(side*.045,.67,.23)],.005,metal);
    for(const side of [-1,1])add(new T.BoxGeometry(.003,.017,.17),metal,v(side*.03,.906,.1));
    this.cranks=[];this.pedals=[];
    for(const side of [1,-1]){
      const arm=new T.Group();arm.position.copy(crank);this.group.add(arm);this.cranks.push(arm);
      tube(v(side*.12,0,0),v(side*.12,.16,0),.015,metal,arm);
      const pedal=add(new T.BoxGeometry(.13,.035,.085),rubber,v(side*.16,.52,-.05));this.pedals.push(pedal);
    }
    // Keep the extra detail inexpensive: batch rigid parts per moving assembly.
    for(const parent of [this.group,...this.wheels,...this.cranks]) {
      const batches=new Map();
      for(const mesh of [...parent.children]) {
        if(!mesh.isMesh||this.pedals.includes(mesh))continue;
        mesh.updateMatrix();const geo=mesh.geometry.clone().applyMatrix4(mesh.matrix);
        if(!batches.has(mesh.material))batches.set(mesh.material,[]);
        batches.get(mesh.material).push(geo);parent.remove(mesh);mesh.geometry.dispose();
      }
      for(const [material,geometries] of batches){add(mergeGeometries(geometries),material,v(0,0,0),parent);geometries.forEach(g=>g.dispose());}
    }
    // Reuse the Rocketbox mesh and textures already loaded for the pedestrians.
    this.rider=clone(template);this.rider.scale.setScalar(.01);this.group.add(this.rider);
    this.bones={};this.rider.traverse(o=>{if(o.name.startsWith('Bip01'))this.bones[o.name]=o;});
    this.group.updateMatrixWorld(true);
    const hips=this.bones.Bip01;
    const pelvis=hips.getWorldPosition(new T.Vector3());
    this.rider.position.add(v(0,1.01,-.28).sub(pelvis));
    this.group.updateMatrixWorld(true);
    const spine=this.bones.Bip01_Spine,neck=this.bones.Bip01_Neck;
    const spinePosition=spine.getWorldPosition(new T.Vector3());
    aim(spine,neck,spinePosition.add(v(0,.55,.14)));
    this.feet=['L','R'].map(side=>this.bones[`Bip01_${side}_Foot`].getWorldQuaternion(new T.Quaternion()));
    this.update({x:0,z:0,yaw:0,walked:0});
  }

  update(player) {
    this.distance=player.walked;
    // Solve the pose locally, then place it at the player controller's position.
    this.group.position.set(0,.015,0);this.group.rotation.set(0,0,0);this.group.updateMatrixWorld(true);
    const phase=this.distance/1.5;
    for(let i=0;i<2;i++){
      const side=i===0?1:-1,angle=phase+i*Math.PI;
      const pedal=this.pedals[i];pedal.position.set(side*.16,.36+Math.cos(angle)*.16,-.05+Math.sin(angle)*.16);
      this.cranks[i].rotation.x=angle;
      const key=i===0?'L':'R',b=this.bones;
      limb(b[`Bip01_${key}_Thigh`],b[`Bip01_${key}_Calf`],b[`Bip01_${key}_Foot`],pedal.position.clone().add(v(0,.115,-.08)),v(side*.2,.75,.9));
      const foot=b[`Bip01_${key}_Foot`];foot.quaternion.copy(foot.parent.getWorldQuaternion(new T.Quaternion()).invert().multiply(this.feet[i]));
      limb(b[`Bip01_${key}_UpperArm`],b[`Bip01_${key}_Forearm`],b[`Bip01_${key}_Hand`],v(side*.27,1.345,.18),v(side*.65,1.2,.1));
    }
    this.wheels.forEach(w=>{w.rotation.x=this.distance/.35;});
    this.group.position.set(player.x,.015,player.z);this.group.rotation.y=Math.PI-player.yaw;
  }
}
