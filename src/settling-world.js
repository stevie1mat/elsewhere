import * as T from 'three';
import {clone} from 'three/addons/utils/SkeletonUtils.js';
import {FootContact} from './foot-contact.js';
export class SettlingWorld{
 constructor(scene){this.scene=scene;this.people=[];this.decor=new T.Group();scene.add(this.decor);this.decor.visible=false;
  const wood=new T.MeshStandardMaterial({color:0x825536}),blue=new T.MeshStandardMaterial({color:0x477c9b}),paper=new T.MeshStandardMaterial({color:0xeacdb0}),green=new T.MeshStandardMaterial({color:0x618753});
  const add=(g,m,x,y,z,parent=this.decor)=>{const mesh=new T.Mesh(g,m);mesh.position.set(x,y,z);mesh.castShadow=true;parent.add(mesh);return mesh;};
  add(new T.BoxGeometry(.27,.34,.04),wood,17.25,.82,-86.7);add(new T.BoxGeometry(.21,.27,.012),paper,17.25,.82,-86.67);
  add(new T.BoxGeometry(.35,.035,.25),blue,15.55,.82,-79);
  this.plant=new T.Group();this.decor.add(this.plant);add(new T.CylinderGeometry(.13,.09,.2,12),wood,17.7,.96,-87.85,this.plant);for(const [x,y] of [[17.7,1.2],[17.58,1.12],[17.82,1.17]])add(new T.SphereGeometry(.13,8,6),green,x,y,-87.85,this.plant);
  this.mug=new T.Group();this.decor.add(this.mug);add(new T.CylinderGeometry(.075,.065,.15,16),blue,15.9,.88,-79,this.mug);add(new T.TorusGeometry(.055,.015,6,12),blue,16,.88,-79,this.mug);
 }
 addCharacter(template,clip,variant){
  const roles=variant==='m002'?[['Rui',30,-17]]:[['Sofia',-83,26],['Beatriz',28,78],['Mara',-55,64]];
  for(const [name,x,z] of roles){const model=clone(template);model.scale.setScalar(.01);model.name=name;
   const legs=[];model.traverse(b=>{if(b.isBone&&/_(Thigh|Calf|Foot|Toe\d*)$/.test(b.name))legs.push({b,q:b.quaternion.clone()});});
   if(clip){const mixer=new T.AnimationMixer(model);mixer.clipAction(clip).play();mixer.update(0);}
   for(const {b,q} of legs)b.quaternion.copy(q);model.position.set(x,0,z);model.rotation.y=name==='Rui'?Math.PI/2:0;
   new FootContact(model).align({x,z,y:0,grounded:true});this.scene.add(model);this.people.push({model,x,z});model.visible=false;
  }
 }
 update(state,active){
  this.decor.visible=state.decorated;this.plant.visible=state.items.includes('Small plant');this.mug.visible=state.items.includes('Blue mug');
  this.people.forEach(({model,x,z},i)=>{model.visible=active;if(state.stage===9){model.position.x=36+(i%2)*1.5;model.position.z=15+Math.floor(i/2)*2;model.rotation.y=Math.PI;}else{model.position.x=x;model.position.z=z;}});
 }
}
