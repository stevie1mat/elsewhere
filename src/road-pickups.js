import * as T from 'three';
import {groundElevation} from './movement.js';
import {RoadPickups,pickupLocations} from '../server/shared/road-pickups.js';
export {RoadPickups,pickupLocations};
export class PickupDisplay {
  constructor(scene,state){
    this.state=state;
    const colors={coin:0xffd45b,nitro:0x55e6ef,shield:0x79a8ff,mystery:0xd08bff};
    const geometry={coin:new T.CylinderGeometry(.22,.22,.07,16).rotateX(Math.PI/2),nitro:new T.CapsuleGeometry(.14,.24,4,8),shield:new T.OctahedronGeometry(.28),mystery:new T.BoxGeometry(.36,.36,.36)};
    const materials=Object.fromEntries(Object.entries(colors).map(([key,color])=>[key,new T.MeshStandardMaterial({color,emissive:color,emissiveIntensity:.5,metalness:.35,roughness:.3})]));
    this.models=state.items.map(p=>{
      const group=new T.Group(),body=new T.Mesh(geometry[p.type],materials[p.type]);body.position.y=.68;group.add(body);
      if(p.type==='nitro'){
        const cap=new T.Mesh(new T.CylinderGeometry(.08,.08,.07,8),materials.coin);cap.position.y=.31;body.add(cap);
      }
      if(p.type==='mystery'){
        const band=new T.Mesh(new T.BoxGeometry(.38,.07,.38),materials.coin);body.add(band);
      }
      group.position.set(p.x,0,p.z);scene.add(group);return {group,body};
    });
  }
  update(){
    this.models.forEach(({group,body},i)=>{const item=this.state.items[i];group.position.set(item.x,groundElevation(item.x,item.z),item.z);group.visible=item.cooldown===0;body.rotation.y=this.state.time*1.8+i;body.position.y=.68+Math.sin(this.state.time*3+i)*.1;});
  }
}
