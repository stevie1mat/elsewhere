import * as T from 'three';
import {limb} from './cyclist.js';
export function createPhone(model){
 const hand=model.getObjectByName('Bip01_R_Hand'),phone=new T.Group();phone.name='Resident phone';
 const body=new T.Mesh(new T.BoxGeometry(.075,.145,.009),new T.MeshStandardMaterial({color:0x172527,roughness:.5}));
 const screen=new T.Mesh(new T.BoxGeometry(.065,.124,.001),new T.MeshStandardMaterial({color:0x9bdfcf,emissive:0x468678,emissiveIntensity:.5}));screen.position.z=.0055;phone.add(body,screen);model.updateWorldMatrix(true,true);
 phone.position.copy(hand.getWorldPosition(new T.Vector3()));phone.updateMatrixWorld(true);hand.attach(phone);phone.visible=false;return phone;
}
export function applyPhonePose(model,phone,active){
 phone.visible=active;if(!active)return;model.updateWorldMatrix(true,true);
 for(const side of ['R','L']){const b=n=>model.getObjectByName(`Bip01_${side}_${n}`),x=side==='R'?-13:10;
 limb(b('UpperArm'),b('Forearm'),b('Hand'),model.localToWorld(new T.Vector3(x,125,36)),model.localToWorld(new T.Vector3(x*3,100,20)));}
 model.updateWorldMatrix(true,true);
}
