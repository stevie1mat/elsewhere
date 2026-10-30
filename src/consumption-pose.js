import * as T from 'three';
import {limb} from './cyclist.js';
export function createConsumptionProps(model){
 const hand=model.getObjectByName('Bip01_R_Hand'),props=new T.Group();props.name='Resident meal and water';
 const material=new T.MeshStandardMaterial({color:0xdde8df,roughness:.5});
 const cup=new T.Mesh(new T.CylinderGeometry(.055,.045,.14,12),material);cup.name='Water cup';
 const bowl=new T.Mesh(new T.SphereGeometry(.12,16,8,0,Math.PI*2,0,Math.PI/2),material);bowl.rotation.x=Math.PI;bowl.name='Meal bowl';
 props.add(cup,bowl);model.updateWorldMatrix(true,true);props.position.copy(hand.getWorldPosition(new T.Vector3()));props.updateMatrixWorld(true);hand.attach(props);props.visible=false;return props;
}
export function applyConsumptionPose(model,props,kind,time){
 props.visible=kind==='eat'||kind==='drink'||kind==='carry';if(!props.visible)return;
 props.children[0].visible=kind==='drink';props.children[1].visible=kind==='eat'||kind==='carry';model.updateWorldMatrix(true,true);
 const phase=(Math.sin(time*2)+1)/2,target=new T.Vector3(-10,kind==='carry'?100:kind==='drink'?135+phase*15:115+phase*18,30);
 const bone=n=>model.getObjectByName('Bip01_R_'+n);
 limb(bone('UpperArm'),bone('Forearm'),bone('Hand'),model.localToWorld(target),model.localToWorld(new T.Vector3(-40,100,20)));model.updateWorldMatrix(true,true);
}
