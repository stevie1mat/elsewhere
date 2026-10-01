import * as T from 'three';
import { clone } from 'three/addons/utils/SkeletonUtils.js';
import { QUEST_STOPS } from './quest.js';

export class QuestWorld {
  constructor(scene) {
    this.scene=scene;this.characters=[];
    const gold=new T.MeshStandardMaterial({color:0xf2d580,emissive:0xb88b32,emissiveIntensity:.6});
    this.marker=new T.Group();scene.add(this.marker);
    const halo=new T.Mesh(new T.TorusGeometry(.8,.025,8,40),gold);halo.rotation.x=-Math.PI/2;halo.position.y=.07;this.marker.add(halo);
    this.diamond=new T.Mesh(new T.OctahedronGeometry(.19),gold);this.diamond.position.y=2.25;this.marker.add(this.diamond);
    const stone=new T.Mesh(new T.BoxGeometry(.7,.5,.6),new T.MeshStandardMaterial({color:0xc9c2a8}));stone.position.set(-58.5,.25,76);scene.add(stone);
    const tile=new T.Mesh(new T.BoxGeometry(.5,.035,.4),new T.MeshStandardMaterial({color:0x438eaf,metalness:.15,roughness:.3}));tile.position.set(-58.5,.52,76);scene.add(tile);
    const card=new T.Mesh(new T.BoxGeometry(.24,.012,.16),new T.MeshStandardMaterial({color:0xffedc1}));card.position.set(-58.5,.545,76);card.rotation.y=.2;scene.add(card);
  }
  addCharacter(template,clip,variant) {
    const model=clone(template);model.scale.setScalar(.01);
    if(clip){
      const tracks=clip.tracks.map(track=>{
        if(track.name.endsWith('.quaternion')){
          const sample=track.createInterpolant();const a=new T.Quaternion().fromArray(sample.evaluate(0));const b=new T.Quaternion().fromArray(sample.evaluate(clip.duration/2));
          return new T.QuaternionKeyframeTrack(track.name,[0],a.slerp(b,.5).toArray());
        }
        return new T.VectorKeyframeTrack(track.name,[0],Array.from(track.createInterpolant().evaluate(0)));
      });
      const mixer=new T.AnimationMixer(model);mixer.clipAction(new T.AnimationClip('Waiting',1,tracks)).play();mixer.update(0);
    }
    const cafe=variant==='f001';model.name=cafe?'Inês':'Tomás';
    model.position.set(cafe?34:103,0,cafe?12:-36.5);model.rotation.y=cafe?Math.PI/2:0;
    this.scene.add(model);this.characters.push(model);
  }
  update(time,stage) {
    const stop=QUEST_STOPS[stage];this.marker.visible=!!stop;
    if(stop)this.marker.position.set(stop.x,0,stop.z);
    this.diamond.position.y=2.3+Math.sin(time*2)*.12;this.diamond.rotation.y=time*.6;
  }
}
