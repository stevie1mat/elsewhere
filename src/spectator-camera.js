import * as THREE from 'three';
// The view belongs to the observer. It never inherits the resident's heading
// or position after the initial framing (or an explicit Locate click).
export function createSpectatorCamera(camera,canvas){
  const target=new THREE.Vector3();let yaw=.7,pitch=.72,distance=26,phase=null,pose=null,drag=null;
  const controls=document.createElement('div');controls.id='spectator-controls';
  controls.innerHTML='<button type="button">◎ Locate resident</button><small>Spectator · drag to orbit · Shift-drag to pan · scroll to zoom</small>';
  document.querySelector('#app').append(controls);
  function locate(close=false){if(close){distance=8;pitch=.45;}if(pose)target.set(pose.x,(pose.y||0)+1,pose.z);}
  controls.querySelector('button').onclick=()=>locate();
  canvas.addEventListener('contextmenu',e=>e.preventDefault());
  canvas.addEventListener('pointerdown',e=>{drag={x:e.clientX,y:e.clientY,pan:e.shiftKey||e.button===2};canvas.setPointerCapture(e.pointerId);});
  canvas.addEventListener('pointermove',e=>{if(!drag)return;const dx=e.clientX-drag.x,dy=e.clientY-drag.y;drag.x=e.clientX;drag.y=e.clientY;
    if(drag.pan){const scale=distance*.0018;target.x+=(Math.cos(yaw)*dx-Math.sin(yaw)*dy)*scale;target.z-=(Math.sin(yaw)*dx+Math.cos(yaw)*dy)*scale;}
    else{yaw-=dx*.005;pitch=Math.max(.15,Math.min(1.4,pitch+dy*.004));}
  });
  canvas.addEventListener('pointerup',()=>{drag=null;});canvas.addEventListener('pointercancel',()=>{drag=null;});
  canvas.addEventListener('wheel',e=>{e.preventDefault();distance=Math.max(6,Math.min(180,distance*Math.exp(e.deltaY*.001)));},{passive:false});
  return {locate,update(next,arrivalPhase){pose=next;if(phase===null||phase!==arrivalPhase){phase=arrivalPhase;locate();}
    camera.position.set(target.x+Math.sin(yaw)*distance*Math.cos(pitch),target.y+Math.sin(pitch)*distance,target.z+Math.cos(yaw)*distance*Math.cos(pitch));camera.lookAt(target);
  }};
}
