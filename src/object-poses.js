import * as T from 'three';
import {limb} from './cyclist.js';
// Procedural poses for this Rocketbox rig. These are not retargeted animation clips.
export function applyObjectPose(model,pose){
  if(!pose)return false;
  model.position.set(pose.x,pose.y,pose.z);
  model.rotation.set(pose.kind==='lie_down'?Math.PI/2:0,Math.PI-pose.yaw,0,'YXZ');
  model.updateWorldMatrix(true,true);
  if(pose.kind==='lie_down')return true;
  const hip=model.getObjectByName('Bip01_Pelvis')||model.getObjectByName('Bip01');
  const hipY=hip.getWorldPosition(new T.Vector3()).y;
  model.position.y+=pose.y+.1-hipY;model.updateWorldMatrix(true,true);
  const forward=new T.Vector3(Math.sin(pose.yaw),0,-Math.cos(pose.yaw));
  const right=new T.Vector3(Math.cos(pose.yaw),0,Math.sin(pose.yaw));
  for(const side of ['L','R']){
    const bone=name=>model.getObjectByName(`Bip01_${side}_${name}`),thigh=bone('Thigh');
    const sideSign=Math.sign(thigh.getWorldPosition(new T.Vector3()).sub(model.position).dot(right))||1;
    const foot=new T.Vector3(pose.x,(pose.groundY||0)+.09,pose.z).addScaledVector(forward,.45).addScaledVector(right,sideSign*.13);
    const knee=new T.Vector3(pose.x,pose.y,pose.z).addScaledVector(forward,.8).addScaledVector(right,sideSign*.15);
    limb(thigh,bone('Calf'),bone('Foot'),foot,knee);
    const hand=new T.Vector3(pose.x,pose.y+.25,pose.z).addScaledVector(forward,.27).addScaledVector(right,sideSign*.19);
    limb(bone('UpperArm'),bone('Forearm'),bone('Hand'),hand,knee.clone().addScaledVector(right,sideSign*.25));
  }
  model.updateWorldMatrix(true,true);return true;
}
